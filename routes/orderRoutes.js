const express = require('express');
const router = express.Router();
const { protect, admin, optionalAuth } = require('../middleware/authMiddleware');
const orderController = require('../controllers/orderController');

// Public routes with optional authentication
router.post('/', optionalAuth, orderController.createOrder); // Allow guest orders but associate with user if logged in

// Protected routes
router.get('/my-orders', protect, orderController.getUserOrders);
router.get('/:id', protect, orderController.getOrder);
router.patch('/:id/cancel', protect, orderController.cancelOrder);
router.delete('/:id/user-delete', protect, orderController.deleteUserOrder);

// Debug route - temporary
router.get('/debug/all', orderController.debugAllOrders);

// Admin routes
router.get('/', protect, admin, orderController.getAllOrders);
router.put('/:id/status', protect, admin, orderController.updateOrderStatus);
router.delete('/:id', protect, admin, orderController.deleteOrder);

module.exports = router; 