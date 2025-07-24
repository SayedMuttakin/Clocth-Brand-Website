const mongoose = require('mongoose');

const colorAnalyticsSchema = new mongoose.Schema({
  productId: {
    type: String, // Changed to String to handle both ObjectId and numeric IDs
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  colorName: {
    type: String,
    required: true
  },
  colorHex: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null // Can be null for guest users
  },
  userIP: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['view', 'select', 'add_to_cart', 'purchase'],
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
colorAnalyticsSchema.index({ productId: 1, colorName: 1, action: 1 });
colorAnalyticsSchema.index({ timestamp: -1 });
colorAnalyticsSchema.index({ sessionId: 1 });

const ColorAnalytics = mongoose.model('ColorAnalytics', colorAnalyticsSchema);
module.exports = ColorAnalytics;