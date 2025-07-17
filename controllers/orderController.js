const Order = require('../models/Order');
const { validateOrder } = require('../utils/validation');
const { sendOrderStatusEmail } = require('../utils/email');

// Get all orders (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    console.log('Getting orders for user:', req.user._id);
    
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 });

    console.log('Found orders:', orders.length);
    console.log('Orders:', orders.map(o => ({ id: o._id, status: o.status, createdAt: o.createdAt })));

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: { orders }
    });
  } catch (err) {
    console.error('Error getting user orders:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name price');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { error } = validateOrder(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const orderData = {
      ...req.body,
      orderStatus: 'pending',
      paymentStatus: 'pending'
    };

    // If user is logged in, add their ID as ObjectId
    if (req.user) {
      orderData.user = req.user._id;
    }

    const order = new Order(orderData);
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name price');

    // Emit real-time notification to admin panel
    const emitData = {
      orderId: populatedOrder._id,
      customer: populatedOrder.user ? populatedOrder.user.name : (populatedOrder.customerInfo?.name || 'Guest'),
      totalAmount: populatedOrder.totalAmount,
      createdAt: populatedOrder.createdAt
    };
    console.log('Emitting newOrder with data:', emitData);
    
    // Try to get Socket.IO instance from app first, then global
    let io = null;
    if (req.app && req.app.get('io')) {
      io = req.app.get('io');
      console.log('Using Socket.IO from req.app');
    } else if (global.io) {
      io = global.io;
      console.log('Using Socket.IO from global');
    }
    
    if (io) {
      console.log('Socket.IO instance found. Attempting to emit newOrder event.');
      io.emit('newOrder', emitData);
      console.log('newOrder notification emitted successfully!');
    } else {
      console.log('Socket.IO instance not found - notification not sent');
    }

    res.status(201).json({
      status: 'success',
      data: { order: populatedOrder }
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

// Update order status (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true }
    ).populate('user', 'name email')
     .populate('items.product', 'name price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Debug: print the order object
    console.log('Order object:', order);
    
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
    res.status(500).json({ message: error.message });
  }
};

// Cancel order (User can cancel their own order)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name price images');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order belongs to the current user
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if order can be cancelled (only pending orders can be cancelled)
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel order with status: ${order.status}. Only pending orders can be cancelled.` 
      });
    }

    // Check if order is within cancellation time limit (1 hour)
    const orderTime = new Date(order.createdAt).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - orderTime;
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    if (timeDiff > oneHour) {
      return res.status(400).json({ 
        message: 'Order cancellation time limit exceeded. Orders can only be cancelled within 1 hour of placement.' 
      });
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete order by user (only cancelled orders)
exports.deleteUserOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order belongs to the current user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this order' });
    }

    // Allow deletion of cancelled or delivered orders
    const allowedStatuses = ['cancelled', 'delivered'];
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({ 
        message: 'Only cancelled or delivered orders can be deleted' 
      });
    }

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: error.message });
  }
};

// Debug function to see all orders
exports.debugAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });

    console.log('=== DEBUG: All Orders ===');
    console.log('Total orders:', orders.length);
    orders.forEach(order => {
      console.log(`Order ${order._id}: User ${order.user ? order.user._id : 'No User'} (${order.user ? order.user.name : 'Guest'}), Status: ${order.status}, Created: ${order.createdAt}`);
    });

    res.json({
      total: orders.length,
      orders: orders.map(o => ({
        id: o._id,
        user: o.user ? { id: o.user._id, name: o.user.name, email: o.user.email } : null,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete order (Admin only)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};