const { Schema, model } = require('mongoose');

// Order item schema remains the same
const orderItemSchema = new Schema({
    image: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    size: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: true });

// Updated main order schema
const orderSchema = new Schema({
    orderId: {
        type: String,
        unique: true,
        required: true,
        default: function() {
            // Generate a unique order ID
            return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        }
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: function(items) {
                return items.length > 0;
            },
            message: 'Order must contain at least one item'
        }
    },
    totalCartPrice: {
        type: Number,
        min: 0
    }
}, {
    timestamps: true
});

// Method to calculate total cart price
orderSchema.methods.calculateTotal = function() {
    const total = this.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);
    
    this.totalCartPrice = total;
    return total;
};

// Pre-save middleware to auto-calculate total
orderSchema.pre('save', function(next) {
    this.calculateTotal();
    next();
});

module.exports = model('Order', orderSchema);