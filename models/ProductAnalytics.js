const mongoose = require('mongoose');

const productAnalyticsSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    index: true
  },
  colorName: {
    type: String,
    required: true
  },
  colorHex: {
    type: String,
    required: true
  },
  sizeName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['color_size_combination', 'add_to_cart_combination', 'purchase_combination'],
    index: true
  },
  sessionId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
productAnalyticsSchema.index({ productId: 1, colorName: 1, sizeName: 1, action: 1 });
productAnalyticsSchema.index({ timestamp: -1 });
productAnalyticsSchema.index({ sessionId: 1 });

const ProductAnalytics = mongoose.model('ProductAnalytics', productAnalyticsSchema);

module.exports = ProductAnalytics;