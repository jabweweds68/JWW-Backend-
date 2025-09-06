const Product = require('../Model/Product');
const fs = require('fs');
const path = require('path');

// Helper function to parse size variants safely
const parseSizeVariants = (sizeVariants) => {
    try {
        if (Array.isArray(sizeVariants)) {
            return sizeVariants;
        }
        if (typeof sizeVariants === 'string') {
            return JSON.parse(sizeVariants);
        }
        return [];
    } catch (error) {
        // console.log('Error parsing size variants:', error);
        return [];
    }
};

// Helper function to validate size variants
const validateSizeVariants = (variants) => {
    if (!Array.isArray(variants) || variants.length === 0) {
        return { valid: false, message: 'At least one size variant is required' };
    }
    
    const validSizes = ['Small', 'Large'];
    const sizes = [];
    
    for (const variant of variants) {
        if (!variant.size || !validSizes.includes(variant.size)) {
            return { valid: false, message: `Size must be either "Small" or "Large"` };
        }
        
        if (!variant.price || isNaN(variant.price) || parseFloat(variant.price) < 0) {
            return { valid: false, message: `Valid price is required for size ${variant.size}` };
        }
        
        if (sizes.includes(variant.size)) {
            return { valid: false, message: `Duplicate size: ${variant.size}` };
        }
        
        sizes.push(variant.size);
    }
    
    return { valid: true };
};

// Helper function to validate category
const validateCategory = (category) => {
    const validCategories = [
        'Strawberry Flavour',
        'Dark Desire',
        'Vanilla Lust',
        'Bundle of 3 Flavours'
    ];
    return validCategories.includes(category);
};

// Helper function to delete file from disk
const deleteFileFromDisk = (filename) => {
    const filePath = path.join(__dirname, '../uploads/Products', filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        // console.log('Deleted Product image file:', filename);
        return true;
    }
    return false;
};

// GET ALL PRODUCTS
const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const filters = {};
        if (req.query.category) filters.category = req.query.category;
        
        // Price filtering now works on size variants
        if (req.query.minPrice || req.query.maxPrice) {
            const priceFilter = {};
            if (req.query.minPrice) priceFilter.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) priceFilter.$lte = parseFloat(req.query.maxPrice);
            
            filters['sizeVariants.price'] = priceFilter;
        }
        
        const products = await Product.find(filters)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
            
        const total = await Product.countDocuments(filters);
        
        res.status(200).json({
            success: true,
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
};

// GET ALL PRODUCTS FOR DASHBOARD
const getAllProductsForDashboard = async (req, res) => {
    try {
        const filters = {};
        if (req.query.category) filters.category = req.query.category;
        
        if (req.query.minPrice || req.query.maxPrice) {
            const priceFilter = {};
            if (req.query.minPrice) priceFilter.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) priceFilter.$lte = parseFloat(req.query.maxPrice);
            
            filters['sizeVariants.price'] = priceFilter;
        }
        
        if (req.query.search) {
            filters.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        const products = await Product.find(filters)
            .sort({ createdAt: -1 });
        
        const total = products.length;
        
        res.status(200).json({
            success: true,
            products,
            total,
            message: `Found ${total} products`
        });
        
    } catch (error) {
        console.error('Error fetching all products for dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
};

// GET SINGLE PRODUCT
const getProductById = async (req, res) => {
    try {
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }
        
        const product = await Product.findById(id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.status(200).json({
            success: true,
            product
        });
        
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product',
            error: error.message
        });
    }
};

// CREATE PRODUCT
const createProduct = async (req, res) => {
    try {
        // console.log('Creating product with request body:', req.body);
        
        const { title, description, sizeVariants, category } = req.body;
        
        // Parse size variants
        const parsedSizeVariants = parseSizeVariants(sizeVariants);
        // console.log('Parsed size variants:', parsedSizeVariants);
        
        // Validate size variants
        const validation = validateSizeVariants(parsedSizeVariants);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }
        
        // Validate category
        if (!validateCategory(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }
        
        // Process uploaded images
        const images = req.files ? req.files.map(file => ({
            url: `/uploads/Products/${file.filename}`,
            filename: file.filename
        })) : [];
        
        // Create product
        const newProduct = new Product({
            title: title.trim(),
            description: description.trim(),
            sizeVariants: parsedSizeVariants.map(variant => ({
                size: variant.size,
                price: parseFloat(variant.price),
                isAvailable: variant.isAvailable !== false // default to true
            })),
            images,
            category: category.trim()
        });
        
        const savedProduct = await newProduct.save();
        
        res.status(201).json({
            success: true,
            message: `Product created successfully with ${images.length} image(s) and ${parsedSizeVariants.length} size variant(s)`,
            product: savedProduct
        });
        
    } catch (error) {
        console.error('Error creating product:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                deleteFileFromDisk(file.filename);
            });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
    try {
        // console.log('Updating product...');
        // console.log('Request Body:', req.body);
        
        const { id, title, description, sizeVariants, category } = req.body;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }
        
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const updateData = {};
        
        if (title) updateData.title = title.trim();
        if (description) updateData.description = description.trim();
        if (category) {
            if (!validateCategory(category.trim())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category'
                });
            }
            updateData.category = category.trim();
        }
        
        // Handle size variants update
        if (sizeVariants) {
            const parsedSizeVariants = parseSizeVariants(sizeVariants);
            const validation = validateSizeVariants(parsedSizeVariants);
            
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }
            
            updateData.sizeVariants = parsedSizeVariants.map(variant => ({
                size: variant.size,
                price: parseFloat(variant.price),
                stock: parseInt(variant.stock) || 0,
                isAvailable: variant.isAvailable !== false
            }));
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });
        
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product',
            error: error.message
        });
    }
};

