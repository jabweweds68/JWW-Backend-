require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const ConnectDb = require("./DB/Db");
const router = require('./Router/Routes');

// Debug: Check if environment variables are loaded
// console.log('🔍 Environment check:');
// console.log('MongoDbUrl exists:', !!process.env.MongoDbUrl);
// console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');

// CORS middleware
// app.use(cors({
//   origin: [
//     'http://127.0.0.1:5501',
//     'http://localhost:5501',
//     'http://127.0.0.1:5500', // Common Live Server ports
//     'http://localhost:5500'
//   ],
//   credentials: true
// }));
// app.use(cors());
app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conditional body parsing - CRITICAL FIX
// app.use((req, res, next) => {
//   // Skip body parsing for multipart/form-data - let multer handle it
//   const contentType = req.headers['content-type'];
//   if (contentType && contentType.includes('multipart/form-data')) {
//     console.log('Skipping body parsing for multipart request');
//     return next();
//   }

//   // Use built-in parsers for other content types
//   // console.log('Using standard body parsing for:', contentType);
//   express.json()(req, res, () => {
//     express.urlencoded({ extended: true })(req, res, next);
//   });
// });

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/", router);

// Enhanced server startup
const startServer = async () => {
  try {
    // console.log('🚀 Starting server initialization...');

    // Connect to database first
    await ConnectDb();

    // Start server only after successful DB connection
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('Please check your database connection and try again.');
    process.exit(1);
  }
};

// Start the server
startServer();