import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    pendingBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    transactions: [{
        type: {
            type: String,
            enum: ['CREDIT', 'DEBIT', 'PENDING'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MentoringSession'
        },
        status: {
            type: String,
            enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
            default: 'PENDING'
        },
        description: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    hourlyRate: {
        type: Number,
        required: true,
        min: 0
    },
    paymentInfo: {
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para atualizar updatedAt
walletSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Método para adicionar transação
walletSchema.methods.addTransaction = async function(type, amount, sessionId, description) {
    const transaction = {
        type,
        amount,
        sessionId,
        description,
        createdAt: new Date()
    };

    if (type === 'PENDING') {
        this.pendingBalance += amount;
    } else if (type === 'CREDIT') {
        this.balance += amount;
        if (sessionId) {
            // Procura e atualiza transação pendente relacionada
            const pendingTransaction = this.transactions.find(t => 
                t.sessionId && t.sessionId.equals(sessionId) && t.type === 'PENDING'
            );
            if (pendingTransaction) {
                pendingTransaction.status = 'COMPLETED';
                this.pendingBalance -= amount;
            }
        }
    } else if (type === 'DEBIT') {
        if (this.balance < amount) {
            throw new Error('Saldo insuficiente');
        }
        this.balance -= amount;
    }

    this.transactions.push(transaction);
    return this.save();
};

// Método para calcular valor da sessão
walletSchema.methods.calculateSessionValue = function(durationMinutes) {
    return (this.hourlyRate / 60) * durationMinutes;
};

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet; 