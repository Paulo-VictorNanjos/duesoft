import mongoose from 'mongoose';

const forumModerationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['warning', 'ban', 'mute']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    moderator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    reason: {
        type: String,
        required: [true, 'O motivo da ação é obrigatório'],
        trim: true
    },
    details: {
        type: String,
        trim: true
    },
    duration: {
        type: Number, // duração em minutos, null para permanente
        default: null
    },
    expiresAt: {
        type: Date
    },
    relatedContent: {
        type: {
            type: String,
            enum: ['topic', 'reply', 'report']
        },
        id: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'relatedContent.type'
        }
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'revoked'],
        default: 'active'
    },
    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revokedAt: {
        type: Date
    },
    revokeReason: {
        type: String,
        trim: true
    },
    notificationSent: {
        type: Boolean,
        default: false
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
forumModerationSchema.index({ user: 1, status: 1 });
forumModerationSchema.index({ company: 1, type: 1 });
forumModerationSchema.index({ expiresAt: 1 }, { sparse: true });

// Middleware para atualizar timestamps e expiresAt
forumModerationSchema.pre('save', function(next) {
    if (this.isModified('duration') && this.duration) {
        this.expiresAt = new Date(Date.now() + this.duration * 60000);
    }
    
    this.updatedAt = Date.now();
    next();
});

// Middleware após salvar
forumModerationSchema.post('save', async function(doc) {
    if (!doc.notificationSent) {
        const ForumNotification = mongoose.model('ForumNotification');
        
        // Notifica o usuário sobre a ação de moderação
        await ForumNotification.create({
            type: 'moderation',
            recipient: doc.user,
            sender: doc.moderator,
            company: doc.company,
            message: `Você recebeu uma ação de moderação: ${doc.type} - ${doc.reason}`,
            link: '/forum/moderation'
        });
        
        // Atualiza o flag de notificação
        doc.notificationSent = true;
        await doc.save();
    }
});

// Métodos estáticos
forumModerationSchema.statics.getUserActiveModeration = async function(userId) {
    return this.find({
        user: userId,
        status: 'active',
        isActive: true
    })
    .sort('-createdAt')
    .populate('moderator', 'name');
};

forumModerationSchema.statics.checkExpiredModeration = async function() {
    const expiredActions = await this.find({
        status: 'active',
        expiresAt: { $lte: new Date() },
        isActive: true
    });
    
    for (const action of expiredActions) {
        action.status = 'expired';
        await action.save();
        
        // Notifica o usuário sobre o fim da ação de moderação
        const ForumNotification = mongoose.model('ForumNotification');
        await ForumNotification.create({
            type: 'moderation',
            recipient: action.user,
            company: action.company,
            message: `Sua restrição de ${action.type} expirou`,
            link: '/forum'
        });
    }
    
    return expiredActions;
};

// Métodos de instância
forumModerationSchema.methods.revoke = async function(moderatorId, reason) {
    if (this.status !== 'active') {
        throw new Error('Apenas ações ativas podem ser revogadas');
    }
    
    this.status = 'revoked';
    this.revokedBy = moderatorId;
    this.revokedAt = Date.now();
    this.revokeReason = reason;
    
    // Notifica o usuário sobre a revogação
    const ForumNotification = mongoose.model('ForumNotification');
    await ForumNotification.create({
        type: 'moderation',
        recipient: this.user,
        sender: moderatorId,
        company: this.company,
        message: `Sua restrição de ${this.type} foi revogada: ${reason}`,
        link: '/forum'
    });
    
    return this.save();
};

forumModerationSchema.methods.extend = async function(duration, moderatorId, reason) {
    if (this.status !== 'active') {
        throw new Error('Apenas ações ativas podem ser estendidas');
    }
    
    // Adiciona a nova duração ao tempo restante ou à data atual
    const baseDate = this.expiresAt || new Date();
    this.expiresAt = new Date(baseDate.getTime() + duration * 60000);
    this.duration = (this.duration || 0) + duration;
    
    // Notifica o usuário sobre a extensão
    const ForumNotification = mongoose.model('ForumNotification');
    await ForumNotification.create({
        type: 'moderation',
        recipient: this.user,
        sender: moderatorId,
        company: this.company,
        message: `Sua restrição de ${this.type} foi estendida: ${reason}`,
        link: '/forum/moderation'
    });
    
    return this.save();
};

const ForumModeration = mongoose.model('ForumModeration', forumModerationSchema);

export default ForumModeration; 