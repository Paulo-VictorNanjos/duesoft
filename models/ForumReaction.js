import mongoose from 'mongoose';

const forumReactionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'like',
            'love',
            'haha',
            'wow',
            'sad',
            'angry',
            'thanks',
            'helpful'
        ]
    },
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
    metadata: {
        userAgent: String,
        ipAddress: String
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
forumReactionSchema.index({ contentType: 1, topic: 1, type: 1 });
forumReactionSchema.index({ contentType: 1, reply: 1, type: 1 });
forumReactionSchema.index({ user: 1, contentType: 1 });
forumReactionSchema.index({ company: 1, type: 1 });

// Validação personalizada
forumReactionSchema.pre('validate', function(next) {
    if (this.contentType === 'topic' && !this.topic) {
        next(new Error('Topic ID is required for topic reactions'));
    } else if (this.contentType === 'reply' && !this.reply) {
        next(new Error('Reply ID is required for reply reactions'));
    } else {
        next();
    }
});

// Middleware para atualizar timestamps
forumReactionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Middleware após salvar
forumReactionSchema.post('save', async function(doc) {
    // Atualiza contadores de reações no conteúdo
    const contentModel = doc.contentType === 'topic' ? 
        mongoose.model('ForumTopic') : 
        mongoose.model('ForumReply');
    
    const contentId = doc.contentType === 'topic' ? doc.topic : doc.reply;
    
    await contentModel.updateOne(
        { _id: contentId },
        { $inc: { [`reactions.${doc.type}`]: doc.isActive ? 1 : -1 } }
    );
    
    // Notifica o autor do conteúdo se necessário
    if (doc.isActive && ['thanks', 'helpful'].includes(doc.type)) {
        const content = await contentModel.findById(contentId)
            .select('author');
        
        if (content && !content.author.equals(doc.user)) {
            const ForumNotification = mongoose.model('ForumNotification');
            await ForumNotification.create({
                type: 'reaction',
                recipient: content.author,
                sender: doc.user,
                company: doc.company,
                topic: doc.contentType === 'topic' ? doc.topic : undefined,
                reply: doc.contentType === 'reply' ? doc.reply : undefined,
                message: `Recebeu uma reação "${doc.type}" em seu ${doc.contentType === 'topic' ? 'tópico' : 'resposta'}`,
                link: `/forum/topic/${doc.topic}`
            });
        }
    }
});

// Métodos estáticos
forumReactionSchema.statics.getReactions = async function(options = {}) {
    const query = { isActive: true };
    
    if (options.contentType && options.contentId) {
        query.contentType = options.contentType;
        query[options.contentType] = options.contentId;
    }
    
    if (options.type) {
        query.type = options.type;
    }
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('user', 'name avatar');
};

forumReactionSchema.statics.getReactionStats = async function(contentType, contentId) {
    const query = {
        contentType,
        isActive: true
    };
    
    query[contentType] = contentId;
    
    return this.aggregate([
        { $match: query },
        { $group: {
            _id: '$type',
            count: { $sum: 1 },
            users: { $push: '$user' }
        }},
        { $project: {
            type: '$_id',
            count: 1,
            users: { $slice: ['$users', 5] },
            _id: 0
        }}
    ]);
};

forumReactionSchema.statics.toggleReaction = async function(data) {
    const existingReaction = await this.findOne({
        user: data.user,
        contentType: data.contentType,
        [data.contentType]: data[data.contentType]
    });
    
    if (existingReaction) {
        if (existingReaction.type === data.type) {
            // Remove a reação se for do mesmo tipo
            existingReaction.isActive = !existingReaction.isActive;
            return existingReaction.save();
        } else {
            // Atualiza o tipo da reação
            existingReaction.type = data.type;
            existingReaction.isActive = true;
            return existingReaction.save();
        }
    } else {
        // Cria uma nova reação
        return this.create(data);
    }
};

// Métodos de instância
forumReactionSchema.methods.getUserReaction = async function(userId) {
    return this.model('ForumReaction').findOne({
        user: userId,
        contentType: this.contentType,
        [this.contentType]: this[this.contentType],
        isActive: true
    });
};

const ForumReaction = mongoose.model('ForumReaction', forumReactionSchema);

export default ForumReaction; 