import mongoose from 'mongoose';

const forumActivitySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'topic_created',
            'topic_edited',
            'topic_deleted',
            'reply_created',
            'reply_edited',
            'reply_deleted',
            'vote_cast',
            'answer_marked',
            'report_submitted',
            'moderation_action',
            'badge_earned',
            'category_created',
            'category_edited',
            'category_deleted'
        ]
    },
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
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic'
    },
    reply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReply'
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumCategory'
    },
    report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReport'
    },
    badge: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumBadge'
    },
    moderation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumModeration'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
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
    timestamps: true
});

// Índices
forumActivitySchema.index({ company: 1, type: 1, createdAt: -1 });
forumActivitySchema.index({ user: 1, createdAt: -1 });
forumActivitySchema.index({ topic: 1, createdAt: -1 });
forumActivitySchema.index({ category: 1, createdAt: -1 });

// Métodos estáticos
forumActivitySchema.statics.logActivity = async function(data) {
    return this.create({
        type: data.type,
        user: data.user,
        company: data.company,
        topic: data.topic,
        reply: data.reply,
        category: data.category,
        report: data.report,
        badge: data.badge,
        moderation: data.moderation,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
    });
};

forumActivitySchema.statics.getUserActivity = async function(userId, options = {}) {
    return this.find({
        user: userId,
        isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .populate('topic', 'title slug')
    .populate('reply', 'content')
    .populate('category', 'name slug')
    .populate('badge', 'name icon');
};

forumActivitySchema.statics.getCompanyActivity = async function(companyId, options = {}) {
    const query = {
        company: companyId,
        isActive: true
    };
    
    if (options.type) {
        query.type = options.type;
    }
    
    if (options.startDate) {
        query.createdAt = { $gte: options.startDate };
    }
    
    if (options.endDate) {
        query.createdAt = { ...query.createdAt, $lte: options.endDate };
    }
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .populate('user', 'name avatar')
        .populate('topic', 'title slug')
        .populate('category', 'name slug');
};

forumActivitySchema.statics.getActivityStats = async function(companyId, period = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    return this.aggregate([
        {
            $match: {
                company: mongoose.Types.ObjectId(companyId),
                createdAt: { $gte: startDate },
                isActive: true
            }
        },
        {
            $group: {
                _id: {
                    type: '$type',
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                activities: {
                    $push: {
                        type: '$_id.type',
                        count: '$count'
                    }
                }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
};

// Middleware para limpar dados sensíveis
forumActivitySchema.pre('save', function(next) {
    // Remove informações sensíveis do metadata
    if (this.metadata) {
        delete this.metadata.password;
        delete this.metadata.token;
        delete this.metadata.secret;
    }
    
    // Limita o tamanho do userAgent
    if (this.userAgent && this.userAgent.length > 200) {
        this.userAgent = this.userAgent.substring(0, 200);
    }
    
    next();
});

const ForumActivity = mongoose.model('ForumActivity', forumActivitySchema);

export default ForumActivity; 