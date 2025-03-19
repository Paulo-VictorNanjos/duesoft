import mongoose from 'mongoose';

const forumReplySchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'O conteúdo da resposta é obrigatório'],
        trim: true,
        minlength: [10, 'A resposta deve ter no mínimo 10 caracteres']
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic',
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
    parentReply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReply'
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
    isAnswer: {
        type: Boolean,
        default: false
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        content: String,
        editedAt: {
            type: Date,
            default: Date.now
        }
    }],
    attachments: [{
        filename: String,
        path: String,
        mimetype: String,
        size: Number
    }],
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
forumReplySchema.index({ topic: 1, createdAt: 1 });
forumReplySchema.index({ author: 1, createdAt: -1 });
forumReplySchema.index({ score: -1 });
forumReplySchema.index({ parentReply: 1 });

// Virtuals
forumReplySchema.virtual('childReplies', {
    ref: 'ForumReply',
    localField: '_id',
    foreignField: 'parentReply'
});

// Middleware para atualizar timestamps e score
forumReplySchema.pre('save', function(next) {
    if (this.isModified('votes')) {
        this.score = (this.votes.up?.length || 0) - (this.votes.down?.length || 0);
    }
    
    if (this.isModified('content') && !this.isNew) {
        this.isEdited = true;
        this.editHistory.push({
            content: this.content,
            editedAt: Date.now()
        });
    }
    
    this.updatedAt = Date.now();
    next();
});

// Middleware após salvar
forumReplySchema.post('save', async function(doc) {
    // Atualiza contadores do tópico
    if (this.isNew) {
        const Topic = mongoose.model('ForumTopic');
        await Topic.findByIdAndUpdate(this.topic, {
            $inc: { repliesCount: 1 },
            lastReply: this._id,
            lastReplyAt: this.createdAt
        });
    }
});

// Métodos estáticos
forumReplySchema.statics.getTopReplies = async function(topicId, limit = 5) {
    return this.find({ 
        topic: topicId,
        isActive: true,
        parentReply: null // apenas respostas principais
    })
    .sort({ score: -1 })
    .limit(limit)
    .populate('author', 'name avatar');
};

// Métodos de instância
forumReplySchema.methods.vote = async function(userId, voteType) {
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

forumReplySchema.methods.markAsAnswer = async function() {
    // Remove marcação de resposta anterior
    await this.constructor.updateMany(
        { topic: this.topic },
        { isAnswer: false }
    );
    
    // Marca esta resposta como solução
    this.isAnswer = true;
    
    // Marca o tópico como resolvido
    const Topic = mongoose.model('ForumTopic');
    await Topic.findByIdAndUpdate(this.topic, {
        isResolved: true
    });
    
    return this.save();
};

const ForumReply = mongoose.model('ForumReply', forumReplySchema);

export default ForumReply; 