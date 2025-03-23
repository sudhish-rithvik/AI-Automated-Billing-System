import { useState, useEffect } from 'react';

const History = ({ theme, ipAddress }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, [ipAddress]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching transactions from:', `http://${ipAddress}:5000/transactions`);
      
      const response = await fetch(`http://${ipAddress}:5000/transactions`);
      const data = await response.json();
      
      console.log('Received transactions:', data);
      
      if (data.status === 'success') {
        setTransactions(data.transactions);
      } else {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-center p-4`}>
        Loading transactions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error: {error}
        <button 
          onClick={fetchTransactions}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-[#1f2937]' : 'bg-white'} rounded-lg p-4 w-full h-full overflow-auto`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Transaction History
        </h2>
        <button 
          onClick={fetchTransactions}
          className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          Refresh
        </button>
      </div>
      
      {transactions.length === 0 ? (
        <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="text-lg">No transactions found</p>
          <p className="text-sm mt-2">Complete a purchase to see it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div 
              key={transaction.transaction_id} 
              className={`border ${theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'} rounded-lg p-4 shadow-sm`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Order #{transaction.order_id}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {transaction.date} {transaction.time}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    Transaction ID: {transaction.transaction_id}
                  </p>
                </div>
                <div className={`text-right ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <p className="font-semibold">₹{transaction.total_amount.toFixed(2)}</p>
                  <p className={`text-sm ${transaction.payment_status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.payment_status}
                  </p>
                </div>
              </div>
              
              <div className={`border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'} pt-3`}>
                <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Products ({transaction.total_items} items)
                </h4>
                <table className="w-full">
                  <thead>
                    <tr className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <th className="text-left py-1">Item</th>
                      <th className="text-right py-1">Quantity</th>
                      <th className="text-right py-1">Price</th>
                      <th className="text-right py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaction.products.map((product, idx) => (
                      <tr key={idx} className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <td className="py-1">{product.name}</td>
                        <td className="text-right">{product.quantity}</td>
                        <td className="text-right">₹{product.price.toFixed(2)}</td>
                        <td className="text-right">₹{(product.price * product.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <td colSpan="3" className="text-right pt-2">Total Amount:</td>
                      <td className="text-right pt-2">₹{transaction.total_amount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