// ADD SIZE VARIANT TO EXISTING PRODUCT
const addSizeVariant = async (req, res) => {
    try {
        const { productId, size, price, stock = 0, isAvailable = true } = req.body;
        
        if (!productId || !size || price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Product ID, size, and price are required'
            });
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const updatedProduct = await product.addSizeVariant(size, parseFloat(price), parseInt(stock));
        
        res.status(200).json({
            success: true,
            message: `Size variant '${size}' added successfully`,
            product: updatedProduct
        });
        
    } catch (error) {
        console.error('Error adding size variant:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding size variant',
            error: error.message
        });
    }
};


const updateSizeVariant = async (req, res) => {
    try {
        const { productId, sizeVariants } = req.body;
        // console.log('productId:', productId);
        // console.log('sizeVariants:', sizeVariants);
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Handle both array and string formats
        let parsedSizeVariants;
        if (Array.isArray(sizeVariants)) {
            parsedSizeVariants = sizeVariants;
        } else {
            parsedSizeVariants = parseSizeVariants(sizeVariants);
        }
        
        const validation = validateSizeVariants(parsedSizeVariants);
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }
        
        // Update the size variants
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            {
                sizeVariants: parsedSizeVariants.map(variant => ({
                    size: variant.size,
                    price: parseFloat(variant.price),
                    isAvailable: variant.isAvailable !== false
                }))
            },
            { new: true, runValidators: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'Size variants updated successfully',
            product: updatedProduct
        });
        
    } catch (error) {
        console.error('Error updating size variants:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating size variants',
            error: error.message
        });
    }
};
// DELETE SIZE VARIANT
const deleteSizeVariant = async (req, res) => {
    try {
        const { productId, variantId } = req.body;
        
        if (!productId || !variantId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and variant ID are required'
            });
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const updatedProduct = await product.removeSizeVariant(variantId);
        
        res.status(200).json({
            success: true,
            message: 'Size variant deleted successfully',
            product: updatedProduct
        });
        
    } catch (error) {
        console.error('Error deleting size variant:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting size variant',
            error: error.message
        });
    }
};

