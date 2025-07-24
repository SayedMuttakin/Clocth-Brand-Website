const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const colorAnalyticsRoutes = require('./routes/colorAnalyticsRoutes');
const sizeAnalyticsRoutes = require('./routes/sizeAnalyticsRoutes');
const productAnalyticsRoutes = require('./routes/productAnalyticsRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const settingRoutes = require('./routes/settingRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const cookieParser = require('cookie-parser');

// Add Socket.IO
const { Server } = require('socket.io');

dotenv.config();

// Debug: Check if email environment variables are loaded


const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:5173', 'http://localhost:5174'];

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io instance available globally
global.io = io;
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Admin panel: Socket.IO client connected', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket.IO client disconnected', socket.id);
  });
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route for Render
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/color-analytics', colorAnalyticsRoutes);
app.use('/api/size-analytics', sizeAnalyticsRoutes);
app.use('/api/product-analytics', productAnalyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingRoutes);

// Serve static files in production


// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  }); 