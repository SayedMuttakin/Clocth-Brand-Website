const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const authController = require('../controllers/authController');

// Protect all routes after this middleware
router.use(authController.protect);

// User profile routes
router.get('/profile', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user }
  });
});

router.patch('/profile', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        name: req.body.name,
        email: req.body.email,
        address: req.body.address,
        phone: req.body.phone
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
});

// Admin routes
router.use(authController.restrictTo('admin'));
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
});

module.exports = router; 