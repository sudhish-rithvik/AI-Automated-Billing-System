import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LiveView from './components/LiveView'
import InvoiceSystem from './components/InvoiceSystem'
import History from './components/History'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ForgotPassword from './components/auth/ForgotPassword'
import ResetPassword from './components/auth/ResetPassword'
import Dashboard from './components/auth/Dashboard'
import Profile from './components/auth/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import './App.css'

function MainApp() {
  const [connectionError, setConnectionError] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [detectionsEnabled, setDetectionsEnabled] = useState(true)
  const [ipAddress, setIpAddress] = useState('192.168.167.252')
  const [currentView, setCurrentView] = useState('live') // 'live' or 'history'
  const { currentUser } = useAuth()

  // If user is not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />
  }

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-[#1a1b26]' : 'bg-gray-100'} px-0 py-0`}>
      <div className="flex w-full justify-between items-center p-4">
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Smart Checkout System
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              className={`px-4 py-2 rounded-lg ${currentView === 'live' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setCurrentView('live')}
            >
              Live View
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${currentView === 'history' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setCurrentView('history')}
            >
              History
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${videoEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
              <label className="flex items-center gap-1 cursor-pointer">
                <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-sm`}>Video</span>
                <input
                  type="checkbox"
                  checked={videoEnabled}
                  onChange={(e) => setVideoEnabled(e.target.checked)}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${detectionsEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
              <label className="flex items-center gap-1 cursor-pointer">
                <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-sm`}>Detections</span>
                <input
                  type="checkbox"
                  checked={detectionsEnabled}
                  onChange={(e) => setDetectionsEnabled(e.target.checked)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-sm`}>Theme:</span>
            <button
              className={`w-8 h-4 rounded-full relative ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} cursor-pointer`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button 
            className={`px-3 py-1 rounded text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            onClick={() => {
              const newIp = prompt('Enter new IP address:', ipAddress)
              if (newIp && newIp !== ipAddress) {
                setIpAddress(newIp)
              }
            }}
          >
            Change IP
          </button>
          <button 
            className={`px-3 py-1 rounded text-sm ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
            onClick={() => {
              window.location.href = '/profile'
            }}
          >
            Profile
          </button>
        </div>
      </div>

      <main className="grid grid-cols-1 w-full lg:grid-cols-2 gap-4 px-4 pb-4 h-[calc(100vh-70px)]">
        {currentView === 'live' ? (
          <>
            <LiveView 
              onConnectionError={(error) => setConnectionError(error)}
              videoEnabled={videoEnabled}
              detectionsEnabled={detectionsEnabled}
              theme={theme}
              ipAddress={ipAddress}
            />
            <InvoiceSystem 
              theme={theme} 
              ipAddress={ipAddress}
            />
          </>
        ) : (
          <div className="col-span-2">
            <History 
              theme={theme}
              ipAddress={ipAddress}
            />
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path='/history' element={<History />}/>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
