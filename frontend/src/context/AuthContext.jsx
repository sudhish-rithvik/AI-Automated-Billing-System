import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is logged in on initial load
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        setCurrentUser(JSON.parse(user));
        // Set default Authorization header for all requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  // API URL
  const API_URL = 'http://localhost:5001/api';

  // Login function
  const login = async (email, password, rememberMe) => {
    try {
      setError('');
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
        rememberMe
      });

      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set default Authorization header for all requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(user);
      return { success: true };
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed',
        isRateLimited: error.response?.status === 429,
        rateLimitReset: error.response?.headers?.['x-rate-limit-reset']
      };
    }
  };

  // Register function with OTP verification
  const register = async (email, password) => {
    try {
      setError('');
      // First send OTP
      const otpResponse = await axios.post(`${API_URL}/send-otp`, { email });
      return { 
        success: true, 
        message: otpResponse.data.message,
        requiresOTP: true
      };
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  // Complete registration with OTP
  const completeRegistration = async (email, password, otp) => {
    try {
      setError('');
      const response = await axios.post(`${API_URL}/verify-otp`, {
        email,
        password,
        otp
      });
      
      return { success: true, message: response.data.message };
    } catch (error) {
      setError(error.response?.data?.error || 'OTP verification failed');
      return { 
        success: false, 
        error: error.response?.data?.error || 'OTP verification failed' 
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Try to logout from server
        await axios.post(`${API_URL}/logout-session`, 
          { sessionToken: token },
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(err => console.error('Logout error:', err));
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
    }
  };

  // Send password reset request
  const requestPasswordReset = async (email) => {
    try {
      setError('');
      const response = await axios.post(`${API_URL}/reset-password-request`, { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send password reset email');
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to send password reset email' 
      };
    }
  };

  // Reset password with token
  const resetPassword = async (token, password) => {
    try {
      setError('');
      const response = await axios.post(`${API_URL}/reset-password/${token}`, { password });
      return { success: true, message: response.data.message };
    } catch (error) {
      setError(error.response?.data?.error || 'Password reset failed');
      return { 
        success: false, 
        error: error.response?.data?.error || 'Password reset failed' 
      };
    }
  };

  // Update profile
  const updateProfile = async (userData) => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      
      // Create FormData if there's a file to upload
      let data = userData;
      let headers = { Authorization: `Bearer ${token}` };
      
      if (userData.profilePicture instanceof File) {
        const formData = new FormData();
        formData.append('profilePicture', userData.profilePicture);
        
        // Add other fields to FormData
        Object.keys(userData).forEach(key => {
          if (key !== 'profilePicture') {
            formData.append(key, userData[key]);
          }
        });
        
        data = formData;
        headers = {
          ...headers,
          'Content-Type': 'multipart/form-data'
        };
      }
      
      const response = await axios.put(
        `${API_URL}/profile`, 
        data, 
        { headers }
      );
      
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      
      return { success: true, message: response.data.message };
    } catch (error) {
      setError(error.response?.data?.error || 'Profile update failed');
      return { 
        success: false, 
        error: error.response?.data?.error || 'Profile update failed' 
      };
    }
  };

  // Get user sessions
  const getSessions = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return { success: true, sessions: response.data };
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to get sessions');
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to get sessions' 
      };
    }
  };

  // Logout from all sessions
  const logoutAll = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/logout-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
      
      return { success: true };
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to logout from all sessions');
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to logout from all sessions' 
      };
    }
  };

  const value = {
    currentUser,
    login,
    register,
    completeRegistration,
    logout,
    logoutAll,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    getSessions,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
