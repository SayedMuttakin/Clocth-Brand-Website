const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A product must have a name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'A product must have a description']
  },
  price: {
    type: Number,
    required: [true, 'A product must have a price']
  },
  discountPrice: {
    type: Number,
    validate: {
      validator: function(val) {
        return val < this.price;
      },
      message: 'Discount price ({VALUE}) should be below regular price'
    }
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: [true, 'A product must belong to a category']
  },
  stock: {
    type: Number,
    required: [true, 'A product must have stock quantity'],
    default: 0
  },
  images: [{
    type: String,
    required: [true, 'A product must have at least one image']
  }],
  colorVariants: [{
    name: {
      type: String,
      required: true
    },
    hex: {
      type: String,
      required: true
    },
    images: [{
      type: String,
      required: true
    }],
    stock: {
      type: Number,
      default: 0
    }
  }],
  // Keep simple colors array for backward compatibility
  simpleColors: [{
    type: String
  }],
  sizes: [{
    type: String
  }],
  features: [{
    type: String
  }],
  brand: {
    type: String,
    required: [true, 'A product must have a brand']
  },
  ratings: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0']
  },
  numReviews: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  isNewProduct: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  suppressReservedKeysWarning: true
});

// Virtual populate for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id'
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;