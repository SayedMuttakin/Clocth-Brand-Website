const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/productModel');
const User = require('../models/User');

// Create payment intent
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd', orderId, items } = req.body;

    // Validate required fields
    if (!amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and order ID are required'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        orderId: orderId.toString(),
        userId: req.user ? req.user._id.toString() : 'guest',
        items: JSON.stringify(items || [])
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Confirm payment
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID and order ID are required'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update order status
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: 'paid',
          paymentMethod: 'stripe',
          stripePaymentIntentId: paymentIntentId,
          status: 'confirmed'
        },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        order
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Handle Stripe webhooks
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      
      // Update order status
      if (paymentIntent.metadata.orderId) {
        try {
          await Order.findByIdAndUpdate(
            paymentIntent.metadata.orderId,
            {
              paymentStatus: 'paid',
              paymentMethod: 'stripe',
              stripePaymentIntentId: paymentIntent.id,
              status: 'confirmed'
            }
          );
        } catch (error) {
          console.error('Error updating order:', error);
        }
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      
      // Update order status
      if (failedPayment.metadata.orderId) {
        try {
          await Order.findByIdAndUpdate(
            failedPayment.metadata.orderId,
            {
              paymentStatus: 'failed',
              status: 'cancelled'
            }
          );
        } catch (error) {
          console.error('Error updating failed order:', error);
        }
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// Get payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const customerId = req.user?.stripeCustomerId;
    
    if (!customerId) {
      return res.status(200).json({
        success: true,
        paymentMethods: []
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    res.status(200).json({
      success: true,
      paymentMethods: paymentMethods.data
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create customer
const createCustomer = async (req, res) => {
  try {
    const { email, name } = req.body;
    const userId = req.user._id;

    // Check if customer already exists
    const user = await User.findById(userId);
    if (user.stripeCustomerId) {
      return res.status(200).json({
        success: true,
        customerId: user.stripeCustomerId
      });
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email || user.email,
      name: name || user.name,
      metadata: {
        userId: userId.toString()
      }
    });

    // Update user with Stripe customer ID
    await User.findByIdAndUpdate(userId, {
      stripeCustomerId: customer.id
    });

    res.status(200).json({
      success: true,
      customerId: customer.id
    });

  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Save payment method
const savePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found. Please create customer first.'
      });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    res.status(200).json({
      success: true,
      message: 'Payment method saved successfully'
    });

  } catch (error) {
    console.error('Error saving payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save payment method',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Process refund
const processRefund = async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    const refundData = {
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer'
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundData);

    res.status(200).json({
      success: true,
      refund,
      message: 'Refund processed successfully'
    });

  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  getPaymentMethods,
  createCustomer,
  savePaymentMethod,
  processRefund
};