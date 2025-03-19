// models/LicenseRequest.js
import mongoose from 'mongoose';

const licenseRequestSchema = new mongoose.Schema({
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
    role: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    notes: String
}, {
    timestamps: true
});

const LicenseRequest = mongoose.model('LicenseRequest', licenseRequestSchema);
export default LicenseRequest;