import mongoose from 'mongoose';

const aiKnowledgeSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    embeddings: {
        type: [Number],
        required: true,
        index: '2dsphere'
    },
    metadata: {
        sourceType: String,
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lastUpdated: Date
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Verifica se o modelo já existe antes de criar
export default mongoose.models.AiKnowledge || mongoose.model('AiKnowledge', aiKnowledgeSchema); 