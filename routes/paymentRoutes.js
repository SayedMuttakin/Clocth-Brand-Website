const express = require('express');
const {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  getPaymentMethods,
  createCustomer,
  savePaymentMethod,
  processRefund
} = require('../controllers/paymentController');
const { protect, restrictTo } = require('../controllers/authController');

const router = express.Router();

// Webhook route (must be before express.json() middleware)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Public routes
router.post('/create-payment-intent', createPaymentIntent);
router.post('/confirm-payment', confirmPayment);

// Protected routes (require authentication)
router.use(protect); // All routes after this middleware are protected

router.post('/create-customer', createCustomer);
router.get('/payment-methods', getPaymentMethods);
router.post('/save-payment-method', savePaymentMethod);

// Admin only routes
router.post('/refund', restrictTo('admin'), processRefund);

module.exports = router;