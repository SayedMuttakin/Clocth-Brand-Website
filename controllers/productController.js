const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const mongoose = require('mongoose');

exports.getAllProducts = async (req, res) => {
  try {
    console.log('Received query:', req.query);
    
    const queryObj = { ...req.query };
    // sortBy কে excludedFields এ add করুন
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'sortBy'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Handle category slug search
    if (queryObj.category) {
      try {
        // First try to find category by slug
        const category = await Category.findOne({ slug: queryObj.category });
        if (category) {
          queryObj.category = category._id;
        } else {
          // If not found by slug, try by ObjectId
          if (!mongoose.Types.ObjectId.isValid(queryObj.category)) {
            return res.status(200).json({
              status: 'success',
              results: 0,
              total: 0,
              data: { products: [] }
            });
          }
        }
      } catch (err) {
        console.error('Error finding category:', err);
        return res.status(200).json({
          status: 'success',
          results: 0,
          total: 0,
          data: { products: [] }
        });
      }
    }

    let queryStr = JSON.stringify(queryObj);
    try {
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `${match}`);
    } catch (parseErr) {
      console.error('Error processing query string:', parseErr);
      return res.status(400).json({ status: 'fail', message: 'Invalid query string' });
    }
    
    console.log('Processed query string:', queryStr);
    let query = Product.find(JSON.parse(queryStr));

    // Handle sorting - sortBy instead of sort
    if (req.query.sortBy) {
      let sortField = '';
      switch(req.query.sortBy) {
        case 'newest':
          sortField = '-createdAt';
          break;
        case 'price-low-high':
          sortField = 'price';
          break;
        case 'price-high-low':
          sortField = '-price';
          break;
        case 'rating':
          sortField = '-ratings';
          break;
        default:
          sortField = '-createdAt';
      }
      query = query.sort(sortField);
    } else if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    // Populate category information
    query = query.populate('category');

    const products = await query;
    console.log('Products found:', products.length);

    const total = await Product.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      status: 'success',
      results: products.length,
      total,
      data: { products }
    });
  } catch (err) {
    console.error('Error in getAllProducts:', err);
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    
    if (!product) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { product }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    console.log('Received product data for creation:', req.body);
    const newProduct = await Product.create(req.body);
    res.status(201).json({
      status: 'success',
      data: { product: newProduct }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    console.log('Received product data for update:', req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!product) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { product }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product not found'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ featured: true })
      .populate('category')
      .limit(8)
      .sort('-createdAt');
      
    res.status(200).json({
      status: 'success',
      results: products.length,
      data: { products }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getNewArrivals = async (req, res) => {
  try {
    const products = await Product.find({ isNewProduct: true })
      .populate('category')
      .sort('-createdAt')
      .limit(8);
      
    res.status(200).json({
      status: 'success',
      results: products.length,
      data: { products }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

exports.getProductFilters = async (req, res) => {
  try {
    const [categoriesResult, colorsResult, sizesResult, brandsResult, priceRangesResult] = await Promise.all([
      Category.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'category',
            as: 'products'
          }
        },
        {
          $project: {
            _id: 0,
            value: '$_id',
            label: '$name',
            image: '$image',
            description: '$description',
            count: { $size: '$products' }
          }
        }
      ]),
      Product.aggregate([
        { $unwind: '$simpleColors' },
        { $group: { _id: '$simpleColors', count: { $sum: 1 } } },
        { $project: { _id: 0, value: '$_id', label: '$_id', count: 1 } }
      ]),
      Product.aggregate([
        { $unwind: '$sizes' },
        { $group: { _id: '$sizes', count: { $sum: 1 } } },
        { $project: { _id: 0, value: '$_id', label: '$_id', count: 1 } }
      ]),
      Product.aggregate([
        { $match: { brand: { $ne: null, $ne: '' } } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $project: { _id: 0, value: '$_id', label: '$_id', count: 1 } }
      ]),
      Product.aggregate([
        {
          $facet: {
            "range1": [{ $match: { price: { $lt: 50 } } }, { $count: 'count' }],
            "range2": [{ $match: { price: { $gte: 50, $lt: 100 } } }, { $count: 'count' }],
            "range3": [{ $match: { price: { $gte: 100, $lt: 200 } } }, { $count: 'count' }],
            "range4": [{ $match: { price: { $gte: 200 } } }, { $count: 'count' }]
          }
        }
      ])
    ]);

    const priceRanges = [
      { value: '0-50', label: 'Under $50', min: 0, max: 50, count: priceRangesResult[0]?.range1?.[0]?.count || 0 },
      { value: '50-100', label: '$50 - $100', min: 50, max: 100, count: priceRangesResult[0]?.range2?.[0]?.count || 0 },
      { value: '100-200', label: '$100 - $200', min: 100, max: 200, count: priceRangesResult[0]?.range3?.[0]?.count || 0 },
      { value: '200+', label: 'Above $200', min: 200, max: 999999, count: priceRangesResult[0]?.range4?.[0]?.count || 0 }
    ];

    const colorHexMap = {
      'red': '#FF0000', 'blue': '#0000FF', 'green': '#00FF00', 'black': '#000000',
      'white': '#FFFFFF', 'yellow': '#FFFF00', 'purple': '#800080', 'pink': '#FFC0CB',
      'orange': '#FFA500', 'brown': '#A52A2A', 'gray': '#808080', 'grey': '#808080'
    };

    res.status(200).json({
      status: 'success',
      data: {
        categories: categoriesResult,
        colors: colorsResult.map(color => ({
          ...color,
          label: color.label.charAt(0).toUpperCase() + color.label.slice(1),
          hex: colorHexMap[color.label.toLowerCase()] || '#000000'
        })),
        sizes: sizesResult.map(size => ({ ...size, label: size.label.toUpperCase() })),
        brands: brandsResult,
        priceRanges
      }
    });
  } catch (err) {
    console.error('Error in getProductFilters:', err);
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        status: 'fail',
        message: 'Search query is required'
      });
    }
    
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } }
      ]
    }).populate('category');
    
    res.status(200).json({
      status: 'success',
      results: products.length,
      data: { products }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};