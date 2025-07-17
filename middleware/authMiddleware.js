const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Auth Middleware: Token found in headers.');
    }

    if (!token) {
      console.log('Auth Middleware: No token found.');
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      // Verify token
      console.log('Auth Middleware: JWT_SECRET used:', process.env.JWT_SECRET); // Debugging line
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Auth Middleware: Token decoded.', decoded);
      req.user = await User.findById(decoded.id).select('-password');
      if (req.user) {
        console.log('Auth Middleware: User found and attached to req.user:', req.user.email);
      } else {
        console.log('Auth Middleware: User not found for decoded ID.');
      }
      next();
    } catch (error) {
      console.error('Auth middleware: Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } catch (error) {
    console.error('Auth middleware error (outer catch):', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional authentication - sets req.user if token is valid, but doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        console.error('Optional auth token verification error:', error);
        // Don't fail, just continue without user
        req.user = null;
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail, just continue without user
    req.user = null;
    next();
  }
};

// Admin middleware
exports.admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
}; 