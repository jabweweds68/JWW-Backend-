const { model, Schema } = require('mongoose');

// Image subdocument schema
const imageSchema = new Schema({
    url: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    isCover: {
        type: Boolean,
        default: false
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

// Size with price subdocument schema
const sizeVariantSchema = new Schema({
    size: {
        type: String,
        required: true,
        enum: ['Small', 'Large'],
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const productSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    sizeVariants: {
        type: [sizeVariantSchema],
        required: true,
        validate: {
            validator: function(variants) {
                if (variants.length === 0) {
                    return false;
                }
                
                const sizes = variants.map(v => v.size);
                const uniqueSizes = [...new Set(sizes)];
                return sizes.length === uniqueSizes.length;
            },
            message: 'At least one size variant is required and sizes must be unique'
        }
    },
    images: {
        type: [imageSchema],
        validate: {
            validator: function(images) {
                // Allow up to 7 images total (1 cover + 6 body)
                if (images.length > 7) return false;
                
                // Check that there's at most 1 cover image
                const coverImages = images.filter(img => img.isCover);
                return coverImages.length <= 1;
            },
            message: 'Maximum 7 images allowed (1 cover + 6 body images)'
        },
        default: []
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Strawberry Flavour',
            'Dark Desire',
            'Vanilla Lust',
            'Bundle of 3 Flavours'
        ]
    }
}, {
    timestamps: true
});

// Virtual to get cover image
productSchema.virtual('coverImage').get(function() {
    return this.images.find(img => img.isCover) || this.images[0] || null;
});

// Virtual to get body images
productSchema.virtual('bodyImages').get(function() {
    return this.images.filter(img => !img.isCover);
});

// Instance methods
productSchema.methods.getImageById = function(imageId) {
    return this.images.id(imageId);
};

productSchema.methods.removeImageById = function(imageId) {
    const imageToRemove = this.images.id(imageId);
    if (imageToRemove) {
        this.images.pull(imageId);
        return {
            product: this.save(),
            removedImage: imageToRemove
        };
    }
    return null;
};

productSchema.methods.setCoverImage = function(imageId) {
    // Remove cover flag from all images
    this.images.forEach(img => {
        img.isCover = false;
    });
    
    // Set the specified image as cover
    const newCoverImage = this.images.id(imageId);
    if (newCoverImage) {
        newCoverImage.isCover = true;
        return this.save();
    }
    throw new Error('Image not found');
};

productSchema.methods.addSizeVariant = function(size, price, stock = 0, isAvailable = true) {
    const existingVariant = this.sizeVariants.find(variant => variant.size === size);
    if (existingVariant) {
        throw new Error(`Size variant '${size}' already exists`);
    }
    
    this.sizeVariants.push({
        size,
        price,
        isAvailable
    });
    
    return this.save();
};

productSchema.methods.removeSizeVariant = function(variantId) {
    this.sizeVariants.pull(variantId);
    return this.save();
};

productSchema.methods.updateSizeVariant = function(variantId, updates) {
    const variant = this.sizeVariants.id(variantId);
    if (!variant) {
        throw new Error('Size variant not found');
    }
    
    Object.assign(variant, updates);
    return this.save();
};

module.exports = model('Product', productSchema);