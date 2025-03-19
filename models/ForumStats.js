import mongoose from 'mongoose';

const forumStatsSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        unique: true
    },
    totalTopics: {
        type: Number,
        default: 0
    },
    totalReplies: {
        type: Number,
        default: 0
    },
    totalViews: {
        type: Number,
        default: 0
    },
    totalUsers: {
        type: Number,
        default: 0
    },
    topCategories: [{
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ForumCategory'
        },
        topicsCount: Number,
        repliesCount: Number,
        lastActivity: Date
    }],
    topUsers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        topics: Number,
        replies: Number,
        reputation: Number
    }],
    topTopics: [{
        topic: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ForumTopic'
        },
        views: Number,
        replies: Number,
        lastActivity: Date
    }],
    activityByDay: [{
        date: Date,
        topics: Number,
        replies: Number,
        views: Number
    }],
    activityByHour: [{
        hour: Number,
        topics: Number,
        replies: Number,
        views: Number
    }],
    tagsUsage: [{
        tag: String,
        count: Number
    }],
    resolutionRate: {
        type: Number,
        default: 0
    },
    averageResponseTime: {
        type: Number,
        default: 0
    },
    lastUpdateAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices
forumStatsSchema.index({ company: 1 }, { unique: true });
forumStatsSchema.index({ 'topCategories.category': 1 });
forumStatsSchema.index({ 'topUsers.user': 1 });
forumStatsSchema.index({ 'topTopics.topic': 1 });

// Métodos estáticos
forumStatsSchema.statics.getStats = async function(companyId) {
    let stats = await this.findOne({ company: companyId })
        .populate('topCategories.category', 'name slug')
        .populate('topUsers.user', 'name avatar')
        .populate('topTopics.topic', 'title slug');
    
    if (!stats) {
        stats = await this.create({ company: companyId });
        await stats.updateStats();
    }
    
    return stats;
};

// Métodos de instância
forumStatsSchema.methods.updateStats = async function() {
    const Topic = mongoose.model('ForumTopic');
    const Reply = mongoose.model('ForumReply');
    const Category = mongoose.model('ForumCategory');
    const User = mongoose.model('User');
    
    // Atualiza contadores gerais
    const [totalTopics, totalReplies, totalViews, totalUsers] = await Promise.all([
        Topic.countDocuments({ company: this.company, isActive: true }),
        Reply.countDocuments({ company: this.company, isActive: true }),
        Topic.aggregate([
            { $match: { company: this.company, isActive: true } },
            { $group: { _id: null, totalViews: { $sum: '$views' } } }
        ]),
        User.countDocuments({ company: this.company, forumPosts: { $gt: 0 } })
    ]);

    this.totalTopics = totalTopics;
    this.totalReplies = totalReplies;
    this.totalViews = totalViews[0]?.totalViews || 0;
    this.totalUsers = totalUsers;

    // Atualiza top categorias
    const topCategories = await Category.aggregate([
        { $match: { company: this.company, isActive: true } },
        { $lookup: {
            from: 'forumtopics',
            localField: '_id',
            foreignField: 'category',
            as: 'topics'
        }},
        { $project: {
            category: '$_id',
            topicsCount: { $size: '$topics' },
            repliesCount: { $sum: '$topics.repliesCount' },
            lastActivity: { $max: '$topics.updatedAt' }
        }},
        { $sort: { topicsCount: -1 } },
        { $limit: 5 }
    ]);

    this.topCategories = topCategories;

    // Atualiza top usuários
    const topUsers = await User.aggregate([
        { $match: { company: this.company } },
        { $lookup: {
            from: 'forumtopics',
            localField: '_id',
            foreignField: 'author',
            as: 'topics'
        }},
        { $lookup: {
            from: 'forumreplies',
            localField: '_id',
            foreignField: 'author',
            as: 'replies'
        }},
        { $project: {
            user: '$_id',
            topics: { $size: '$topics' },
            replies: { $size: '$replies' },
            reputation: '$reputation'
        }},
        { $sort: { reputation: -1 } },
        { $limit: 10 }
    ]);

    this.topUsers = topUsers;

    // Atualiza top tópicos
    const topTopics = await Topic.aggregate([
        { $match: { company: this.company, isActive: true } },
        { $project: {
            topic: '$_id',
            views: 1,
            replies: '$repliesCount',
            lastActivity: '$updatedAt'
        }},
        { $sort: { views: -1 } },
        { $limit: 5 }
    ]);

    this.topTopics = topTopics;

    // Atualiza atividade por dia (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityByDay = await Topic.aggregate([
        { $match: {
            company: this.company,
            createdAt: { $gte: thirtyDaysAgo }
        }},
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            topics: { $sum: 1 },
            replies: { $sum: '$repliesCount' },
            views: { $sum: '$views' }
        }},
        { $sort: { _id: 1 } }
    ]);

    this.activityByDay = activityByDay.map(day => ({
        date: new Date(day._id),
        topics: day.topics,
        replies: day.replies,
        views: day.views
    }));

    // Atualiza taxa de resolução
    const resolvedTopics = await Topic.countDocuments({
        company: this.company,
        isActive: true,
        isResolved: true
    });

    this.resolutionRate = totalTopics > 0 ? (resolvedTopics / totalTopics) : 0;

    // Atualiza tempo médio de resposta (em minutos)
    const responseTimeAgg = await Reply.aggregate([
        { $match: { company: this.company, isActive: true } },
        { $lookup: {
            from: 'forumtopics',
            localField: 'topic',
            foreignField: '_id',
            as: 'topic'
        }},
        { $unwind: '$topic' },
        { $project: {
            responseTime: {
                $divide: [
                    { $subtract: ['$createdAt', '$topic.createdAt'] },
                    60000 // converte para minutos
                ]
            }
        }},
        { $group: {
            _id: null,
            averageTime: { $avg: '$responseTime' }
        }}
    ]);

    this.averageResponseTime = responseTimeAgg[0]?.averageTime || 0;

    // Atualiza uso de tags
    const tagsUsage = await Topic.aggregate([
        { $match: { company: this.company, isActive: true } },
        { $unwind: '$tags' },
        { $group: {
            _id: '$tags',
            count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 20 }
    ]);

    this.tagsUsage = tagsUsage.map(tag => ({
        tag: tag._id,
        count: tag.count
    }));

    this.lastUpdateAt = new Date();
    return this.save();
};

const ForumStats = mongoose.model('ForumStats', forumStatsSchema);

export default ForumStats; 