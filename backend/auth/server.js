require('dotenv').config();
const express = require('express');
const cors = require('cors');
const SibApiV3Sdk = require('@getbrevo/brevo');
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { verifyToken, checkRememberMe, loginLimiter } = require('./middleware/auth');
const upload = require('./middleware/upload');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_UR)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Configure Brevo API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

if (!process.env.BREVO_API_KEY || !process.env.BREVO_API_KEY.startsWith('xkeysib-')) {
    console.error('Invalid or missing Brevo API key. Please check your .env file.');
    process.exit(1);
}

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Test the API connection on startup
apiInstance.getSmtpTemplates()
    .then(() => console.log('Successfully connected to Brevo API'))
    .catch(error => {
        console.error('Failed to connect to Brevo API:', error.message);
        process.exit(1);
    });

// Store OTPs temporarily
const otpStore = new Map();

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
    console.log('Received send-otp request:', req.body);
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const otp = generateOTP();
        console.log(`Generated OTP for ${email}: ${otp}`);

        // Store OTP with 5 minutes expiry
        otpStore.set(email, {
            otp,
            expiry: Date.now() + 5 * 60 * 1000
        });

        // Prepare email using Brevo API
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        
        console.log('Configuring email with:', {
            senderName: process.env.BREVO_SENDER_NAME,
            senderEmail: process.env.BREVO_SENDER_EMAIL,
            recipientEmail: email,
            apiKey: process.env.BREVO_API_KEY ? 'Present' : 'Missing'
        });

        sendSmtpEmail.subject = 'Your OTP for Registration';
        sendSmtpEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e3c72;">Your OTP for Registration</h2>
                <p>Your One-Time Password (OTP) is:</p>
                <h1 style="color: #2a5298; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                <p>This OTP will expire in 5 minutes.</p>
                <p style="color: #666;">If you didn't request this, please ignore this email.</p>
            </div>
        `;
        sendSmtpEmail.sender = {
            name: process.env.BREVO_SENDER_NAME,
            email: process.env.BREVO_SENDER_EMAIL
        };
        sendSmtpEmail.to = [{email: email}];

        try {
            // Send email using Brevo API
            console.log('Attempting to send email via Brevo API...');
            const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('Email sent successfully:', data);
            res.json({ message: 'OTP sent successfully' });
        } catch (apiError) {
            console.error('Brevo API Error:', {
                message: apiError.message,
                response: apiError.response?.text,
                status: apiError.status,
                stack: apiError.stack
            });
            throw apiError;
        }
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.text
        });
        res.status(500).json({ 
            error: 'Failed to send OTP',
            details: error.message
        });
    }
});

// Verify OTP and Register User endpoint
app.post('/api/verify-otp', async (req, res) => {
    console.log('Received verify-otp request:', req.body);
    const { email, otp, password } = req.body;  

    const storedData = otpStore.get(email);
    console.log('Stored OTP data:', storedData);

    if (!storedData) {
        return res.status(400).json({ error: 'No OTP found for this email' });
    }

    if (Date.now() > storedData.expiry) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    try {
        // Create new user after OTP verification
        const user = new User({
            email,
            password
        });

        // Save user to database
        await user.save();
        console.log('User saved to database:', user);

        // Clear OTP after successful verification and registration
        otpStore.delete(email);
        
        res.json({ 
            message: 'Registration successful',
            user: {
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Registration failed',
            details: error.message
        });
    }
});

// Login endpoint
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        console.log('Login attempt for email:', email);

        // Find user by email
        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if account is locked
        if (user.isLocked()) {
            return res.status(423).json({ 
                error: 'Account is locked due to too many failed attempts. Try again later.',
                lockUntil: user.lockUntil
            });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        console.log('Password valid:', isValidPassword ? 'Yes' : 'No');

        if (!isValidPassword) {
            await user.incrementLoginAttempts();
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();

        // Generate token
        const token = jwt.sign(
            { _id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: rememberMe ? '30d' : '1d' }
        );

        // Generate a session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Store session
        user.sessions.push({
            token: sessionToken,
            lastActivity: new Date(),
            device: req.headers['user-agent'] || 'Unknown',
            expiresAt: new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000)
        });

        // Update last login time
        user.lastLogin = new Date();
        await user.save();

        // Set remember me token if requested
        if (rememberMe) {
            const rememberMeToken = user.generateRememberMeToken();
            await user.save();

            res.cookie('rememberMe', rememberMeToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
        }

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        });

        res.json({ 
            message: 'Login successful',
            token,
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: user.profilePicture,
                bio: user.bio,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Password reset request
app.post('/api/reset-password-request', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const resetToken = user.generatePasswordResetToken();
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Prepare email using Brevo API
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = 'Password Reset Request';
        sendSmtpEmail.htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e3c72;">Password Reset Request</h2>
                <p>You requested a password reset. Click the button below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; background: #1e3c72; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
            </div>
        `;
        sendSmtpEmail.sender = {
            name: process.env.BREVO_SENDER_NAME,
            email: process.env.BREVO_SENDER_EMAIL
        };
        sendSmtpEmail.to = [{email: email}];

        // Send email using Brevo API
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully:', data);
        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
});

// Reset password
app.post('/api/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const resetToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: resetToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Update profile
app.put('/api/profile', verifyToken, upload.single('profilePicture'), async (req, res) => {
    try {
        const { firstName, lastName, bio } = req.body;
        const updates = { firstName, lastName, bio };

        if (req.file) {
            updates.profilePicture = '/uploads/profiles/' + req.file.filename;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, select: '-password' }
        );

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get user profile
app.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Get active sessions
app.get('/api/sessions', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json(user.sessions);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// Logout from specific session
app.post('/api/logout-session', verifyToken, async (req, res) => {
    try {
        const { sessionToken } = req.body;
        const user = await User.findById(req.user._id);
        
        user.sessions = user.sessions.filter(session => session.token !== sessionToken);
        await user.save();

        if (sessionToken === req.token) {
            res.clearCookie('token');
            res.clearCookie('rememberMe');
        }

        res.json({ message: 'Session ended successfully' });
    } catch (error) {
        console.error('Logout session error:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// Logout from all sessions
app.post('/api/logout-all', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.sessions = [];
        await user.save();

        res.clearCookie('token');
        res.clearCookie('rememberMe');
        res.json({ message: 'Logged out from all sessions' });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ error: 'Failed to logout from all sessions' });
    }
});

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Order Schema
const orderSchema = new mongoose.Schema({
    orderId: String,
    amount: Number,
    items: Array,
    paymentId: String,
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Order = mongoose.model('Order', orderSchema);

// Create order endpoint
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, items } = req.body;
        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency: "INR",
            receipt: "order_" + Date.now()
        };

        const order = await razorpay.orders.create(options);
        
        // Save order details to database
        const newOrder = new Order({
            orderId: order.id,
            amount: amount,
            items: items,
            status: 'pending'
        });
        await newOrder.save();

        res.json({
            orderId: order.id,
            amount: amount,
            currency: "INR",
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Payment verification endpoint
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify payment signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // Update order status in database
            await Order.findOneAndUpdate(
                { orderId: razorpay_order_id },
                { 
                    status: 'completed',
                    paymentId: razorpay_payment_id
                }
            );

            res.json({ status: 'success' });
        } else {
            await Order.findOneAndUpdate(
                { orderId: razorpay_order_id },
                { status: 'failed' }
            );
            res.status(400).json({ error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
