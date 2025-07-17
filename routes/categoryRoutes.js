const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authController = require('../controllers/authController');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/featured', categoryController.getFeaturedCategories);
router.get('/:id', categoryController.getCategory);
router.get('/slug/:slug', categoryController.getCategoryBySlug);

// Protected routes (Admin only)
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.post('/', categoryController.createCategory);
router.patch('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router; 