const express = require('express');
const router = express.Router();
const SizeAnalytics = require('../models/SizeAnalytics');
const Product = require('../models/productModel');
const { protect, restrictTo } = require('../controllers/authController');

// Track size interaction
router.post('/track', async (req, res) => {
  try {
    const { productId, sizeName, action, sessionId } = req.body;

    // Validate required fields
    if (!productId || !sizeName || !action || !sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: productId, sizeName, action, sessionId'
      });
    }

    // Validate action
    const validActions = ['view', 'select', 'add_to_cart', 'purchase'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action. Must be one of: ' + validActions.join(', ')
      });
    }

    // Create analytics record
    const analyticsData = {
      productId: String(productId),
      sizeName,
      action,
      sessionId,
      userAgent: req.get('User-Agent') || '',
      ipAddress: req.ip || req.connection.remoteAddress || ''
    };

    const analytics = await SizeAnalytics.create(analyticsData);

    // Get size selection statistics
    const sizeStats = await SizeAnalytics.aggregate([
      { $match: { productId: String(productId), action: 'select' } },
      { $group: { _id: '$sizeName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Size interaction tracked successfully',
      data: {
        analytics,
        sizeStats
      }
    });

  } catch (error) {
    console.error('Error tracking size interaction:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track size interaction',
      error: error.message
    });
  }
});

// Get size analytics for admin dashboard
router.get('/admin/stats', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { 
      productId, 
      timeRange = '30d',
      startDate,
      endDate,
      limit = 50,
      page = 1
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

    // Get top sizes overall
    const topSizes = await SizeAnalytics.aggregate([
      { $match: query },
      { $group: { 
          _id: '$sizeName', 
          totalInteractions: { $sum: 1 },
          views: { $sum: { $cond: [{ $eq: ['$action', 'view'] }, 1, 0] } },
          selections: { $sum: { $cond: [{ $eq: ['$action', 'select'] }, 1, 0] } },
          addToCarts: { $sum: { $cond: [{ $eq: ['$action', 'add_to_cart'] }, 1, 0] } },
          purchases: { $sum: { $cond: [{ $eq: ['$action', 'purchase'] }, 1, 0] } }
        }
      },
      { $sort: { totalInteractions: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Get size interactions over time
    const timeStats = await SizeAnalytics.aggregate([
      { $match: query },
      { $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            sizeName: '$sizeName'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Get size conversion rates (selections to add-to-cart)
    const conversionStats = await SizeAnalytics.aggregate([
      { $match: query },
      { $group: {
          _id: '$sizeName',
          views: { $sum: { $cond: [{ $eq: ['$action', 'view'] }, 1, 0] } },
          selections: { $sum: { $cond: [{ $eq: ['$action', 'select'] }, 1, 0] } },
          addToCarts: { $sum: { $cond: [{ $eq: ['$action', 'add_to_cart'] }, 1, 0] } }
        }
      },
      { $addFields: {
          selectionRate: { 
            $cond: [
              { $gt: ['$views', 0] },
              { $multiply: [{ $divide: ['$selections', '$views'] }, 100] },
              0
            ]
          },
          conversionRate: { 
            $cond: [
              { $gt: ['$selections', 0] },
              { $multiply: [{ $divide: ['$addToCarts', '$selections'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { conversionRate: -1 } }
    ]);

    res.json({
      status: 'success',
      data: {
        topSizes,
        timeStats,
        conversionStats,
        summary: {
          timeRange,
          totalRecords: await SizeAnalytics.countDocuments(query)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching size analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch size analytics',
      error: error.message
    });
  }
});

// Get size analytics for specific product
router.get('/product/:productId', protect, restrictTo('admin'), async (req, res) => {
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

    const productSizeStats = await SizeAnalytics.aggregate([
      { $match: query },
      { $group: {
          _id: '$sizeName',
          totalInteractions: { $sum: 1 },
          views: { $sum: { $cond: [{ $eq: ['$action', 'view'] }, 1, 0] } },
          selections: { $sum: { $cond: [{ $eq: ['$action', 'select'] }, 1, 0] } },
          addToCarts: { $sum: { $cond: [{ $eq: ['$action', 'add_to_cart'] }, 1, 0] } },
          purchases: { $sum: { $cond: [{ $eq: ['$action', 'purchase'] }, 1, 0] } }
        }
      },
      { $addFields: {
          selectionRate: { 
            $cond: [
              { $gt: ['$views', 0] },
              { $multiply: [{ $divide: ['$selections', '$views'] }, 100] },
              0
            ]
          },
          conversionRate: { 
            $cond: [
              { $gt: ['$selections', 0] },
              { $multiply: [{ $divide: ['$addToCarts', '$selections'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalInteractions: -1 } }
    ]);

    // Get product info
    const product = await Product.findById(productId).select('name sizes');

    res.json({
      status: 'success',
      data: {
        product,
        sizeStats: productSizeStats,
        timeRange
      }
    });

  } catch (error) {
    console.error('Error fetching product size analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product size analytics',
      error: error.message
    });
  }
});

module.exports = router;