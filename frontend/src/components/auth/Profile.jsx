import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Calendar, Edit2, LogOut, ChevronLeft, Save, X } from 'lucide-react';

function Profile() {
    const { currentUser, updateProfile, logout } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
            setEmail(currentUser.email || '');
        }
    }, [currentUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('Updating profile...');

        try {
            const result = await updateProfile({ name });
            if (result.success) {
                setMessage('Profile updated successfully!');
                setIsEditing(false);
                setTimeout(() => {
                    setMessage('');
                }, 3000);
            } else {
                setError(result.error);
                setMessage('');
            }
        } catch (error) {
            setError('An unexpected error occurred');
            setMessage('');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/"
                            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                            <span>Back to Dashboard</span>
                        </Link>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </button>
                </div>

                <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-6 py-8 border-b border-slate-700">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <User className="h-8 w-8 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
                                <p className="text-slate-400">Manage your account preferences</p>
                            </div>
                        </div>
                    </div>

                    {(message || error) && (
                        <div className={`px-6 py-4 ${message ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            <p className="text-sm">{message || error}</p>
                        </div>
                    )}

                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-2 block w-full bg-slate-700 border-0 rounded-lg py-2.5 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email Address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        disabled
                                        className="mt-2 block w-full bg-slate-700/50 border-0 rounded-lg py-2.5 px-4 text-slate-400"
                                    />
                                    <p className="mt-2 text-xs text-slate-400">Email cannot be changed</p>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="flex items-center px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex items-center px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="divide-y divide-slate-700">
                            <div className="px-6 py-5 flex items-center">
                                <div className="w-1/3">
                                    <div className="flex items-center space-x-2 text-slate-400">
                                        <User className="h-4 w-4" />
                                        <span className="text-sm font-medium">Full Name</span>
                                    </div>
                                </div>
                                <div className="w-2/3 text-white">{name}</div>
                            </div>
                            <div className="px-6 py-5 flex items-center">
                                <div className="w-1/3">
                                    <div className="flex items-center space-x-2 text-slate-400">
                                        <Mail className="h-4 w-4" />
                                        <span className="text-sm font-medium">Email</span>
                                    </div>
                                </div>
                                <div className="w-2/3 text-white">{email}</div>
                            </div>
                            <div className="px-6 py-5 flex items-center">
                                <div className="w-1/3">
                                    <div className="flex items-center space-x-2 text-slate-400">
                                        <Calendar className="h-4 w-4" />
                                        <span className="text-sm font-medium">Joined</span>
                                    </div>
                                </div>
                                <div className="w-2/3 text-white">
                                    {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                            <div className="px-6 py-5">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                                >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit Profile
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;