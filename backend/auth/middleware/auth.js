const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Create rate limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    message: { error: 'Too many login attempts, please try again later' }
});

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || 
                     req.cookies?.token ||
                     req.query?.token;

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Invalid token.' });
        }

        // Check if token exists in user's sessions
        const session = user.sessions.find(s => s.token === token);
        if (!session) {
            return res.status(401).json({ error: 'Session expired.' });
        }

        // Update last activity
        session.lastActivity = new Date();
        await user.save();

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

// Check remember me token
const checkRememberMe = async (req, res, next) => {
    try {
        const rememberMeToken = req.cookies?.rememberMe;
        
        if (!rememberMeToken) {
            return next();
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(rememberMeToken)
            .digest('hex');

        const user = await User.findOne({ rememberMeToken: hashedToken });
        
        if (user) {
            // Generate new JWT token
            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Add new session
            user.sessions.push({
                token,
                lastActivity: new Date(),
                device: req.headers['user-agent'],
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });

            await user.save();

            // Set new token in response
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });
        }
        
        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    verifyToken,
    checkRememberMe,
    loginLimiter
};
