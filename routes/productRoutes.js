const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const adminController = require('../controllers/adminController');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/filters', productController.getProductFilters);
router.get('/featured', productController.getFeaturedProducts);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/popular', productController.getFeaturedProducts);
router.get('/:id', productController.getProduct);

// Protected routes (Admin only)
router.use(adminController.protect);

router.post('/', productController.createProduct);
router.patch('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router; 