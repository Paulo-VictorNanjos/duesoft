import mongoose from 'mongoose';

const storeItemSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Índices
storeItemSchema.index({ company: 1, name: 1 });
storeItemSchema.index({ company: 1, category: 1 });
storeItemSchema.index({ company: 1, active: 1 });

export default mongoose.model('StoreItem', storeItemSchema); 