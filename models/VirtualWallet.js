import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['CREDIT', 'DEBIT', 'WITHDRAW', 'REFUND'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: String,
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
        default: 'COMPLETED'
    },
    reference: {
        type: String,
        enum: ['MENTORING', 'STORE', 'COURSE', 'EXAM', 'WITHDRAW', 'BONUS'],
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceModel'
    },
    referenceModel: {
        type: String,
        required: true,
        enum: ['Course', 'Exam', 'MentorSession', 'MentorRating', 'User', 'Login', 'Bonus', 'StoreOrder']
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

const virtualWalletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    pendingBalance: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastWithdraw: Date,
    withdrawSettings: {
        pixKey: String,
        bankAccount: {
            bank: String,
            agency: String,
            account: String,
            accountType: {
                type: String,
                enum: ['CHECKING', 'SAVINGS']
            }
        }
    },
    transactions: [transactionSchema]
}, { timestamps: true });

// Índices
virtualWalletSchema.index({ user: 1, company: 1 }, { unique: true });
virtualWalletSchema.index({ 'transactions.createdAt': -1 });

// Métodos
virtualWalletSchema.methods.addTransaction = async function(type, amount, reference, description, metadata = {}) {
    const transaction = {
        type,
        amount,
        reference,
        description,
        metadata,
        status: 'COMPLETED'
    };

    if (type === 'CREDIT') {
        this.balance += amount;
    } else if (type === 'DEBIT') {
        if (this.balance < amount) {
            throw new Error('Saldo insuficiente');
        }
        this.balance -= amount;
    } else if (type === 'WITHDRAW') {
        if (this.balance < amount) {
            throw new Error('Saldo insuficiente para saque');
        }
        this.balance -= amount;
        this.lastWithdraw = new Date();
    }

    this.transactions.push(transaction);
    await this.save();
    return transaction;
};

export default mongoose.model('VirtualWallet', virtualWalletSchema); 