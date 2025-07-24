const Admin = require('../models/adminModel');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const Order = require('../models/Order');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');

// Create JWT token
const signToken = (id) => {
  return jwt.sign({ id, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
};

// Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }

    // Check if admin exists && password is correct
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.correctPassword(password, admin.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // If everything ok, send token to client
    const token = signToken(admin._id);
    admin.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      admin
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1) Get admin based on POSTed email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        status: 'fail',
        message: 'There is no admin with that email address.'
      });
    }

    // 2) Generate the random reset token
    const resetToken = admin.createPasswordResetToken();
    await admin.save({ validateBeforeSave: false });

    // 3) Send it to admin's email
    const resetURL = `${process.env.FRONTEND_URL}/admin/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    console.log('Attempting to send email...');
    try {
      await sendEmail({
        email: admin.email,
        subject: 'Your password reset token (valid for 10 min)',
        message
      });

      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
      });
    } catch (err) {
      console.error('Error sending email in forgotPassword:', err);
      admin.passwordResetToken = undefined;
      admin.passwordResetExpires = undefined;
      await admin.save({ validateBeforeSave: false });

      return res.status(500).json({
        status: 'error',
        message: 'There was an error sending the email. Try again later!'
      });
    }
  } catch (err) {
    console.error('Error in forgotPassword controller:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    // 1) Get admin based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is admin, set the new password
    if (!admin) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is invalid or has expired'
      });
    }

    admin.password = req.body.password;
    admin.passwordConfirm = req.body.passwordConfirm; // Assuming you have passwordConfirm in your model
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();

    // 3) Log the admin in, send JWT
    const token = signToken(admin._id);

    res.status(200).json({
      status: 'success',
      token,
      admin
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Protect admin routes middleware
exports.protect = async (req, res, next) => {
  try {
    // Get token
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if admin still exists
    const currentAdmin = await Admin.findById(decoded.id);
    if (!currentAdmin || !decoded.isAdmin) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid admin token or admin no longer exists.'
      });
    }

    // Check if password was changed after token was issued
    // if (currentAdmin.changedPasswordAfter(decoded.iat)) {
    //   return res.status(401).json({
    //     status: 'fail',
    //     message: 'Admin recently changed password! Please log in again.'
    //   });
    // }

    // Grant access to protected route
    req.admin = currentAdmin;
    next();
  }
  catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Invalid token or token expired'
    });
  }
};

// Dashboard stats for admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Total sales (sum of all order totals)
    const totalSalesAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalSales = totalSalesAgg[0]?.total || 0;

    // Total orders
    const totalOrders = await Order.countDocuments();

    // Total customers
    const totalCustomers = await User.countDocuments();

    // Recent orders (last 5)
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    // Top products by quantity sold
    const topProductsAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $group: {
          _id: "$items.product",
          sold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { sold: -1 } },
      { $limit: 5 }
    ]);
    // Populate product details
    const topProducts = await Product.find({ _id: { $in: topProductsAgg.map(p => p._id) } });
    const topProductsWithStats = topProductsAgg.map(tp => {
      const prod = topProducts.find(p => p._id.toString() === tp._id.toString());
      return {
        name: prod?.name || 'Unknown',
        sold: tp.sold,
        revenue: tp.revenue,
        productId: tp._id
      };
    });

    res.json({
      totalSales,
      totalOrders,
      totalCustomers,
      recentOrders,
      topProducts: topProductsWithStats
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Get all admins (for super-admin)
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json({
      status: 'success',
      results: admins.length,
      data: { admins }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admins', error: err.message });
  }
};

// Create a new admin (for super-admin)
exports.createAdmin = async (req, res) => {
  try {
    const newAdmin = await Admin.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'admin'
    });
    newAdmin.password = undefined;
    res.status(201).json({
      status: 'success',
      data: { admin: newAdmin }
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create admin', error: err.message });
  }
};

// Update an admin (for super-admin)
exports.updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({
      status: 'success',
      data: { admin }
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to update admin', error: err.message });
  }
};

// Delete an admin (for super-admin)
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete admin', error: err.message });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Get all admins (for super-admin)
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json({
      status: 'success',
      results: admins.length,
      data: { admins }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admins', error: err.message });
  }
};

// Create a new admin (for super-admin)
exports.createAdmin = async (req, res) => {
  try {
    const newAdmin = await Admin.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'admin'
    });
    newAdmin.password = undefined;
    res.status(201).json({
      status: 'success',
      data: { admin: newAdmin }
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create admin', error: err.message });
  }
};

// Update an admin (for super-admin)
exports.updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({
      status: 'success',
      data: { admin }
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to update admin', error: err.message });
  }
};

// Delete an admin (for super-admin)
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete admin', error: err.message });
  }
};