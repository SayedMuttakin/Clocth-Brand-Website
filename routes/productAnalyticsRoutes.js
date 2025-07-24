const express = require('express');
const router = express.Router();
const ProductAnalytics = require('../models/ProductAnalytics');
const Product = require('../models/productModel');
const { protect, restrictTo } = require('../controllers/authController');

// Track color-size combination
router.post('/track-combination', async (req, res) => {
  try {
    const { productId, colorName, colorHex, sizeName, action, sessionId } = req.body;

    // Validate required fields
    if (!productId || !colorName || !colorHex || !sizeName || !action || !sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: productId, colorName, colorHex, sizeName, action, sessionId'
      });
    }

    // Validate action
    const validActions = ['color_size_combination', 'add_to_cart_combination', 'purchase_combination'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action. Must be one of: ' + validActions.join(', ')
      });
    }

    // Create analytics record
    const analyticsData = {
      productId: String(productId),
      colorName,
      colorHex,
      sizeName,
      action,
      sessionId,
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip || req.connection.remoteAddress || ''
    };

    const analytics = await ProductAnalytics.create(analyticsData);

    res.status(201).json({
      status: 'success',
      message: 'Color-size combination tracked successfully',
      data: { analytics }
    });

  } catch (error) {
    console.error('Error tracking color-size combination:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track color-size combination',
      error: error.message
    });
  }
});

// Get color-size combination analytics for admin dashboard
router.get('/admin/combinations', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { 
      productId, 
      timeRange = '30d',
      startDate,
      endDate,
      limit = 50
    } = req.query;

    // Build query
    let query = {};
    
    if (productId) {
      query.productId = String(productId);
    }

    // Handle time range
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const now = new Date();
      let startTime;
      
      switch (timeRange) {
        case '1d':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query.timestamp = { $gte: startTime };
    }

    // Get top color-size combinations
    const topCombinations = await ProductAnalytics.aggregate([
      { $match: query },
      { $group: { 
          _id: {
            colorName: '$colorName',
            sizeName: '$sizeName',
            colorHex: '$colorHex'
          },
          totalInteractions: { $sum: 1 },
          combinations: { $sum: { $cond: [{ $eq: ['$action', 'color_size_combination'] }, 1, 0] } },
          addToCarts: { $sum: { $cond: [{ $eq: ['$action', 'add_to_cart_combination'] }, 1, 0] } },
          purchases: { $sum: { $cond: [{ $eq: ['$action', 'purchase_combination'] }, 1, 0] } }
        }
      },
      { $addFields: {
          conversionRate: { 
            $cond: [
              { $gt: ['$combinations', 0] },
              { $multiply: [{ $divide: ['$addToCarts', '$combinations'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalInteractions: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Get popular color-size combinations by product
    const productCombinations = await ProductAnalytics.aggregate([
      { $match: query },
      { $group: {
          _id: {
            productId: '$productId',
            colorName: '$colorName',
            sizeName: '$sizeName'
          },
          count: { $sum: 1 }
        }
      },
      { $group: {
          _id: '$_id.productId',
          combinations: {
            $push: {
              color: '$_id.colorName',
              size: '$_id.sizeName',
              count: '$count'
            }
          },
          totalCombinations: { $sum: '$count' }
        }
      },
      { $sort: { totalCombinations: -1 } }
    ]);

    res.json({
      status: 'success',
      data: {
        topCombinations,
        productCombinations,
        summary: {
          timeRange,
          totalRecords: await ProductAnalytics.countDocuments(query)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product analytics',
      error: error.message
    });
  }
});

// Get analytics for specific product
router.get('/product/:productId/combinations', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { timeRange = '30d' } = req.query;

    // Build time query
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1d':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const query = {
      productId: String(productId),
      timestamp: { $gte: startTime }
    };

    const combinations = await ProductAnalytics.aggregate([
      { $match: query },
      { $group: {
          _id: {
            colorName: '$colorName',
            sizeName: '$sizeName',
            colorHex: '$colorHex'
          },
          totalInteractions: { $sum: 1 },
          combinations: { $sum: { $cond: [{ $eq: ['$action', 'color_size_combination'] }, 1, 0] } },
          addToCarts: { $sum: { $cond: [{ $eq: ['$action', 'add_to_cart_combination'] }, 1, 0] } }
        }
      },
      { $addFields: {
          conversionRate: { 
            $cond: [
              { $gt: ['$combinations', 0] },
              { $multiply: [{ $divide: ['$addToCarts', '$combinations'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalInteractions: -1 } }
    ]);

    // Get product info
    const product = await Product.findById(productId).select('name colors sizes');

    res.json({
      status: 'success',
      data: {
        product,
        combinations,
        timeRange
      }
    });

  } catch (error) {
    console.error('Error fetching product combination analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product combination analytics',
      error: error.message
    });
  }
});

module.exports = router;