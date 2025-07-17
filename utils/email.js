const nodemailer = require('nodemailer');
require('dotenv').config();

// Check if email configuration is available
const isEmailConfigured = () => {
  return process.env.EMAIL_USER && process.env.EMAIL_PASS;
};

let transporter = null;

// Initialize transporter function
const getTransporter = () => {
  if (!transporter) {
    if (isEmailConfigured()) {
      console.log('Attempting to initialize email transporter...');
      try {
        transporter = nodemailer.createTransport({
          service: 'gmail',
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        console.log('✅ Email transporter initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize email transporter:', error);
      }
    } else {
      console.log('❌ Email not configured - cannot create transporter');
    }
  }
  return transporter;
};

// Generic send email function
exports.sendEmail = async (options) => {
  // If email is not configured, just log and return
  if (!isEmailConfigured()) {
    console.log('Email not configured. Skipping email sending.');
    return;
  }

  const emailTransporter = getTransporter();

  if (!emailTransporter) {
    console.log('Email transporter not initialized. Skipping email sending.');
    throw new Error('Email service not available.'); // Throw error if transporter is not initialized
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"E-Commerce Admin" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || options.message.replace(/\n/g, '<br>') // Basic HTML conversion if no HTML provided
  };

  try {
    console.log('Attempting to send email...');
    await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', options.email);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error; // Re-throw to be caught by the calling function (e.g., forgotPassword)
  }
};

const getStatusMessage = (status) => {
  const messages = {
    pending: {
      title: 'Order Received',
      message: 'We have received your order and it is being processed.',
      color: '#f59e0b'
    },
    processing: {
      title: 'Order Processing',
      message: 'Your order is currently being prepared for shipment.',
      color: '#3b82f6'
    },
    shipped: {
      title: 'Order Shipped',
      message: 'Great news! Your order has been shipped and is on its way to you.',
      color: '#8b5cf6'
    },
    delivered: {
      title: 'Order Delivered',
      message: 'Your order has been successfully delivered. We hope you enjoy your purchase!',
      color: '#10b981'
    },
    cancelled: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled. If you have any questions, please contact our support team.',
      color: '#ef4444'
    }
  };
  return messages[status] || messages.pending;
};

const createEmailTemplate = (orderId, status) => {
  const statusInfo = getStatusMessage(status);
  const shortOrderId = orderId.toString().slice(-6).toUpperCase();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; margin: 10px 0; background-color: ${statusInfo.color}; }
            .order-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e5e5e5; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #1f2937; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Status Update</h1>
            </div>
            <div class="content">
                <h2>Hello!</h2>
                <p>We wanted to update you on the status of your recent order.</p>
                
                <div class="order-info">
                    <h3>Order Details</h3>
                    <p><strong>Order ID:</strong> #${shortOrderId}</p>
                    <p><strong>Status:</strong> <span class="status-badge">${status.toUpperCase()}</span></p>
                </div>
                
                <h3>${statusInfo.title}</h3>
                <p>${statusInfo.message}</p>
                
                ${status === 'shipped' ? '<p><strong>Note:</strong> You should receive your package within 3-5 business days. You will receive a tracking number shortly.</p>' : ''}
                ${status === 'delivered' ? '<p>If you have any issues with your order, please don\'t hesitate to contact our customer support team.</p>' : ''}
                
                <p>Thank you for choosing our store!</p>
            </div>
            <div class="footer">
                <p>If you have any questions about your order, please contact our customer support.</p>
                <p>&copy; 2024 E-Commerce Store. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

exports.sendOrderStatusEmail = async (to, orderId, status) => {
  // If email is not configured, just log and return
  if (!isEmailConfigured()) {
    console.log('Email not configured. Skipping email notification for order:', orderId);
    return;
  }

  // Get transporter (lazy initialization)
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.log('Email transporter not initialized. Skipping email notification for order:', orderId);
    return;
  }

  try {
    const statusInfo = getStatusMessage(status);
    const shortOrderId = orderId.toString().slice(-6).toUpperCase();
    
    const mailOptions = {
      from: `"E-Commerce Store" <${process.env.EMAIL_USER}>`,
      to,
      subject: `${statusInfo.title} - Order #${shortOrderId}`,
      text: `Hello,\n\nYour order #${shortOrderId} status has been updated to: ${status}.\n\n${statusInfo.message}\n\nThank you for shopping with us!\n\nBest regards,\nE-Commerce Store Team`,
      html: createEmailTemplate(orderId, status)
    };

    await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', to, 'for order:', shortOrderId);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // Don't throw the error, just log it
  }
};