const mongoose = require('mongoose');
const Product = require('./models/productModel');
const Category = require('./models/categoryModel');

async function checkData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce-app');
    console.log('Connected to MongoDB');

    const categories = await Category.find();
    console.log('\n=== CATEGORIES ===');
    console.log(`Total categories: ${categories.length}`);
    categories.forEach(cat => {
      console.log(`- ${cat.name} (slug: ${cat.slug})`);
    });

    const products = await Product.find().populate('category');
    console.log('\n=== PRODUCTS ===');
    console.log(`Total products: ${products.length}`);
    products.forEach(product => {
      console.log(`- ${product.name} (category: ${product.category?.name || 'No category'})`);
    });

    if (categories.length === 0) {
      console.log('\n⚠️  No categories found! Creating sample categories...');
      
      const sampleCategories = [
        {
          name: "Men's Fashion",
          description: "Stylish clothing for men",
          image: "https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=800",
          featured: true
        },
        {
          name: "Women's Fashion", 
          description: "Trendy clothing for women",
          image: "https://images.pexels.com/photos/949670/pexels-photo-949670.jpeg?auto=compress&cs=tinysrgb&w=800",
          featured: true
        },
        {
          name: "Accessories",
          description: "Fashion accessories and jewelry",
          image: "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800",
          featured: true
        },
        {
          name: "Footwear",
          description: "Shoes and sandals for all occasions",
          image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800",
          featured: true
        }
      ];

      const createdCategories = await Category.insertMany(sampleCategories);
      console.log(`✅ Created ${createdCategories.length} sample categories`);

      if (products.length === 0) {
        console.log('\n⚠️  No products found! Creating sample products...');
        
        const sampleProducts = [
          {
            name: "Classic Men's T-Shirt",
            description: "Comfortable cotton t-shirt for everyday wear",
            price: 29.99,
            category: createdCategories[0]._id, // Men's Fashion
            stock: 50,
            images: ["https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=800"],
            colors: ["black", "white", "blue"],
            sizes: ["S", "M", "L", "XL"],
            brand: "StyleCo",
            featured: true
          },
          {
            name: "Women's Summer Dress",
            description: "Light and breezy dress perfect for summer",
            price: 59.99,
            category: createdCategories[1]._id, // Women's Fashion
            stock: 30,
            images: ["https://images.pexels.com/photos/949670/pexels-photo-949670.jpeg?auto=compress&cs=tinysrgb&w=800"],
            colors: ["red", "blue", "yellow"],
            sizes: ["XS", "S", "M", "L"],
            brand: "FashionForward",
            featured: true
          },
          {
            name: "Leather Handbag",
            description: "Elegant leather handbag for any occasion",
            price: 89.99,
            category: createdCategories[2]._id, // Accessories
            stock: 20,
            images: ["https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800"],
            colors: ["brown", "black"],
            brand: "LuxeLeather"
          },
          {
            name: "Running Shoes",
            description: "Comfortable running shoes for active lifestyle",
            price: 79.99,
            category: createdCategories[3]._id, // Footwear
            stock: 40,
            images: ["https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800"],
            colors: ["white", "black", "blue"],
            sizes: ["7", "8", "9", "10", "11"],
            brand: "SportMax"
          }
        ];

        const createdProducts = await Product.insertMany(sampleProducts);
        console.log(`✅ Created ${createdProducts.length} sample products`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();