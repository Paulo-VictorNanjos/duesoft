import mongoose from 'mongoose';
import slugify from 'slugify';

const forumTopicSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'O título do tópico é obrigatório'],
        trim: true,
        minlength: [10, 'O título deve ter no mínimo 10 caracteres'],
        maxlength: [100, 'O título deve ter no máximo 100 caracteres']
    },
    slug: {
        type: String,
        unique: true
    },
    content: {
        type: String,
        required: [true, 'O conteúdo do tópico é obrigatório'],
        trim: true,
        minlength: [20, 'O conteúdo deve ter no mínimo 20 caracteres']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumCategory',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    isSticky: {
        type: Boolean,
        default: false
    },
    isClosed: {
        type: Boolean,
        default: false
    },
    isResolved: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    repliesCount: {
        type: Number,
        default: 0
    },
    lastReply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReply'
    },
    lastReplyAt: {
        type: Date
    },
    votes: {
        up: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        down: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    score: {
        type: Number,
        default: 0
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
forumTopicSchema.index({ company: 1, category: 1, createdAt: -1 });
forumTopicSchema.index({ company: 1, slug: 1 }, { unique: true });
forumTopicSchema.index({ score: -1 });
forumTopicSchema.index({ tags: 1 });

// Virtuals
forumTopicSchema.virtual('replies', {
    ref: 'ForumReply',
    localField: '_id',
    foreignField: 'topic'
});

// Middleware para gerar slug antes de salvar
forumTopicSchema.pre('save', function(next) {
    if (this.isModified('title')) {
        this.slug = slugify(this.title, {
            lower: true,
            strict: true,
            locale: 'pt'
        });
    }
    next();
});

// Middleware para atualizar timestamps e score
forumTopicSchema.pre('save', function(next) {
    if (this.isModified('votes')) {
        this.score = (this.votes.up?.length || 0) - (this.votes.down?.length || 0);
    }
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
forumTopicSchema.statics.getPopularTopics = async function(companyId, limit = 5) {
    return this.find({ 
        company: companyId, 
        isActive: true 
    })
    .sort({ score: -1, repliesCount: -1 })
    .limit(limit)
    .populate('author', 'name avatar')
    .populate('category', 'name slug');
};

// Métodos de instância
forumTopicSchema.methods.vote = async function(userId, voteType) {
    const userIdObj = mongoose.Types.ObjectId(userId);
    
    // Remove votos existentes
    this.votes.up = this.votes.up.filter(id => !id.equals(userIdObj));
    this.votes.down = this.votes.down.filter(id => !id.equals(userIdObj));
    
    // Adiciona novo voto
    if (voteType === 'up') {
        this.votes.up.push(userIdObj);
    } else if (voteType === 'down') {
        this.votes.down.push(userIdObj);
    }
    
    return this.save();
};

forumTopicSchema.methods.incrementViews = async function() {
    this.views += 1;
    return this.save();
};

forumTopicSchema.methods.updateRepliesCount = async function() {
    const Reply = mongoose.model('ForumReply');
    
    const [repliesCount, lastReply] = await Promise.all([
        Reply.countDocuments({ topic: this._id, isActive: true }),
        Reply.findOne({ topic: this._id, isActive: true })
            .sort({ createdAt: -1 })
    ]);

    this.repliesCount = repliesCount;
    this.lastReply = lastReply?._id;
    this.lastReplyAt = lastReply?.createdAt;
    
    return this.save();
};

const ForumTopic = mongoose.model('ForumTopic', forumTopicSchema);

export default ForumTopic; 