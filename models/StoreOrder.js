import mongoose from 'mongoose';

const storeOrderSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreItem',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'refunded'],
        default: 'pending'
    },
    deliveryStatus: {
        type: String,
        enum: [
            'awaiting_approval',   // Aguardando aprovação do admin
            'processing',          // Pedido em processamento
            'ready',              // Pronto para entrega/disponibilização
            'delivered',          // Entregue/disponibilizado
            'cancelled'           // Cancelado
        ],
        default: 'awaiting_approval'
    },
    deliveryDetails: {
        requestedAt: Date,
        processedAt: Date,
        readyAt: Date,
        deliveredAt: Date,
        cancelledAt: Date,
        notes: String,
        adminNotes: String,
        deliveryMethod: {
            type: String,
            enum: ['digital', 'physical', 'service'],
            default: 'digital'
        },
        trackingCode: String,
        deliveryUrl: String
    }
}, { timestamps: true });

// Índices
storeOrderSchema.index({ company: 1, user: 1 });
storeOrderSchema.index({ company: 1, item: 1 });
storeOrderSchema.index({ company: 1, status: 1 });
storeOrderSchema.index({ company: 1, deliveryStatus: 1 });
storeOrderSchema.index({ createdAt: -1 });

// Método para atualizar status de entrega
storeOrderSchema.methods.updateDeliveryStatus = function(newStatus, notes) {
    this.deliveryStatus = newStatus;
    
    // Atualizar timestamp correspondente
    const timestamp = new Date();
    switch (newStatus) {
        case 'processing':
            this.deliveryDetails.processedAt = timestamp;
            break;
        case 'ready':
            this.deliveryDetails.readyAt = timestamp;
            break;
        case 'delivered':
            this.deliveryDetails.deliveredAt = timestamp;
            break;
        case 'cancelled':
            this.deliveryDetails.cancelledAt = timestamp;
            break;
    }

    if (notes) {
        this.deliveryDetails.adminNotes = notes;
    }

    return this.save();
};

export default mongoose.model('StoreOrder', storeOrderSchema); 