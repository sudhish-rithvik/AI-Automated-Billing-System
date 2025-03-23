import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, AlertCircle, Loader, KeyRound, ChevronLeft, ArrowRight } from 'lucide-react';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const { requestPasswordReset } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setMessage('Sending password reset link...');

        try {
            const result = await requestPasswordReset(email);
            if (result.success) {
                setMessage('Password reset link sent to your email');
                setIsSubmitted(true);
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="bg-slate-800 rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                            <KeyRound className="h-6 w-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            {!isSubmitted ? 'Reset Your Password' : 'Check Your Email'}
                        </h2>
                        <p className="mt-2 text-slate-400">
                            {!isSubmitted ? 'Enter your email to receive a reset link' : 'We have sent you instructions'}
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

                    {!isSubmitted ? (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                    Email address
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
                                {loading ? 'Sending...' : 'Send Reset Link'}
                                {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="text-sm text-blue-400">
                                    <p>We've sent a password reset link to <strong className="text-blue-300">{email}</strong></p>
                                    <p className="mt-2">Please check your email and click on the link to reset your password. If you don't see the email, check your spam folder.</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800"
                            >
                                Try another email
                            </button>
                        </div>
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

export default ForgotPassword;