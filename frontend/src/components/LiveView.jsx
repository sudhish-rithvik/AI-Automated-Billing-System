import { useState, useEffect } from 'react'
import io from 'socket.io-client'

const LiveView = ({ onConnectionError, videoEnabled, detectionsEnabled, theme, ipAddress }) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [detections, setDetections] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)

  const connectToRaspberryPi = () => {
    if (socket) {
      socket.disconnect()
    }

    try {
      const newSocket = io(`http://${ipAddress}:5000`)
      
      newSocket.on('connect', () => {
        setIsConnected(true)
        onConnectionError(false)
      })

      newSocket.on('connect_error', () => {
        setIsConnected(false)
        onConnectionError(true)
      })

      // Changed to match work.html implementation
      newSocket.on('detection_update', (data) => {
        if (data.products) {
          setDetections(data.products)
        }
      })

      setSocket(newSocket)
    } catch (error) {
      console.error('Failed to connect:', error)
      onConnectionError(true)
    }
  }

  useEffect(() => {
    connectToRaspberryPi()
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [ipAddress])

  const handleStartDetection = () => {
    if (socket && isConnected) {
      socket.emit('start_detection')
      setIsDetecting(true)
    }
  }

  const handleStopDetection = () => {
    if (socket && isConnected) {
      socket.emit('stop_detection')
      setIsDetecting(false)
    }
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-[#1f2937]' : 'bg-white'} rounded-lg p-4 w-full h-full flex flex-col`}>
      <div className="flex justify-between items-center mb-3">
        <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Live View</h2>
        <div className="flex gap-2">
          <button
            onClick={handleStartDetection}
            disabled={!isConnected || isDetecting}
            className={`px-3 py-1 rounded text-sm ${
              !isConnected || isDetecting
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            Start Detection
          </button>
          <button
            onClick={handleStopDetection}
            disabled={!isConnected || !isDetecting}
            className={`px-3 py-1 rounded text-sm ${
              !isConnected || !isDetecting
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Stop Detection
          </button>
        </div>
      </div>
      
      <div className="relative flex-grow bg-black rounded-lg overflow-hidden">
        {videoEnabled && (
          <img
            src={`http://${ipAddress}:5000/video_feed`}
            alt="Camera Feed"
            className="w-full h-full object-cover"
          />
        )}
      </div>

    </div>
  )
}

export default LiveView
