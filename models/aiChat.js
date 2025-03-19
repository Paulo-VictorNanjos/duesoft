import mongoose from 'mongoose';

const aiChatSchema = new mongoose.Schema({
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
    conversation: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: String,
        timestamp: Date,
        feedback: {
            helpful: Boolean,
            reason: String
        },
        sources: [{
            knowledgeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'AiKnowledge'
            },
            relevance: Number
        }]
    }],
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('AiChat', aiChatSchema); 