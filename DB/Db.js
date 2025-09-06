const mongoose = require('mongoose');

const Url = process.env.MongoDbUrl;

const ConnectDb = async () => {
    try {
        // Debug: Check if environment variable is loaded
        if (!Url) {
            throw new Error('MongoDbUrl environment variable is not defined');
        }
        
        // console.log('Attempting to connect to MongoDB...');
        // console.log('Connection URL (masked):', Url.replace(/\/\/.*@/, '//***:***@'));
        
        // Simplified connection options (removed incompatible options)
        await mongoose.connect(Url, {
            serverSelectionTimeoutMS: 30000, // 30 seconds
            socketTimeoutMS: 45000,          // 45 seconds
            connectTimeoutMS: 30000,         // 30 seconds
            maxPoolSize: 10,                 // Connection pool size
        });
        
        // console.log('MongoDB connected successfully');
        
    } catch (err) {
        console.error('Database Connection Error:', err);
        throw err; // Re-throw to handle in server.js
    }
};

// Add connection event listeners for better debugging
mongoose.connection.on('connected', () => {
    // console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    // console.log('Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});

module.exports = ConnectDb;