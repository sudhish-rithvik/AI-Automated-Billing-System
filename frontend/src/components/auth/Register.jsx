import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, AlertCircle, Loader, UserPlus, ChevronLeft, CheckCircle2, X, KeyRound } from 'lucide-react';

function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { register, completeRegistration } = useAuth();

    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return (
            password.length >= minLength &&
            hasUpperCase &&
            hasLowerCase &&
            hasNumbers &&
            hasSpecialChar
        );
    };

    const passwordRequirements = [
        { label: 'At least 8 characters', check: password.length >= 8 },
        { label: 'Contains uppercase letter', check: /[A-Z]/.test(password) },
        { label: 'Contains lowercase letter', check: /[a-z]/.test(password) },
        { label: 'Contains number', check: /\d/.test(password) },
        { label: 'Contains special character', check: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!validatePassword(password)) {
            setError('Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        setMessage('Sending verification code...');

        try {
            const registerResult = await register(email, password);
            if (registerResult.success && registerResult.requiresOTP) {
                setMessage(registerResult.message || 'Verification code sent to your email');
                setStep(2);
            } else {
                setError(registerResult.error || 'Failed to send verification code');
                setMessage('');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setMessage('Verifying code...');

        try {
            const completeResult = await completeRegistration(email, password, otp);
            if (completeResult.success) {
                setMessage('Registration successful! Redirecting to login...');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError(completeResult.error || 'Verification failed');
                setMessage('');
            }
        } catch (err) {
            setError('An unexpected error occurred during verification.');
            console.error('OTP verification error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setError('');
        setLoading(true);
        setMessage('Resending verification code...');

        try {
            const registerResult = await register(email, password);
            if (registerResult.success && registerResult.requiresOTP) {
                setMessage(registerResult.message || 'New verification code sent to your email');
            } else {
                setError(registerResult.error || 'Failed to resend verification code');
                setMessage('');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error('Resend OTP error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="bg-slate-800 rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                            {step === 1 ? (
                                <UserPlus className="h-6 w-6 text-blue-400" />
                            ) : (
                                <KeyRound className="h-6 w-6 text-blue-400" />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            {step === 1 ? 'Create Account' : 'Verify Email'}
                        </h2>
                        <p className="mt-2 text-slate-400">
                            {step === 1 ? 'Join Smart Checkout today' : 'Enter the code sent to your email'}
                        </p>
                    </div>

                    {message && (
                        <div className="mb-6 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-sm text-green-400 flex items-center">
                                {loading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                                {message}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm text-red-400 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                {error}
                            </p>
                        </div>
                    )}

                    {step === 1 ? (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="block w-full pl-10 bg-slate-700 border-0 rounded-lg py-2.5 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your full name"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="block w-full pl-10 bg-slate-700 border-0 rounded-lg py-2.5 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your email"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="block w-full pl-10 bg-slate-700 border-0 rounded-lg py-2.5 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                                        placeholder="Create a password"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="block w-full pl-10 bg-slate-700 border-0 rounded-lg py-2.5 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                                        placeholder="Confirm your password"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-slate-300 mb-3">Password Requirements</h3>
                                <ul className="space-y-2">
                                    {passwordRequirements.map((req, index) => (
                                        <li key={index} className="flex items-center text-sm">
                                            {req.check ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                                            ) : (
                                                <X className="h-4 w-4 text-slate-400 mr-2" />
                                            )}
                                            <span className={req.check ? 'text-green-400' : 'text-slate-400'}>
                                                {req.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white 
                                    ${loading 
                                        ? 'bg-blue-500/50 cursor-not-allowed' 
                                        : 'bg-blue-500 hover:bg-blue-600 transition-colors'
                                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800`}
                            >
                                {loading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-6" onSubmit={handleVerifyOTP}>
                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-2">
                                    Verification Code
                                </label>
                                <input
                                    id="otp"
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                    className="block w-full bg-slate-700 border-0 rounded-lg py-2.5 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter 6-digit code"
                                    disabled={loading}
                                />
                                <p className="mt-2 text-sm text-slate-400">
                                    Enter the verification code sent to {email}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white 
                                    ${loading 
                                        ? 'bg-blue-500/50 cursor-not-allowed' 
                                        : 'bg-blue-500 hover:bg-blue-600 transition-colors'
                                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800`}
                            >
                                {loading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                                {loading ? 'Verifying...' : 'Complete Registration'}
                            </button>

                            <div className="text-center">
                                <button 
                                    type="button" 
                                    onClick={handleResendOTP}
                                    className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                                    disabled={loading}
                                >
                                    Didn't receive the code? Resend
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link 
                            to="/login" 
                            className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;