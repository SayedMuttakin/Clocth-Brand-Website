const axios = require('axios');

// Test the order status update endpoint
async function testOrderStatusUpdate() {
  try {
    console.log('Testing order status update endpoint...');
    
    // First, let's test if the server is responding
    const response = await axios.get('http://localhost:5000/api/admin/orders');
    console.log('Server is responding, found orders:', response.data.length);
    
    if (response.data.length > 0) {
      const firstOrder = response.data[0];
      console.log('Testing with order ID:', firstOrder._id);
      
      // Test the status update
      const updateResponse = await axios.put(
        `http://localhost:5000/api/admin/orders/${firstOrder._id}/status`,
        { status: 'processing' },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token' // This will fail auth but we can see the error
          }
        }
      );
      
      console.log('Status update successful:', updateResponse.data);
    } else {
      console.log('No orders found to test with');
    }
    
  } catch (error) {
    console.error('Error testing order status update:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testOrderStatusUpdate(); 