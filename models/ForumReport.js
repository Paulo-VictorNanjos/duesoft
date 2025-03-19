import mongoose from 'mongoose';

const forumReportSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['topic', 'reply']
    },
    reason: {
        type: String,
        required: [true, 'O motivo da denúncia é obrigatório'],
        enum: [
            'spam',
            'inappropriate',
            'offensive',
            'harassment',
            'incorrect',
            'duplicate',
            'other'
        ]
    },
    description: {
        type: String,
        required: [true, 'A descrição da denúncia é obrigatória'],
        trim: true,
        minlength: [10, 'A descrição deve ter no mínimo 10 caracteres']
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic'
    },
    reply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReply'
    },
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    moderatorNotes: {
        type: String,
        trim: true
    },
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    moderatedAt: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices
forumReportSchema.index({ company: 1, status: 1, createdAt: -1 });
forumReportSchema.index({ topic: 1 });
forumReportSchema.index({ reply: 1 });
forumReportSchema.index({ reporter: 1 });

// Validação personalizada
forumReportSchema.pre('validate', function(next) {
    if (this.type === 'topic' && !this.topic) {
        next(new Error('Topic ID is required for topic reports'));
    } else if (this.type === 'reply' && !this.reply) {
        next(new Error('Reply ID is required for reply reports'));
    } else {
        next();
    }
});

// Middleware para atualizar timestamps
forumReportSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status !== 'pending') {
        this.moderatedAt = Date.now();
    }
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
forumReportSchema.statics.getPendingReports = async function(companyId, limit = 10) {
    return this.find({
        company: companyId,
        status: 'pending',
        isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reporter', 'name avatar')
    .populate('topic')
    .populate('reply');
};

forumReportSchema.statics.getReportStats = async function(companyId) {
    return this.aggregate([
        { $match: { company: mongoose.Types.ObjectId(companyId) } },
        { $group: {
            _id: '$status',
            count: { $sum: 1 }
        }},
        { $project: {
            status: '$_id',
            count: 1,
            _id: 0
        }}
    ]);
};

// Métodos de instância
forumReportSchema.methods.moderate = async function(status, moderatorId, notes = '') {
    this.status = status;
    this.moderatorNotes = notes;
    this.moderatedBy = moderatorId;
    this.moderatedAt = Date.now();
    
    // Se aprovado, toma ação no conteúdo reportado
    if (status === 'approved') {
        if (this.type === 'topic') {
            const Topic = mongoose.model('ForumTopic');
            await Topic.findByIdAndUpdate(this.topic, {
                isActive: false
            });
        } else if (this.type === 'reply') {
            const Reply = mongoose.model('ForumReply');
            await Reply.findByIdAndUpdate(this.reply, {
                isActive: false
            });
        }
    }
    
    return this.save();
};

const ForumReport = mongoose.model('ForumReport', forumReportSchema);

export default ForumReport; 