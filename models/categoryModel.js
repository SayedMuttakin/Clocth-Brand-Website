const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A category must have a name'],
    unique: true,
    trim: true
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'A category must have a description']
  },
  image: {
    type: String,
    required: [true, 'A category must have an image']
  },
  parent: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    default: null
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug before saving
categorySchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Virtual populate for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  foreignField: 'parent',
  localField: '_id'
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category; 