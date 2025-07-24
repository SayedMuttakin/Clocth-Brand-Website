const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Validation middleware
const reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot be more than 100 characters')
];

// Public routes
// Get reviews for a specific product
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes (require authentication)
router.use(protect);

// Create a new review
router.post('/product/:productId', reviewValidation, reviewController.createReview);

// Update a review
router.put('/:reviewId', reviewValidation, reviewController.updateReview);

// Delete a review
router.delete('/:reviewId', reviewController.deleteReview);

// Mark review as helpful
router.post('/:reviewId/helpful', reviewController.markReviewHelpful);

module.exports = router;