require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const ConnectDb = require("./DB/Db");
const router = require('./Router/Routes');



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (works without database)
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Database health check
app.get('/db-status', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    readyState: mongoose.connection.readyState
  });
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const startServer = async () => {
  try {
    // Start server first
    const PORT = process.env.PORT || 8000;
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Then try to connect to database
    try {
      console.log('Connecting to database...');
      await ConnectDb();
      console.log('Database connected successfully');
      
      // Add routes only after successful DB connection
      app.use("/", router);
      console.log('Routes loaded successfully');
      
    } catch (dbError) {
      console.error('Database connection failed:', dbError.message);
      
      // Add a fallback route for database errors
      app.use("/", (req, res) => {
        res.status(503).json({
          success: false,
          message: 'Database connection unavailable',
          error: 'Service temporarily unavailable'
        });
      });
    }

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();