import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, AlertCircle, Loader, KeyRound, ChevronLeft, CheckCircle2, X } from 'lucide-react';

function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { token } = useParams();
    const navigate = useNavigate();
    const { resetPassword } = useAuth();

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validate password
        if (!validatePassword(password)) {
            setError('Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters');
            setLoading(false);
            return;
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        setMessage('Resetting your password...');

        try {
            const result = await resetPassword(token, password);
            if (result.success) {
                setMessage('Password reset successful! Redirecting to login...');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setError(result.error);
                setMessage('');
            }
        } catch (error) {
            setError('An unexpected error occurred');
            setMessage('');
        } finally {
            setLoading(false);
        }
    };

    const passwordRequirements = [
        { label: 'At least 8 characters', check: password.length >= 8 },
        { label: 'Contains uppercase letter', check: /[A-Z]/.test(password) },
        { label: 'Contains lowercase letter', check: /[a-z]/.test(password) },
        { label: 'Contains number', check: /\d/.test(password) },
        { label: 'Contains special character', check: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="bg-slate-800 rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                            <KeyRound className="h-6 w-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            Reset Your Password
                        </h2>
                        <p className="mt-2 text-slate-400">
                            Create a new secure password
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

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                New Password
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
                                    placeholder="Enter new password"
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
                                    placeholder="Confirm new password"
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
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                    </form>

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

export default ResetPassword;