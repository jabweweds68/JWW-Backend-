const Order = require('../Model/Orders'); // Adjust path as needed

// Create a new order
const createOrder = async (req, res) => {
    try {
        const { items } = req.body;

        // Validate required fields
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items are required'
            });
        }

        // Validate each item has required fields
        for (const item of items) {
            if (!item.image || !item.title || !item.quantity || !item.size || item.price === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Each item must have image, title, quantity, size, and price'
                });
            }
        }

        // Create order object
        const orderData = {
            items: items.map(item => ({
                image: item.image,
                title: item.title,
                quantity: item.quantity,
                size: item.size,
                price: item.price
            }))
        };

        // Create and save the order (totalCartPrice will be auto-calculated)
        const order = new Order(orderData);
        await order.save();

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

// Get all orders with optional pagination
const getAllOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const [orders, totalCount] = await Promise.all([
            Order.find()
                 .sort(sort)
                 .skip(skip)
                 .limit(parseInt(limit)),
            Order.countDocuments()
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / parseInt(limit));
        const hasNextPage = parseInt(page) < totalPages;
        const hasPrevPage = parseInt(page) > 1;

        res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCount,
                    hasNextPage,
                    hasPrevPage,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// Get single order by ID
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error.message
        });
    }
};

// Update order
const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items are required'
            });
        }

        // Find and update order
        const order = await Order.findById(id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update items
        order.items = items.map(item => ({
            image: item.image,
            title: item.title,
            quantity: item.quantity,
            size: item.size,
            price: item.price
        }));

        // Save (totalCartPrice will be auto-calculated)
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            data: order
        });

    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order',
            error: error.message
        });
    }
};

// Delete order
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findByIdAndDelete(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully',
            data: order
        });

    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order',
            error: error.message
        });
    }
};

// Add item to existing order
const addItemToOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { image, title, quantity, size, price } = req.body;

        // Validate required fields
        if (!image || !title || !quantity || !size || price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Image, title, quantity, size, and price are required'
            });
        }

        const order = await Order.findById(id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Add new item
        order.items.push({
            image,
            title,
            quantity,
            size,
            price
        });

        // Save (totalCartPrice will be auto-calculated)
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Item added to order successfully',
            data: order
        });

    } catch (error) {
        console.error('Add item to order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item to order',
            error: error.message
        });
    }
};

// Remove item from order
const removeItemFromOrder = async (req, res) => {
    try {
        const { id, itemId } = req.params;

        const order = await Order.findById(id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Find and remove item
        const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in order'
            });
        }

        // Remove item
        order.items.splice(itemIndex, 1);

        // Check if order still has items
        if (order.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove all items from order'
            });
        }

        // Save (totalCartPrice will be auto-calculated)
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Item removed from order successfully',
            data: order
        });

    } catch (error) {
        console.error('Remove item from order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from order',
            error: error.message
        });
    }
};

// Update specific item in order
const updateOrderItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { image, title, quantity, size, price } = req.body;

        const order = await Order.findById(id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Find item to update
        const item = order.items.id(itemId);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in order'
            });
        }

        // Update item fields
        if (image !== undefined) item.image = image;
        if (title !== undefined) item.title = title;
        if (quantity !== undefined) item.quantity = quantity;
        if (size !== undefined) item.size = size;
        if (price !== undefined) item.price = price;

        // Save (totalCartPrice will be auto-calculated)
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Item updated successfully',
            data: order
        });

    } catch (error) {
        console.error('Update order item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order item',
            error: error.message
        });
    }
};

// Get order statistics
const getOrderStats = async (req, res) => {
    try {
        // Get total orders
        const totalOrders = await Order.countDocuments();
        
        // Get total revenue
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalCartPrice' }
                }
            }
        ]);

        // Get average order value
        const avgOrderValue = totalOrders > 0 ? 
            (totalRevenue[0]?.total || 0) / totalOrders : 0;

        // Get recent orders
        const recentOrders = await Order.find()
                                      .sort({ createdAt: -1 })
                                      .limit(5);

        // Get monthly stats for last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalCartPrice' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalOrders,
                    totalRevenue: totalRevenue[0]?.total || 0,
                    avgOrderValue: parseFloat(avgOrderValue.toFixed(2))
                },
                recentOrders,
                monthlyStats
            }
        });

    } catch (error) {
        console.error('Get order stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order statistics',
            error: error.message
        });
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    addItemToOrder,
    removeItemFromOrder,
    updateOrderItem,
    getOrderStats
};