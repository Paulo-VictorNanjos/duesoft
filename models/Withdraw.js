import mongoose from 'mongoose';

const withdrawSchema = new mongoose.Schema({
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
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    fee: {
        type: Number,
        required: true,
        min: 0
    },
    method: {
        type: String,
        enum: ['bankTransfer', 'pix'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    paymentDetails: {
        bankTransfer: {
            bank: String,
            agency: String,
            account: String,
            accountType: {
                type: String,
                enum: ['checking', 'savings']
            },
            holderName: String,
            holderDocument: String
        },
        pix: {
            key: String,
            keyType: {
                type: String,
                enum: ['cpf', 'cnpj', 'email', 'phone', 'random']
            }
        }
    },
    approvedAt: Date,
    completedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    notes: String
}, {
    timestamps: true
});

// Índices
withdrawSchema.index({ company: 1, status: 1 });
withdrawSchema.index({ user: 1, status: 1 });
withdrawSchema.index({ createdAt: -1 });

// Métodos estáticos
withdrawSchema.statics.findPending = function(companyId) {
    return this.find({ 
        company: companyId,
        status: 'pending'
    }).sort({ createdAt: 1 });
};

withdrawSchema.statics.findByUser = function(userId) {
    return this.find({ user: userId })
        .sort({ createdAt: -1 });
};

// Métodos de instância
withdrawSchema.methods.approve = async function(adminId) {
    this.status = 'approved';
    this.approvedAt = new Date();
    await this.save();
};

withdrawSchema.methods.complete = async function() {
    this.status = 'completed';
    this.completedAt = new Date();
    await this.save();
};

withdrawSchema.methods.reject = async function(reason) {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    await this.save();
};

// Middleware para validar detalhes do pagamento
withdrawSchema.pre('save', function(next) {
    if (this.method === 'bankTransfer') {
        const { bank, agency, account, accountType, holderName, holderDocument } = this.paymentDetails.bankTransfer;
        if (!bank || !agency || !account || !accountType || !holderName || !holderDocument) {
            next(new Error('Dados bancários incompletos'));
            return;
        }
    } else if (this.method === 'pix') {
        const { key, keyType } = this.paymentDetails.pix;
        if (!key || !keyType) {
            next(new Error('Dados do PIX incompletos'));
            return;
        }
    }
    next();
});

const Withdraw = mongoose.model('Withdraw', withdrawSchema);

export default Withdraw; 