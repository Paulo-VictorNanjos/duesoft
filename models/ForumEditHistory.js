import mongoose from 'mongoose';

const forumEditHistorySchema = new mongoose.Schema({
    contentType: {
        type: String,
        required: true,
        enum: ['topic', 'reply']
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic'
    },
    reply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReply'
    },
    editor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    changes: {
        title: {
            before: String,
            after: String
        },
        content: {
            before: String,
            after: String
        },
        tags: {
            before: [String],
            after: [String]
        },
        category: {
            before: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ForumCategory'
            },
            after: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ForumCategory'
            }
        }
    },
    reason: {
        type: String,
        trim: true
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        editDuration: Number // em segundos
    },
    reverted: {
        type: Boolean,
        default: false
    },
    revertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revertedAt: {
        type: Date
    },
    revertReason: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices
forumEditHistorySchema.index({ contentType: 1, topic: 1, createdAt: -1 });
forumEditHistorySchema.index({ contentType: 1, reply: 1, createdAt: -1 });
forumEditHistorySchema.index({ editor: 1, createdAt: -1 });
forumEditHistorySchema.index({ company: 1, createdAt: -1 });

// Validação personalizada
forumEditHistorySchema.pre('validate', function(next) {
    if (this.contentType === 'topic' && !this.topic) {
        next(new Error('Topic ID is required for topic edit history'));
    } else if (this.contentType === 'reply' && !this.reply) {
        next(new Error('Reply ID is required for reply edit history'));
    } else {
        next();
    }
});

// Middleware para atualizar timestamps
forumEditHistorySchema.pre('save', function(next) {
    if (this.isModified('reverted')) {
        this.revertedAt = this.reverted ? Date.now() : null;
    }
    next();
});

// Métodos estáticos
forumEditHistorySchema.statics.getHistory = async function(options = {}) {
    const query = { isActive: true };
    
    if (options.contentType && options.contentId) {
        query.contentType = options.contentType;
        query[options.contentType] = options.contentId;
    }
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('editor', 'name avatar')
        .populate('revertedBy', 'name avatar')
        .populate('changes.category.before', 'name slug')
        .populate('changes.category.after', 'name slug');
};

forumEditHistorySchema.statics.getEditorStats = async function(editorId) {
    return this.aggregate([
        { $match: { 
            editor: mongoose.Types.ObjectId(editorId),
            isActive: true
        }},
        { $group: {
            _id: '$contentType',
            count: { $sum: 1 },
            reverted: { $sum: { $cond: ['$reverted', 1, 0] } }
        }},
        { $project: {
            contentType: '$_id',
            count: 1,
            reverted: 1,
            revertRate: {
                $multiply: [
                    { $divide: ['$reverted', '$count'] },
                    100
                ]
            },
            _id: 0
        }}
    ]);
};

forumEditHistorySchema.statics.compareVersions = async function(version1Id, version2Id) {
    const [version1, version2] = await Promise.all([
        this.findById(version1Id),
        this.findById(version2Id)
    ]);
    
    if (!version1 || !version2) {
        throw new Error('Versões não encontradas');
    }
    
    if (version1.contentType !== version2.contentType || 
        version1[version1.contentType].toString() !== version2[version2.contentType].toString()) {
        throw new Error('As versões não pertencem ao mesmo conteúdo');
    }
    
    const differences = {};
    
    // Compara título
    if (version1.changes.title && version2.changes.title) {
        differences.title = {
            version1: version1.changes.title.after,
            version2: version2.changes.title.after
        };
    }
    
    // Compara conteúdo
    if (version1.changes.content && version2.changes.content) {
        differences.content = {
            version1: version1.changes.content.after,
            version2: version2.changes.content.after
        };
    }
    
    // Compara tags
    if (version1.changes.tags && version2.changes.tags) {
        differences.tags = {
            added: version2.changes.tags.after.filter(tag => 
                !version1.changes.tags.after.includes(tag)
            ),
            removed: version1.changes.tags.after.filter(tag => 
                !version2.changes.tags.after.includes(tag)
            )
        };
    }
    
    // Compara categoria
    if (version1.changes.category && version2.changes.category) {
        differences.category = {
            version1: version1.changes.category.after,
            version2: version2.changes.category.after
        };
    }
    
    return differences;
};

// Métodos de instância
forumEditHistorySchema.methods.revert = async function(userId, reason) {
    if (this.reverted) {
        throw new Error('Esta edição já foi revertida');
    }
    
    const contentModel = this.contentType === 'topic' ? 
        mongoose.model('ForumTopic') : 
        mongoose.model('ForumReply');
    
    const content = await contentModel.findById(
        this[this.contentType]
    );
    
    if (!content) {
        throw new Error('Conteúdo não encontrado');
    }
    
    // Reverte as alterações
    if (this.changes.title) {
        content.title = this.changes.title.before;
    }
    
    if (this.changes.content) {
        content.content = this.changes.content.before;
    }
    
    if (this.changes.tags) {
        content.tags = this.changes.tags.before;
    }
    
    if (this.changes.category) {
        content.category = this.changes.category.before;
    }
    
    // Marca a edição como revertida
    this.reverted = true;
    this.revertedBy = userId;
    this.revertReason = reason;
    
    // Salva as alterações
    await Promise.all([
        content.save(),
        this.save()
    ]);
    
    // Cria uma notificação para o editor original
    const ForumNotification = mongoose.model('ForumNotification');
    await ForumNotification.create({
        type: 'edit_reverted',
        recipient: this.editor,
        sender: userId,
        company: this.company,
        topic: this.topic,
        reply: this.reply,
        message: `Sua edição foi revertida: ${reason}`,
        link: `/forum/topic/${this.topic}`
    });
    
    return content;
};

const ForumEditHistory = mongoose.model('ForumEditHistory', forumEditHistorySchema);

export default ForumEditHistory; 