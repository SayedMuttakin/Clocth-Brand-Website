const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Setting = require('../models/settingModel');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('Resolved .env path:', path.resolve(__dirname, '../.env'));
console.log('MONGO_URI from .env:', process.env.MONGO_URI);

const DB = process.env.MONGODB_URI;

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('DB connection successful!'));

const settings = [
  { key: 'siteName', value: 'ShopHub', description: 'Name of the e-commerce site' },
  { key: 'contactEmail', value: 'support@shophub.com', description: 'Primary contact email for customers' },
  { key: 'contactPhone', value: '+1-800-555-1234', description: 'Primary contact phone number for customers' },
  { key: 'shippingCost', value: '5.00', description: 'Default shipping cost for orders' },
  { key: 'taxRate', value: '0.08', description: 'Default tax rate for orders (e.g., 0.08 for 8%)' },
  { key: 'currency', value: 'USD', description: 'Default currency for the site' },
  { key: 'currencySymbol', value: '$', description: 'Symbol for the default currency' },
  { key: 'minOrderAmount', value: '10.00', description: 'Minimum order amount required to place an order' },
  { key: 'freeShippingThreshold', value: '100.00', description: 'Order total for free shipping' },
  { key: 'allowGuestCheckout', value: 'true', description: 'Enable or disable guest checkout' },
  { key: 'newProductDiscount', value: '0.10', description: 'Discount percentage for new products (e.g., 0.10 for 10%)' },
  { key: 'returnPolicyDays', value: '30', description: 'Number of days for return policy' },
  { key: 'socialFacebook', value: 'https://facebook.com/shophub', description: 'Facebook page URL' },
  { key: 'socialInstagram', value: 'https://instagram.com/shophub', description: 'Instagram page URL' },
  { key: 'socialTwitter', value: 'https://twitter.com/shophub', description: 'Twitter (X) page URL' },
];

const importData = async () => {
  try {
    await Setting.deleteMany();
    await Setting.create(settings);
    console.log('Settings successfully loaded!');
    process.exit();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

const deleteData = async () => {
  try {
    await Setting.deleteMany();
    console.log('Settings successfully deleted!');
    process.exit();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}