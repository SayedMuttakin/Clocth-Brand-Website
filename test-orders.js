const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');
const Product = require('./models/productModel');

async function testOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');
    
    const orders = await Order.find().populate('items.product', 'name').limit(3);
    console.log('Sample orders found:', orders.length);
    
    orders.forEach(order => {
      console.log('\n--- Order ID:', order._id);
      console.log('Customer:', order.customerInfo.name);
      console.log('Items:');
      order.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`);
        console.log(`    Product: ${item.product ? item.product.name : 'Product ID: ' + item.product}`);
        console.log(`    Quantity: ${item.quantity}`);
        console.log(`    Color: ${item.color || 'Not specified'}`);
        console.log(`    Size: ${item.size || 'Not specified'}`);
        console.log(`    Price: $${item.price}`);
      });
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testOrders();