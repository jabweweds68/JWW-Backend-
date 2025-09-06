require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const ConnectDb = require("./DB/Db");
const router = require('./Router/Routes');

// CORS configuration - Updated to handle production deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Local development
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      
      // Add your frontend deployment URLs here
      // Replace with your actual frontend deployment URLs
      'https://your-frontend-domain.vercel.app',
      'https://your-frontend-domain.netlify.app',
      'https://your-frontend-domain.github.io',
      // Add more as needed
    ];
    
    // For development, you can also allow all origins (NOT recommended for production)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Alternative simple approach for development/testing
// Uncomment this and comment out the above corsOptions if you want to allow all origins temporarily
// app.use(cors({
//   origin: true, // This allows all origins - USE ONLY FOR DEVELOPMENT
//   credentials: true
// }));

app.use(express.json());  
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/", router);

// Enhanced server startup
const startServer = async () => {
  try {
    console.log('🚀 Starting server initialization...');
    
    // Connect to database first
    await ConnectDb();
    
    // Start server only after successful DB connection
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('Please check your database connection and try again.');
    process.exit(1);
  }
};

// Start the server
startServer();