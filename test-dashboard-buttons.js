const axios = require('axios');

// Test the new customer endpoints
async function testCustomerEndpoints() {
  try {
    console.log('Testing customer endpoints...');
    
    // Test getting customers (will fail auth but we can see the endpoint exists)
    const response = await axios.get('http://localhost:5000/api/admin/customers', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Customers response:', response.data);
    
  } catch (error) {
    console.error('Error testing customer endpoints:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testCustomerEndpoints(); 