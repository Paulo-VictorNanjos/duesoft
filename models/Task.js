import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pendente', 'em_andamento', 'concluida', 'cancelada'],
        default: 'pendente'
    },
    priority: {
        type: String,
        enum: ['baixa', 'media', 'alta'],
        default: 'media'
    },
    dueDate: {
        type: Date
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    category: {
        type: String,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    attachments: [{
        name: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    }],
    comments: [{
        text: String,
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    completedAt: Date,
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Índices para melhorar a performance das consultas
taskSchema.index({ company: 1, status: 1 });
taskSchema.index({ company: 1, assignedTo: 1 });
taskSchema.index({ company: 1, createdBy: 1 });
taskSchema.index({ dueDate: 1 }, { sparse: true });

const Task = mongoose.model('Task', taskSchema);

export default Task; 