const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');
const Product = require('./models/productModel');

async function createTestOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');
    
    // Get a real product from the database
    const product = await Product.findOne();
    if (!product) {
      console.log('No products found in database. Creating a test product first...');
      
      // Create a test product
      const testProduct = await Product.create({
        name: 'Test T-Shirt',
        description: 'A comfortable cotton t-shirt',
        price: 25.99,
        category: 'clothing',
        images: ['test-image.jpg'],
        stock: 100,
        colors: [
          { name: 'Red', hex: '#FF0000' },
          { name: 'Blue', hex: '#0000FF' },
          { name: 'Green', hex: '#00FF00' }
        ],
        sizes: ['S', 'M', 'L', 'XL']
      });
      
      console.log('Created test product:', testProduct._id);
      
      // Create test order with color and size
      const testOrder = await Order.create({
        customerInfo: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1234567890'
        },
        items: [
          {
            product: testProduct._id,
            quantity: 2,
            price: 25.99,
            color: 'Red',
            size: 'M'
          },
          {
            product: testProduct._id,
            quantity: 1,
            price: 25.99,
            color: 'Blue',
            size: 'L'
          }
        ],
        shippingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'US'
        },
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'pending',
        status: 'pending',
        totalAmount: 77.97,
        shippingCost: 10.00,
        tax: 15.99
      });
      
      console.log('Created test order with color and size:', testOrder._id);
      console.log('Order items:');
      testOrder.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`);
        console.log(`    Product: ${item.product}`);
        console.log(`    Quantity: ${item.quantity}`);
        console.log(`    Color: ${item.color}`);
        console.log(`    Size: ${item.size}`);
        console.log(`    Price: $${item.price}`);
      });
      
    } else {
      console.log('Found existing product:', product._id);
      
      // Create test order with existing product
      const testOrder = await Order.create({
        customerInfo: {
          name: 'Admin Test Customer',
          email: 'admin-test@example.com',
          phone: '+1987654321'
        },
        items: [
          {
            product: product._id,
            quantity: 1,
            price: product.price,
            color: 'Black',
            size: 'L'
          },
          {
            product: product._id,
            quantity: 2,
            price: product.price,
            color: 'White',
            size: 'M'
          }
        ],
        shippingAddress: {
          street: '456 Admin Street',
          city: 'Admin City',
          state: 'Admin State',
          zipCode: '54321',
          country: 'US'
        },
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'pending',
        status: 'processing',
        totalAmount: product.price * 3 + 15.99 + 10.00,
        shippingCost: 10.00,
        tax: 15.99
      });
      
      console.log('Created test order with color and size:', testOrder._id);
      console.log('Order items:');
      testOrder.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`);
        console.log(`    Product: ${item.product}`);
        console.log(`    Quantity: ${item.quantity}`);
        console.log(`    Color: ${item.color}`);
        console.log(`    Size: ${item.size}`);
        console.log(`    Price: $${item.price}`);
      });
    }
    
    console.log('\n✅ Test order created successfully!');
    console.log('Now you can:');
    console.log('1. Go to /admin/login and login as admin');
    console.log('2. Navigate to /admin/orders');
    console.log('3. Click on the test order to see color and size details');
    
    process.exit(0);
  } catch (err) {
    console.error('Error creating test order:', err);
    process.exit(1);
  }
}

createTestOrder();