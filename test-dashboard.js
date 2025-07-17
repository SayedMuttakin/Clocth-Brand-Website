const axios = require('axios');

// Test the dashboard stats endpoint
async function testDashboardStats() {
  try {
    console.log('Testing dashboard stats endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/admin/dashboard-stats', {
      headers: {
        'Authorization': 'Bearer test-token' // This will fail auth but we can see the response structure
      }
    });
    
    console.log('Dashboard stats response:', response.data);
    console.log('Total Sales:', response.data.totalSales);
    console.log('Total Orders:', response.data.totalOrders);
    console.log('Total Customers:', response.data.totalCustomers);
    console.log('Recent Orders count:', response.data.recentOrders.length);
    console.log('Top Products count:', response.data.topProducts.length);
    
  } catch (error) {
    console.error('Error testing dashboard stats:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testDashboardStats(); 