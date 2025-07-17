const Review = require('../models/Review');
const Product = require('../models/productModel');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get reviews for a specific product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const rating = req.query.rating ? parseInt(req.query.rating) : null;

    // Build query
    const query = { 
      product: productId, 
      status: 'approved' 
    };
    
    if (rating) {
      query.rating = rating;
    }

    // Get reviews with pagination
    const reviews = await Review.find(query)
      .populate('user', 'name email')
      .sort({ [sortBy]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const total = await Review.countDocuments(query);

    // Get rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { product: productId, status: 'approved' } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Format rating distribution
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = 0;
    }
    ratingStats.forEach(stat => {
      ratingDistribution[stat._id] = stat.count;
    });

    res.json({
      status: 'success',
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReviews: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        },
        ratingDistribution
      }
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching reviews',
      error: error.message
    });
  }
};

// Create a new review
const createReview = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user.id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId
    });

    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this product'
      });
    }

    // Create new review
    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      comment,
      title,
      status: 'approved' // Auto-approve for now, can be changed to 'pending'
    });

    // Populate user data
    await review.populate('user', 'name email');

    // Emit real-time update to all connected clients
    if (global.io) {
      global.io.emit('newReview', {
        productId,
        review: {
          _id: review._id,
          rating: review.rating,
          comment: review.comment,
          title: review.title,
          user: review.user,
          createdAt: review.createdAt,
          status: review.status
        }
      });
    }

    res.status(201).json({
      status: 'success',
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating review',
      error: error.message
    });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reviewId } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user.id;

    // Find review and check ownership
    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found or you are not authorized to update it'
      });
    }

    // Update review
    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    review.title = title || review.title;
    review.status = 'approved'; // Reset to approved after update

    await review.save();
    await review.populate('user', 'name email');

    // Emit real-time update
    if (global.io) {
      global.io.emit('reviewUpdated', {
        productId: review.product,
        review: {
          _id: review._id,
          rating: review.rating,
          comment: review.comment,
          title: review.title,
          user: review.user,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          status: review.status
        }
      });
    }

    res.json({
      status: 'success',
      data: {
        review
      }
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating review',
      error: error.message
    });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Find review and check ownership
    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found or you are not authorized to delete it'
      });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    // Emit real-time update
    if (global.io) {
      global.io.emit('reviewDeleted', {
        productId,
        reviewId
      });
    }

    res.json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting review',
      error: error.message
    });
  }
};

// Mark review as helpful
const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    review.helpful += 1;
    await review.save();

    // Emit real-time update
    if (global.io) {
      global.io.emit('reviewHelpfulUpdated', {
        reviewId,
        helpful: review.helpful
      });
    }

    res.json({
      status: 'success',
      data: {
        helpful: review.helpful
      }
    });
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating review',
      error: error.message
    });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful
};