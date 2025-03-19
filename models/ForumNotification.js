import mongoose from 'mongoose';

const forumNotificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'new_reply',
            'mention',
            'solution',
            'upvote',
            'downvote',
            'report',
            'moderation',
            'badge',
            'edit_reverted'
        ]
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic'
    },
    reply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReply'
    },
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReport'
    },
    badge: {
        type: String
    },
    message: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    emailSent: {
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
forumNotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
forumNotificationSchema.index({ company: 1, type: 1 });
forumNotificationSchema.index({ topic: 1 });
forumNotificationSchema.index({ reply: 1 });

// Middleware para atualizar timestamps
forumNotificationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
forumNotificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
    const query = {
        recipient: userId,
        isActive: true
    };
    
    if (options.unreadOnly) {
        query.read = false;
    }
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 20)
        .skip(options.skip || 0)
        .populate('sender', 'name avatar')
        .populate('topic', 'title slug')
        .populate('reply', 'content');
};

forumNotificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({
        recipient: userId,
        read: false,
        isActive: true
    });
};

forumNotificationSchema.statics.markAllAsRead = async function(userId) {
    return this.updateMany(
        {
            recipient: userId,
            read: false,
            isActive: true
        },
        {
            read: true,
            updatedAt: Date.now()
        }
    );
};

// Métodos de instância
forumNotificationSchema.methods.markAsRead = async function() {
    if (!this.read) {
        this.read = true;
        return this.save();
    }
    return this;
};

forumNotificationSchema.methods.sendEmail = async function() {
    if (this.emailSent) return;
    
    // Implementar lógica de envio de email aqui
    // ...
    
    this.emailSent = true;
    return this.save();
};

const ForumNotification = mongoose.model('ForumNotification', forumNotificationSchema);

export default ForumNotification; 