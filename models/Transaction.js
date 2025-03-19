import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VirtualWallet',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['CREDIT', 'DEBIT', 'EARN', 'WITHDRAW'],
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
        default: 'PENDING'
    },
    description: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    relatedModel: {
        type: String
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId
    }
}, { timestamps: true });

// Índices
transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });

export default mongoose.model('Transaction', transactionSchema); 