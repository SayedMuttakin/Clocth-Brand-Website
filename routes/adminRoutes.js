const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const { sendOrderStatusEmail } = require('../utils/email');
const User = require('../models/userModel');

// Admin auth routes
router.post('/login', adminController.login);

// Password reset routes
router.post('/forgotPassword', adminController.forgotPassword);
router.patch('/resetPassword/:token', adminController.resetPassword);

// Protected admin routes
router.use(adminController.protect);

// Admin management routes (super-admin only)
router.route('/manage')
    .get(adminController.restrictTo('super-admin'), adminController.getAllAdmins)
    .post(adminController.restrictTo('super-admin'), adminController.createAdmin);

router.route('/manage/:id')
    .put(adminController.restrictTo('super-admin'), adminController.updateAdmin)
    .delete(adminController.restrictTo('super-admin'), adminController.deleteAdmin);

// Test Socket.IO notification endpoint
router.post('/test-notification', async (req, res) => {
  try {
    const testData = {
      orderId: 'test-' + Date.now(),
      customer: 'Test Customer',
      totalAmount: 99.99,
      createdAt: new Date()
    };
    
    console.log('Testing Socket.IO notification with data:', testData);
    
    // Try to get Socket.IO instance
    let io = null;
    if (req.app && req.app.get('io')) {
      io = req.app.get('io');
      console.log('Using Socket.IO from req.app');
    } else if (global.io) {
      io = global.io;
      console.log('Using Socket.IO from global');
    }
    
    if (io) {
      io.emit('newOrder', testData);
      console.log('Test notification emitted successfully!');
      res.json({ success: true, message: 'Test notification sent', data: testData });
    } else {
      console.log('Socket.IO instance not found');
      res.status(500).json({ success: false, message: 'Socket.IO instance not found' });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add more protected admin routes here

// Get all orders (admin only)
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('items.product', 'name images');
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get single order (admin only)
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Update order status (admin only)
router.put('/orders/:id/status', async (req, res) => {
  console.log('--- Admin order status update API hit ---', req.params.id, req.body);
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = status;
    await order.save();

    // Send email notification (with error handling)
    try {
      if (order.user && order.user.email) {
        console.log('Sending email to:', order.user.email, 'for order:', order._id, 'with status:', status);
        await sendOrderStatusEmail(order.user.email, order._id, status);
      } else if (order.customerInfo && order.customerInfo.email) {
        console.log('Sending email to:', order.customerInfo.email, 'for order:', order._id, 'with status:', status);
        await sendOrderStatusEmail(order.customerInfo.email, order._id, status);
      } else {
        console.log('No email found for order:', order._id);
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the entire request if email fails
      // Just log the error and continue
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// Delete order (admin only)
router.delete('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow deletion of cancelled orders for safety
    if (order.status !== 'cancelled') {
      return res.status(400).json({ 
        message: 'Only cancelled orders can be deleted. Please cancel the order first.' 
      });
    }

    await Order.findByIdAndDelete(req.params.id);
    
    console.log(`Admin deleted cancelled order: ${req.params.id}`);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
});

// Dashboard stats (admin only)
router.get('/dashboard-stats', adminController.getDashboardStats);

// Get all customers (admin only)
router.get('/customers', async (req, res) => {
  try {
    const customers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

// Create new customer (admin only)
router.post('/customers', async (req, res) => {
  try {
    const newCustomer = await User.create(req.body);
    newCustomer.password = undefined; // Don't send password back
    
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Error creating customer', error: error.message });
  }
});

// Get single customer (admin only)
router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select('-password');
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ message: 'Error fetching customer', error: error.message });
  }
});

// Update customer (admin only)
router.put('/customers/:id', async (req, res) => {
  try {
    const customer = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ message: 'Error updating customer', error: error.message });
  }
});

// Delete customer (admin only)
router.delete('/customers/:id', async (req, res) => {
  try {
    const customer = await User.findByIdAndDelete(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ message: 'Error deleting customer', error: error.message });
  }
});

// Categories management (admin only)
const Category = require('../models/categoryModel');
const Review = require('../models/Review');

// Get all categories (admin only)
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Create new category (admin only)
router.post('/categories', async (req, res) => {
  try {
    const newCategory = await Category.create(req.body);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
});

// Update category (admin only)
router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
});

// Delete category (admin only)
router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
});

// Reviews management (admin only)

// Get all reviews (admin only)
router.get('/reviews', async (req, res) => {
  try {
    const { status, rating, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (rating) query.rating = parseInt(rating);
    
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Review.countDocuments(query);
    
    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

// Get single review (admin only)
router.get('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ message: 'Error fetching review', error: error.message });
  }
});

// Update review status (admin only)
router.put('/reviews/:id/status', async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status, adminResponse },
      { new: true, runValidators: true }
    );
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json(review);
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ message: 'Error updating review status', error: error.message });
  }
});

// Delete review (admin only)
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
});

// Get review statistics (admin only)
router.get('/reviews/stats/overview', async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedReviews: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const ratingDistribution = await Review.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    
    res.json({
      overview: stats[0] || {
        totalReviews: 0,
        averageRating: 0,
        pendingReviews: 0,
        approvedReviews: 0,
        rejectedReviews: 0
      },
      ratingDistribution
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ message: 'Error fetching review stats', error: error.message });
  }
});

module.exports = router;