// GET PRODUCTS BY CATEGORY
const getProductsByCategory = async (req, res) => {
    try {
        const Category = req.query.category;
        
        if (!Category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }
        
        const products = await Product.find({
            category: { 
                $regex: new RegExp(`^${Category}$`, 'i') 
            }
        }).sort({ createdAt: -1 });
        
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No products found in category: ${Category}`,
                products: []
            });
        }
        
        res.status(200).json({
            success: true,
            message: `Products retrieved successfully for category: ${Category}`,
            category: Category,
            count: products.length,
            products: products
        });
        
    } catch (error) {
        console.error('Error getting products by category:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving products by category',
            error: error.message
        });
    }
};

// ADD IMAGE TO PRODUCT
const addImageToProduct = async (req, res) => {
    try {
        // console.log('Adding image to product...');
        // console.log('Request body:', req.body);
        // console.log('Uploaded files:', req.files);
        
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one image file is required'
            });
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        if (product.images.length + req.files.length > 4) {
            req.files.forEach(file => {
                deleteFileFromDisk(file.filename);
            });
            
            return res.status(400).json({
                success: false,
                message: `Cannot add ${req.files.length} images. Product currently has ${product.images.length} images. Maximum is 4.`
            });
        }
        
        const addedImages = [];
        for (const file of req.files) {
            const imageData = {
                url: `/uploads/Products/${file.filename}`,
                filename: file.filename
            };
            product.images.push(imageData);
            addedImages.push(imageData);
        }
        
        const updatedProduct = await product.save();
        
        res.status(200).json({
            success: true,
            message: `${addedImages.length} image(s) added successfully`,
            product: updatedProduct,
            addedImages: addedImages
        });
        
    } catch (error) {
        console.error('Error adding image to product:', error);
        
        if (req.files) {
            req.files.forEach(file => {
                deleteFileFromDisk(file.filename);
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error adding image to product',
            error: error.message
        });
    }
};

// DELETE SPECIFIC IMAGE FROM PRODUCT
const deleteImageFromProduct = async (req, res) => {
    try {
        const { productId, imageId } = req.body;
        
        if (!productId || !imageId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and Image ID are required'
            });
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const imageToDelete = product.getImageById(imageId);
        if (!imageToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
        
        deleteFileFromDisk(imageToDelete.filename);
        
        const result = product.removeImageById(imageId);
        const updatedProduct = await result.product;
        
        res.status(200).json({
            success: true,
            message: 'Image deleted successfully',
            product: updatedProduct,
            deletedImage: result.removedImage
        });
        
    } catch (error) {
        console.error('Error deleting image from product:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image from product',
            error: error.message
        });
    }
};

// UPDATE SPECIFIC IMAGE IN PRODUCT
const updateImageInProduct = async (req, res) => {
    try {
        // console.log('Updating image in product...');
        // console.log('Request body:', req.body);
        // console.log('Uploaded file:', req.file);
        
        const { productId, imageId } = req.body;
        
        if (!productId || !imageId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and Image ID are required'
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Exactly one image file is required for update'
            });
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            deleteFileFromDisk(req.file.filename);
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const existingImage = product.getImageById(imageId);
        if (!existingImage) {
            deleteFileFromDisk(req.file.filename);
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
        
        deleteFileFromDisk(existingImage.filename);
        
        existingImage.url = `/uploads/Products/${req.file.filename}`;
        existingImage.filename = req.file.filename;
        existingImage.uploadedAt = new Date();
        
        const updatedProduct = await product.save();
        
        res.status(200).json({
            success: true,
            message: 'Image updated successfully',
            product: updatedProduct,
            updatedImage: existingImage
        });
        
    } catch (error) {
        console.error('Error updating image in product:', error);
        
        if (req.file) {
            deleteFileFromDisk(req.file.filename);
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating image in product',
            error: error.message
        });
    }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
    try {
        const id = req.query.id;
        // console.log("product id", id);
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }
                
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Delete associated images from disk
        product.images.forEach(image => {
            deleteFileFromDisk(image.filename);
        });
                
        await Product.findByIdAndDelete(id);
                
        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
            
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
};

// SEARCH PRODUCTS
const searchProducts = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        const products = await Product.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            products,
            count: products.length
        });
        
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching products',
            error: error.message
        });
    }
};

// GET VALID CATEGORIES AND SIZES (UTILITY ENDPOINT)
const getValidOptions = async (req, res) => {
    try {
        const validCategories = [
            'Strawberry Flavour',
            'Dark Desire',
            'Vanilla Lust',
            'Bundle of 3 Flavours'
        ];
        const validSizes = ['Small', 'Large'];
        
        res.status(200).json({
            success: true,
            validCategories,
            validSizes
        });
    } catch (error) {
        console.error('Error getting valid options:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting valid options',
            error: error.message
        });
    }
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    deleteProduct,
    searchProducts,
    getProductsByCategory,
    getValidOptions,
    updateProduct,
    addImageToProduct,
    deleteImageFromProduct,
    updateImageInProduct,
    getAllProductsForDashboard,
    addSizeVariant,
    updateSizeVariant,
    deleteSizeVariant
};