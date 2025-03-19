import mongoose from 'mongoose';

const forumBadgeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'O nome da badge é obrigatório'],
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        required: [true, 'A descrição da badge é obrigatória'],
        trim: true
    },
    icon: {
        type: String,
        required: [true, 'O ícone da badge é obrigatório']
    },
    color: {
        type: String,
        default: '#6c757d'
    },
    type: {
        type: String,
        enum: ['bronze', 'silver', 'gold'],
        default: 'bronze'
    },
    category: {
        type: String,
        enum: ['participation', 'quality', 'achievement'],
        required: true
    },
    requirements: {
        topics: {
            type: Number,
            default: 0
        },
        replies: {
            type: Number,
            default: 0
        },
        solutions: {
            type: Number,
            default: 0
        },
        upvotes: {
            type: Number,
            default: 0
        },
        reputation: {
            type: Number,
            default: 0
        }
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
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
forumBadgeSchema.index({ company: 1, slug: 1 }, { unique: true });
forumBadgeSchema.index({ type: 1 });
forumBadgeSchema.index({ category: 1 });

// Virtuals
forumBadgeSchema.virtual('earnedBy', {
    ref: 'User',
    localField: '_id',
    foreignField: 'forumBadges'
});

// Middleware para gerar slug
forumBadgeSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
    }
    next();
});

// Middleware para atualizar timestamps
forumBadgeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
forumBadgeSchema.statics.getBadgesByType = async function(companyId, type) {
    return this.find({
        company: companyId,
        type,
        isActive: true
    }).sort('name');
};

forumBadgeSchema.statics.checkUserEligibility = async function(userId) {
    const User = mongoose.model('User');
    const user = await User.findById(userId)
        .populate('forumBadges');
    
    if (!user) return [];
    
    const eligibleBadges = await this.find({
        company: user.company,
        isActive: true,
        _id: { $nin: user.forumBadges.map(b => b._id) }
    });
    
    const newBadges = [];
    
    for (const badge of eligibleBadges) {
        const isEligible = await badge.checkRequirements(user);
        if (isEligible) {
            newBadges.push(badge);
        }
    }
    
    if (newBadges.length > 0) {
        user.forumBadges.push(...newBadges);
        await user.save();
        
        // Cria notificações para as novas badges
        const ForumNotification = mongoose.model('ForumNotification');
        await Promise.all(newBadges.map(badge => 
            ForumNotification.create({
                type: 'badge',
                recipient: user._id,
                company: user.company,
                badge: badge.name,
                message: `Parabéns! Você ganhou a badge "${badge.name}"`,
                link: '/forum/badges'
            })
        ));
    }
    
    return newBadges;
};

// Métodos de instância
forumBadgeSchema.methods.checkRequirements = async function(user) {
    const Topic = mongoose.model('ForumTopic');
    const Reply = mongoose.model('ForumReply');
    
    const [
        topicsCount,
        repliesCount,
        solutionsCount,
        upvotesCount
    ] = await Promise.all([
        // Conta tópicos
        Topic.countDocuments({
            author: user._id,
            company: this.company,
            isActive: true
        }),
        // Conta respostas
        Reply.countDocuments({
            author: user._id,
            company: this.company,
            isActive: true
        }),
        // Conta soluções
        Reply.countDocuments({
            author: user._id,
            company: this.company,
            isActive: true,
            isAnswer: true
        }),
        // Conta upvotes recebidos
        Topic.aggregate([
            { $match: { author: user._id, company: this.company } },
            { $project: { upvotes: { $size: '$votes.up' } } },
            { $group: { _id: null, total: { $sum: '$upvotes' } } }
        ]).then(result => result[0]?.total || 0)
    ]);
    
    return (
        topicsCount >= this.requirements.topics &&
        repliesCount >= this.requirements.replies &&
        solutionsCount >= this.requirements.solutions &&
        upvotesCount >= this.requirements.upvotes &&
        user.reputation >= this.requirements.reputation
    );
};

const ForumBadge = mongoose.model('ForumBadge', forumBadgeSchema);

export default ForumBadge; 