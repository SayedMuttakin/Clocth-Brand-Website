const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const Category = require('../models/categoryModel');
const Product = require('../models/productModel'); // Ensure Product model is available for cleanup

const DB = process.env.MONGODB_URI;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'));

const categories = [
  {
    name: 'Mens Fashion',
    slug: 'mens-fashion',
    image: 'https://images.pexels.com/photos/842811/pexels-photo-842811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Stylish and trendy fashion for men.',
    featured: true,
  },
  {
    name: 'Womens Fashion',
    slug: 'womens-fashion',
    image: 'https://images.pexels.com/photos/1152994/pexels-photo-1152994.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Elegant and chic fashion for women.',
    featured: true,
  },
  {
    name: 'T-Shirts',
    slug: 't-shirts',
    image: 'https://images.pexels.com/photos/1261422/pexels-photo-1261422.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Comfortable and versatile t-shirts for all occasions.',
    featured: true,
  },
  {
    name: 'Jeans',
    slug: 'jeans',
    image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Durable and stylish jeans for everyday wear.',
    featured: true,
  },
  {
    name: 'Dresses',
    slug: 'dresses',
    image: 'https://images.pexels.com/photos/1055691/pexels-photo-1055691.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Beautiful dresses for every style and event.',
    featured: false,
  },
  {
    name: 'Outerwear',
    slug: 'outerwear',
    image: 'https://images.pexels.com/photos/1124465/pexels-photo-1124465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    description: 'Warm and fashionable outerwear for all seasons.',
    featured: false,
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    image: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'Comfortable and stylish footwear for every step.',
    featured: false,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    image: 'https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800',
    description: 'The perfect accessories to complete your look.',
    featured: false,
  },
];

const seedCategories = async () => {
  try {
    // To avoid duplicates, we first delete all existing categories
    await Category.deleteMany();
    console.log('Old categories deleted!');

    // We also delete products that might belong to old, now non-existent categories
    // This is optional but recommended for a clean slate
    await Product.deleteMany();
    console.log('All products deleted for a clean slate!');

    await Category.insertMany(categories);
    console.log('New categories have been seeded successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};

seedCategories();
