import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Dashboard() {
    const { currentUser, logout, getSessions, logoutAll } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await getSessions();
            if (response.success) {
                setSessions(response.sessions);
            } else {
                setError(response.error);
            }
        } catch (err) {
            setError('Failed to fetch sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoutAll = async () => {
        if (window.confirm('Are you sure you want to log out from all devices?')) {
            try {
                const response = await logoutAll();
                if (response.success) {
                    // Redirect will happen automatically due to auth state change
                } else {
                    setError(response.error);
                }
            } catch (err) {
                setError('Failed to logout from all sessions');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Navigation Bar */}
            <div className="bg-gray-800 shadow-lg border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <h1 className="text-xl font-bold text-white">Smart Checkout System</h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/profile"
                                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                            >
                                Profile
                            </Link>
                            <button
                                onClick={logout}
                                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="py-10">
                <header>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-3xl font-bold text-white">Welcome, {currentUser?.name || 'User'}!</h1>
                    </div>
                </header>
                <main>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="px-4 py-8 sm:px-0">
                            <div className="bg-gray-800 rounded-lg shadow-xl p-8">
                                <div className="text-center">
                                    <h2 className="text-2xl font-semibold mb-4 text-white">Smart Checkout Dashboard</h2>
                                    <p className="mb-8 text-gray-300">You are now logged in to the Smart Checkout System.</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
                                        <Link 
                                            to="/"
                                            className="block p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
                                        >
                                            <h3 className="text-xl font-semibold mb-2 text-white">Live View</h3>
                                            <p className="text-gray-300">Access the real-time camera feed and product detection</p>
                                        </Link>
                                        
                                        <Link 
                                            to="/history"
                                            className="block p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
                                        >
                                            <h3 className="text-xl font-semibold mb-2 text-white">Invoice System</h3>
                                            <p className="text-gray-300">Manage and view customer invoices and transactions</p>
                                        </Link>
                                    </div>

                                    {/* Session Management Section */}
                                    <div className="mt-12 bg-gray-700 rounded-lg p-6">
                                        <h3 className="text-xl font-semibold mb-6 text-white">Active Sessions</h3>
                                        {/* {error && (
                                            <div className="mb-4 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-md">
                                                <p className="text-red-500">{error}</p>
                                            </div>
                                        )} */}
                                        
                                        <div className="flex justify-end mb-6">
                                            <button 
                                                onClick={handleLogoutAll}
                                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-700"
                                            >
                                                Logout from all devices
                                            </button>
                                        </div>
                                        
                                        {loading ? (
                                            <div className="flex justify-center items-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto rounded-lg">
                                                <table className="min-w-full">
                                                    <thead>
                                                        <tr className="bg-gray-800">
                                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Device</th>
                                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Address</th>
                                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Active</th>
                                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Current</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-gray-700 divide-y divide-gray-600">
                                                        {sessions.length > 0 ? (
                                                            sessions.map((session, index) => (
                                                                <tr key={index} className="hover:bg-gray-600 transition-colors duration-200">
                                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{session.userAgent || 'Unknown Device'}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{session.ip || 'Unknown'}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{new Date(session.lastActive).toLocaleString()}</td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        {session.current && (
                                                                            <span className="px-3 py-1 bg-blue-500 bg-opacity-20 text-blue-400 rounded-full text-xs font-medium">
                                                                                Current Session
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="4" className="px-6 py-4 text-center text-gray-300">No active sessions found</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Dashboard;