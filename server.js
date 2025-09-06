require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const ConnectDb = require("./DB/Db");
const router = require('./Router/Routes');

// SIMPLE CORS FIX - Allow all origins for now
app.use(cors({
  origin: true, // This allows ALL origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Alternative more specific CORS (use this after testing)
// app.use(cors({
//   origin: [
//     'http://localhost:5173',
//     'http://127.0.0.1:5173',
//     'http://localhost:3000',
//     'http://127.0.0.1:3000',
//     // Add your production frontend URL here when you deploy
//   ],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
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
      console.log(`CORS enabled for all origins (development mode)`);
    });
    
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('Please check your database connection and try again.');
    process.exit(1);
  }
};

// Start the server
startServer();