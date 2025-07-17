const express = require('express');
const ColorAnalytics = require('../models/ColorAnalytics');
const Product = require('../models/productModel');
const { protect, restrictTo } = require('../controllers/authController');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Color analytics API is working!',
    timestamp: new Date().toISOString()
  });
});

// Track color selection/interaction
router.post('/track', async (req, res) => {
  try {
    const { productId, colorName, colorHex, action, sessionId } = req.body;
    
    // Validate required fields
    if (!productId || !colorName || !colorHex || !action || !sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: productId, colorName, colorHex, action, sessionId'
      });
    }

    // Get product details - handle both ObjectId and string IDs
    let product;
    try {
      // Try to find by MongoDB ObjectId first
      if (productId.match(/^[0-9a-fA-F]{24}$/)) {
        product = await Product.findById(productId);
      }
      
      // If not found or not a valid ObjectId, try to find by other fields
      if (!product) {
        // For mock products, we might need to search differently
        // Let's just use a default product name for now
        product = { name: 'Unknown Product' };
      }
    } catch (err) {
      console.log('Product lookup error:', err);
      // Use default product info if lookup fails
      product = { name: 'Unknown Product' };
    }

    // Get user IP and user agent
    const userIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Create analytics record
    const analyticsData = {
      productId: productId.toString(), // Ensure it's a string
      productName: product.name || 'Unknown Product',
      colorName,
      colorHex,
      userId: req.user ? req.user._id : null,
      userIP,
      userAgent,
      action,
      sessionId
    };

    const analytics = await ColorAnalytics.create(analyticsData);

    res.status(201).json({
      status: 'success',
      data: {
        analytics
      }
    });
  } catch (error) {
    console.error('Color tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track color selection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get color analytics for admin (protected route)
router.get('/admin/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { productId, timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build query
    const query = {
      timestamp: { $gte: startDate }
    };
    
    if (productId) {
      query.productId = productId;
    }

    // Get color selection statistics
    const colorStats = await ColorAnalytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            productId: '$productId',
            productName: '$productName',
            colorName: '$colorName',
            colorHex: '$colorHex',
            action: '$action'
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $group: {
          _id: {
            productId: '$_id.productId',
            productName: '$_id.productName',
            colorName: '$_id.colorName',
            colorHex: '$_id.colorHex'
          },
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count',
              uniqueUsers: { $size: '$uniqueUsers' },
              uniqueSessions: { $size: '$uniqueSessions' }
            }
          },
          totalInteractions: { $sum: '$count' }
        }
      },
      {
        $sort: { totalInteractions: -1 }
      }
    ]);

    // Get top colors overall
    const topColors = await ColorAnalytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            colorName: '$colorName',
            colorHex: '$colorHex'
          },
          totalSelections: { $sum: 1 },
          uniqueProducts: { $addToSet: '$productId' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          colorName: '$_id.colorName',
          colorHex: '$_id.colorHex',
          totalSelections: 1,
          uniqueProducts: { $size: '$uniqueProducts' },
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      {
        $sort: { totalSelections: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        colorStats,
        topColors,
        timeRange,
        totalRecords: await ColorAnalytics.countDocuments(query)
      }
    });
  } catch (error) {
    console.error('Color analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch color analytics'
    });
  }
});

// Get product-specific color analytics
router.get('/admin/product/:productId', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { timeRange = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const productColorStats = await ColorAnalytics.aggregate([
      {
        $match: {
          productId: productId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            colorName: '$colorName',
            colorHex: '$colorHex',
            action: '$action'
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $group: {
          _id: {
            colorName: '$_id.colorName',
            colorHex: '$_id.colorHex'
          },
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count',
              uniqueUsers: { $size: '$uniqueUsers' },
              uniqueSessions: { $size: '$uniqueSessions' }
            }
          },
          totalInteractions: { $sum: '$count' }
        }
      },
      {
        $sort: { totalInteractions: -1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        productId,
        colorStats: productColorStats,
        timeRange
      }
    });
  } catch (error) {
    console.error('Product color analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product color analytics'
    });
  }
});

module.exports = router;