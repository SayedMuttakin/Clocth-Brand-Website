const axios = require('axios');

async function testOrderCreation() {
  try {
    console.log('Testing order creation and Socket.IO notification...');
    
    // Test order data
    const orderData = {
      customerInfo: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890'
      },
      items: [
        {
          product: '507f1f77bcf86cd799439011', // dummy product ID
          quantity: 2,
          price: 29.99,
          color: 'red',
          size: 'M'
        }
      ],
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'US'
      },
      paymentMethod: 'cash_on_delivery',
      totalAmount: 59.98,
      shippingCost: 0,
      tax: 0
    };

    console.log('Sending order creation request...');
    const response = await axios.post('http://localhost:5000/api/orders', orderData);
    console.log('Order created successfully:', response.data);
    
  } catch (error) {
    console.error('Error testing order creation:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testOrderCreation();