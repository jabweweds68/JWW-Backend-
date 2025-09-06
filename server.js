require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const ConnectDb = require("./DB/Db");
const router = require('./Router/Routes');

// Simple CORS fix - put this FIRST, before any other middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() });
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/", router);

const startServer = async () => {
  try {
    await ConnectDb();
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();