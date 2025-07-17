const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file...');
  
  const envContent = `# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/ecommerce-app

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Gmail)
# Note: For Gmail, you need to use an App Password, not your regular password
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Server Configuration
PORT=5000
NODE_ENV=development

# Optional: For production
# NODE_ENV=production
`;

  fs.writeFileSync(envPath, envContent);
  console.log('.env file created successfully!');
  console.log('Please update the .env file with your actual values:');
  console.log('1. Set your MongoDB connection string');
  console.log('2. Set a strong JWT_SECRET');
  console.log('3. Set your Gmail credentials for email notifications');
} else {
  console.log('.env file already exists');
}

console.log('\nTo fix the 500 error:');
console.log('1. Make sure MongoDB is running');
console.log('2. Update the .env file with correct values');
console.log('3. For email functionality, set up Gmail App Password');
console.log('4. Restart the server after updating .env'); 