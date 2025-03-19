import mongoose from 'mongoose';

const paymentInfoSchema = new mongoose.Schema({
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
    pixKeys: [{
        type: {
            type: String,
            enum: ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'],
            required: true
        },
        key: {
            type: String,
            required: true
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    bankAccounts: [{
        bankName: {
            type: String,
            required: true
        },
        bankCode: {
            type: String,
            required: true
        },
        agency: {
            type: String,
            required: true
        },
        account: {
            type: String,
            required: true
        },
        accountType: {
            type: String,
            enum: ['CHECKING', 'SAVINGS'],
            required: true
        },
        document: {
            type: String,
            required: true
        },
        holderName: {
            type: String,
            required: true
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }]
}, { timestamps: true });

// Índices
paymentInfoSchema.index({ user: 1, company: 1 }, { unique: true });

// Middleware para garantir apenas um método padrão
paymentInfoSchema.pre('save', function(next) {
    // Garantir apenas uma chave PIX padrão
    const defaultPixKeys = this.pixKeys.filter(key => key.isDefault);
    if (defaultPixKeys.length > 1) {
        const lastDefault = defaultPixKeys[defaultPixKeys.length - 1];
        this.pixKeys.forEach(key => {
            if (key !== lastDefault) key.isDefault = false;
        });
    }

    // Garantir apenas uma conta bancária padrão
    const defaultBankAccounts = this.bankAccounts.filter(acc => acc.isDefault);
    if (defaultBankAccounts.length > 1) {
        const lastDefault = defaultBankAccounts[defaultBankAccounts.length - 1];
        this.bankAccounts.forEach(acc => {
            if (acc !== lastDefault) acc.isDefault = false;
        });
    }

    next();
});

export default mongoose.model('PaymentInfo', paymentInfoSchema); 