import { useState, useEffect } from 'react'
import io from 'socket.io-client'

const InvoiceSystem = ({ theme, ipAddress }) => {
  const [detections, setDetections] = useState([])
  const [invoiceNumber] = useState(`INV-${Math.floor(Math.random() * 10000)}`)
  const [currentDate] = useState(new Date().toLocaleDateString())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const socket = io(`http://${ipAddress}:5000`)

    socket.on('detection_update', (data) => {
      console.log('Received detection update:', data);
      if (data.products) {
        setDetections(data.products);
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [ipAddress])

  const calculateTotal = () => {
    return detections.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleCheckout = async () => {
    try {
      setLoading(true)
      const amount = calculateTotal()
      
      // Create order
      const orderResponse = await fetch(`http://${ipAddress}:5000/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })
      const orderData = await orderResponse.json()

      // Initialize Razorpay
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Smart Checkout',
        description: `Invoice ${invoiceNumber}`,
        order_id: orderData.id,
        handler: async function (response) {
          try {
            const paymentResponse = await fetch(`http://${ipAddress}:5000/payment-success`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                amount: amount,
                products: detections
              })
            })
            const paymentData = await paymentResponse.json()
            
            if (paymentData.status === 'success') {
              alert('Payment successful! Invoice has been stored.')
              setDetections([]) // Clear cart after successful payment
            }
          } catch (error) {
            console.error('Payment verification failed:', error)
            alert('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: 'Customer Name',
          email: 'customer@example.com'
        },
        theme: {
          color: theme === 'dark' ? '#1f2937' : '#4CAF50'
        }
      }

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.open()
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Failed to initiate checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-[#1f2937]' : 'bg-white'} rounded-lg p-4 w-full h-full flex flex-col`}>
      <h2 className={`text-xl font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Invoice System
      </h2>
      
      <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
        <div>Invoice #: {invoiceNumber}</div>
        <div>Date: {currentDate}</div>
      </div>

      <div className="overflow-x-auto flex-grow">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
              <th className={`text-left py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Product</th>
              <th className={`text-right py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Quantity</th>
              <th className={`text-right py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Price</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((item, index) => (
              <tr key={index} className={`border-b ${theme === 'dark' ? 'border-gray-600/30' : 'border-gray-200/30'}`}>
                <td className={`py-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {item.name}
                </td>
                <td className={`text-right py-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {item.quantity}
                </td>
                <td className={`text-right py-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  &#8377; {(item.price * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <div className={`flex justify-between font-semibold border-t ${theme === 'dark' ? 'border-gray-600 text-white' : 'border-gray-200 text-gray-900'} pt-2`}>
          <span>Total:</span>
          <span>&#8377; {calculateTotal().toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={loading || detections.length === 0}
          className={`w-full py-2 px-4 rounded-md font-semibold transition-colors
            ${theme === 'dark' 
              ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600' 
              : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-300'
            } disabled:cursor-not-allowed`}
        >
          {loading ? 'Processing...' : 'Checkout'}
        </button>
      </div>
    </div>
  )
}

export default InvoiceSystem
