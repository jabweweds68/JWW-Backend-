// Controller/AdminController.js
const jwt = require('jsonwebtoken');

const Adminlogin = async(req, res) => {
  try {
    console.log('Admin login attempt:', req.body); // Debug log
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      // console.log('Missing email or password');
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    
    // Check credentials against environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;
    
    // console.log('Environment variables check:');
    // console.log('ADMIN_EMAIL exists:', !!adminEmail);
    // console.log('ADMIN_PASSWORD exists:', !!adminPassword);
    // console.log('JWT_SECRET exists:', !!jwtSecret);
    
    // Check if environment variables are set
    if (!adminEmail || !adminPassword || !jwtSecret) {
      console.error('Missing environment variables');
      return res.status(500).json({
        success: false,
        message: "Server configuration error - missing environment variables",
      });
    }
    
    // console.log('Comparing credentials:');
    // console.log('Received email:', email);
    // console.log('Expected email:', adminEmail);
    // console.log('Passwords match:', password === adminPassword);
    
    if (email !== adminEmail || password !== adminPassword) {
      // console.log('Invalid credentials provided');
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    
    // console.log('Credentials validated, generating token...');
    
    // Generate JWT token for admin
    const token = jwt.sign(
      {
        email: adminEmail,
        role: "admin",
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      }
    );
    
    // console.log('Token generated successfully');
    
    // Send success response
    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        token,
        admin: {
          email: adminEmail,
          role: "admin",
        },
      },
    });
    
    // console.log('Success response sent');
    
  } catch (err) {
    // console.error('Admin login error details:', err);
    console.log('Admin login error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + err.message
    });
  }
};

module.exports = { Adminlogin };