const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Products = require("../Controller/ProductController");
const Orders = require("../Controller/OrderController");
const Login=require("../Auth/Login");

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// MULTER SETUP FOR PRODUCTS
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productDir = path.join(__dirname, "../uploads/Products");
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }
    cb(null, productDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // console.log('File filter - Field name:', file.fieldname, 'Mimetype:', file.mimetype);

  // Allow both 'images' and 'image' field names
  const allowedFieldNames = ['images', 'image'];
  if (!allowedFieldNames.includes(file.fieldname)) {
    // console.log('Unexpected field name:', file.fieldname);
    return cb(new Error(`Unexpected field: ${file.fieldname}. Expected field name: 'images' or 'image'`), false);
  }

  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const productUpload = multer({
  storage: productStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 7 // Max 7 files
  }
});

// Enhanced error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  // console.log('Multer middleware error check:');
  // console.log('Error:', err);
  // console.log('Request files:', req.files);
  // console.log('Request body:', req.body);

  if (err instanceof multer.MulterError) {
    // console.log('Multer Error Details:', {
    //   code: err.code,
    //   message: err.message,
    //   field: err.field
    // });

    let message = 'File upload error';

    switch (err.code) {
      case 'UNEXPECTED_FIELD':
        message = `Unexpected field: ${err.field}. Expected field name: 'images'`;
        break;
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large. Maximum 5MB per file.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum 7 files allowed.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected file field: ${err.field}`;
        break;
      default:
        message = err.message;
    }

    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: message,
      code: err.code
    });
  } else if (err) {
    // console.log('Other Error:', err.message);
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  }
  next();
};

// ===== PRODUCT STORE ROUTES =====
router.get("/GetProducts", Products.getAllProducts);
router.get("/SingleProduct", Products.getProductById);
router.get("/DeleteProduct", Products.deleteProduct);
router.get("/Product", Products.getProductById);
router.get("/SearchProducts", Products.searchProducts);
router.get("/SimilarProducts", Products.getProductsByCategory);
router.get("/ValidOptions", Products.getValidOptions);

// CREATE AND UPDATE ROUTES with enhanced error handling
router.post("/CreateProduct",
  productUpload.array("images", 7), // Multer MUST come first
  handleMulterError,
  Products.createProduct
);

router.post("/UpdateProduct",
  productUpload.array("images", 4),
  handleMulterError,
  Products.updateProduct
);

// ===== SIZE VARIANT MANAGEMENT ROUTES =====
router.post("/AddSizeVariant", Products.addSizeVariant);
router.post("/UpdateSizeVariant", Products.updateSizeVariant);
router.post("/DeleteSizeVariant", Products.deleteSizeVariant);

// IMAGE MANAGEMENT ROUTES
router.post("/AddImageToProduct",
  productUpload.array("images", 4),
  handleMulterError,
  Products.addImageToProduct
);

router.post("/DeleteImageFromProduct", Products.deleteImageFromProduct);

router.post("/UpdateImageInProduct",
  productUpload.single("image"), // Note: single image here
  handleMulterError,
  Products.updateImageInProduct
);

router.get("/GetProductImages", (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented yet. Use SingleProduct to get images with IDs."
  });
});

// DASHBOARD ROUTES
router.get("/GetAllProducts", Products.getAllProductsForDashboard);

// ===== ORDER ROUTES =====
// IMPORTANT: Put specific routes BEFORE parameterized routes to avoid conflicts

// GET /orders/stats - Get order statistics (MUST come before /:id route)
router.get('/orders/stats', Orders.getOrderStats);

// GET /orders - Get all orders with optional filtering and pagination
router.get('/orders', Orders.getAllOrders);

// POST /orders - Create a new order
router.post('/orders', Orders.createOrder);

// GET /orders/:id - Get single order by ID (MUST come after specific routes like /stats)
router.get('/orders/:id', Orders.getOrderById);

// PUT /orders/:id - Update order
router.put('/orders/:id', Orders.updateOrder);

// DELETE /orders/:id - Delete order
router.delete('/orders/:id', Orders.deleteOrder);

// Additional order item management routes
router.post('/orders/:id/items', Orders.addItemToOrder);
router.delete('/orders/:id/items/:itemId', Orders.removeItemFromOrder);
router.put('/orders/:id/items/:itemId', Orders.updateOrderItem);

// Legacy routes (keeping for backward compatibility if needed)
router.post('/Order', Orders.createOrder);
router.get('/ALlOrders', Orders.getAllOrders);
router.get('/stats', Orders.getOrderStats);


// Auth
router.post("/AdminLogin", Login.Adminlogin);
module.exports = router;