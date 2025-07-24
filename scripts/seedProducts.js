const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
require('dotenv').config();

const seedProducts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');

    // Get categories
    const categories = await Category.find();
    console.log('Found categories:', categories.map(c => c.name));

    if (categories.length === 0) {
      console.log('No categories found. Please run seedCategories.js first.');
      process.exit(1);
    }

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Sample products for each category
    const products = [];

    // Men's Fashion Products
    const mensFashion = categories.find(c => c.slug === "men's-fashion");
    if (mensFashion) {
      products.push(
        {
          name: "Classic Cotton T-Shirt",
          description: "Comfortable and stylish cotton t-shirt perfect for everyday wear",
          price: 29.99,
          category: mensFashion._id,
          stock: 50,
          images: ["https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["black", "white", "blue"],
          sizes: ["S", "M", "L", "XL"],
          brand: "StyleCo",
          ratings: 4.5,
          numReviews: 25,
          featured: true
        },
        {
          name: "Formal Business Shirt",
          description: "Professional dress shirt for business and formal occasions",
          price: 49.99,
          category: mensFashion._id,
          stock: 30,
          images: ["https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["white", "blue", "black"],
          sizes: ["S", "M", "L", "XL"],
          brand: "BusinessWear",
          ratings: 4.7,
          numReviews: 18
        },
        {
          name: "Casual Polo Shirt",
          description: "Comfortable polo shirt for casual and semi-formal occasions",
          price: 34.99,
          category: mensFashion._id,
          stock: 40,
          images: ["https://images.pexels.com/photos/1232459/pexels-photo-1232459.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["navy", "red", "green"],
          sizes: ["S", "M", "L", "XL"],
          brand: "CasualFit",
          ratings: 4.3,
          numReviews: 32
        }
      );
    }

    // Women's Fashion Products
    const womensFashion = categories.find(c => c.slug === "women's-fashion");
    if (womensFashion) {
      products.push(
        {
          name: "Floral Summer Dress",
          description: "Beautiful floral dress perfect for summer occasions",
          price: 59.99,
          category: womensFashion._id,
          stock: 25,
          images: ["https://images.pexels.com/photos/972995/pexels-photo-972995.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["pink", "blue", "yellow"],
          sizes: ["XS", "S", "M", "L"],
          brand: "FloralStyle",
          ratings: 4.8,
          numReviews: 42,
          featured: true
        },
        {
          name: "Elegant Evening Gown",
          description: "Sophisticated evening gown for special occasions",
          price: 129.99,
          category: womensFashion._id,
          stock: 15,
          images: ["https://images.pexels.com/photos/1021693/pexels-photo-1021693.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["black", "red", "navy"],
          sizes: ["XS", "S", "M", "L"],
          brand: "ElegantWear",
          ratings: 4.9,
          numReviews: 28
        }
      );
    }

    // Accessories Products
    const accessories = categories.find(c => c.slug === "accessories");
    if (accessories) {
      products.push(
        {
          name: "Leather Handbag",
          description: "Premium leather handbag with multiple compartments",
          price: 89.99,
          category: accessories._id,
          stock: 20,
          images: ["https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["brown", "black", "tan"],
          brand: "LeatherCraft",
          ratings: 4.6,
          numReviews: 35,
          featured: true
        },
        {
          name: "Classic Watch",
          description: "Elegant timepiece with leather strap",
          price: 199.99,
          category: accessories._id,
          stock: 12,
          images: ["https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["black", "brown"],
          brand: "TimeKeeper",
          ratings: 4.7,
          numReviews: 22
        }
      );
    }

    // Footwear Products
    const footwear = categories.find(c => c.slug === "footwear");
    if (footwear) {
      products.push(
        {
          name: "Running Sneakers",
          description: "Comfortable running shoes with excellent cushioning",
          price: 79.99,
          category: footwear._id,
          stock: 35,
          images: ["https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["white", "black", "blue"],
          sizes: ["7", "8", "9", "10", "11"],
          brand: "SportFit",
          ratings: 4.4,
          numReviews: 58,
          featured: true
        },
        {
          name: "Formal Leather Shoes",
          description: "Classic leather dress shoes for formal occasions",
          price: 149.99,
          category: footwear._id,
          stock: 18,
          images: ["https://images.pexels.com/photos/292999/pexels-photo-292999.jpeg?auto=compress&cs=tinysrgb&w=800"],
          colors: ["black", "brown"],
          sizes: ["7", "8", "9", "10", "11"],
          brand: "FormalWear",
          ratings: 4.8,
          numReviews: 31
        }
      );
    }

    // Insert products
    const createdProducts = await Product.insertMany(products);
    console.log(`Created ${createdProducts.length} products`);

    // Show products by category
    for (const category of categories) {
      const categoryProducts = createdProducts.filter(p => p.category.toString() === category._id.toString());
      console.log(`${category.name} (${category.slug}): ${categoryProducts.length} products`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

seedProducts();