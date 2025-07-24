const mongoose = require('mongoose');

const sizeAnalyticsSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    index: true
  },
  sizeName: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: ['view', 'select', 'add_to_cart', 'purchase'],
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
sizeAnalyticsSchema.index({ productId: 1, sizeName: 1, action: 1 });
sizeAnalyticsSchema.index({ timestamp: -1 });
sizeAnalyticsSchema.index({ sessionId: 1 });

const SizeAnalytics = mongoose.model('SizeAnalytics', sizeAnalyticsSchema);

module.exports = SizeAnalytics;