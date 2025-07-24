# E-commerce Backend

This is the backend server for the e-commerce application.

## Folder Structure

```
backend/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utility functions
├── uploads/         # File uploads
├── .env             # Environment variables
├── .gitignore       # Git ignore file
├── package.json     # Project dependencies
└── server.js        # Main server file
```

## API Endpoints

### Auth Routes
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout

### Product Routes
- GET /api/products
- GET /api/products/:id
- POST /api/products (Admin)
- PUT /api/products/:id (Admin)
- DELETE /api/products/:id (Admin)

### Category Routes
- GET /api/categories
- GET /api/categories/:id/products
- POST /api/categories (Admin)
- PUT /api/categories/:id (Admin)
- DELETE /api/categories/:id (Admin)

### Order Routes
- GET /api/orders (Admin)
- GET /api/orders/user
- POST /api/orders
- PUT /api/orders/:id/status (Admin)

### User Routes
- GET /api/users/profile
- PUT /api/users/profile
- GET /api/users (Admin)

## Stripe Payment Integration

1. Install dependencies (already in package.json):
   - `stripe`
2. Set your Stripe secret key in a `.env` file in the backend directory:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   ```
   Replace with your real Stripe secret key from the Stripe dashboard (test mode recommended for development).
3. The backend exposes a POST `/api/orders/create-payment-intent` endpoint for creating payment intents.

## Setup Instructions

1. Install dependencies:
   ```