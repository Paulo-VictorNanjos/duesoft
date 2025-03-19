import mongoose from 'mongoose';
import slugify from 'slugify';

const forumTagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'O nome da tag é obrigatório'],
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    icon: {
        type: String
    },
    color: {
        type: String,
        default: '#6c757d'
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumCategory'
    },
    isOfficial: {
        type: Boolean,
        default: false
    },
    isModerated: {
        type: Boolean,
        default: false
    },
    topicsCount: {
        type: Number,
        default: 0
    },
    followersCount: {
        type: Number,
        default: 0
    },
    lastTopicAt: {
        type: Date
    },
    metadata: {
        synonyms: [String],
        relatedTags: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ForumTag'
        }],
        externalLinks: [{
            title: String,
            url: String
        }]
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
forumTagSchema.index({ company: 1, slug: 1 }, { unique: true });
forumTagSchema.index({ company: 1, name: 1 });
forumTagSchema.index({ category: 1 });
forumTagSchema.index({ topicsCount: -1 });
forumTagSchema.index({ followersCount: -1 });

// Virtuals
forumTagSchema.virtual('topics', {
    ref: 'ForumTopic',
    localField: '_id',
    foreignField: 'tags'
});

forumTagSchema.virtual('followers', {
    ref: 'User',
    localField: '_id',
    foreignField: 'followedTags'
});

// Middleware para gerar slug
forumTagSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true,
            locale: 'pt'
        });
    }
    next();
});

// Middleware para atualizar timestamps
forumTagSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
forumTagSchema.statics.getPopularTags = async function(companyId, options = {}) {
    const query = {
        company: companyId,
        isActive: true
    };
    
    if (options.category) {
        query.category = options.category;
    }
    
    if (options.isOfficial !== undefined) {
        query.isOfficial = options.isOfficial;
    }
    
    return this.find(query)
        .sort({ topicsCount: -1 })
        .limit(options.limit || 20)
        .select('name slug color topicsCount');
};

forumTagSchema.statics.searchTags = async function(companyId, searchTerm, options = {}) {
    const query = {
        company: companyId,
        isActive: true,
        $or: [
            { name: new RegExp(searchTerm, 'i') },
            { 'metadata.synonyms': new RegExp(searchTerm, 'i') }
        ]
    };
    
    if (options.category) {
        query.category = options.category;
    }
    
    return this.find(query)
        .sort({ topicsCount: -1 })
        .limit(options.limit || 10)
        .select('name slug description');
};

forumTagSchema.statics.mergeTags = async function(sourceTagId, targetTagId) {
    const Topic = mongoose.model('ForumTopic');
    const User = mongoose.model('User');
    
    const [sourceTag, targetTag] = await Promise.all([
        this.findById(sourceTagId),
        this.findById(targetTagId)
    ]);
    
    if (!sourceTag || !targetTag) {
        throw new Error('Tags não encontradas');
    }
    
    // Atualiza tópicos
    await Topic.updateMany(
        { tags: sourceTag._id },
        { $pull: { tags: sourceTag._id } }
    );
    
    await Topic.updateMany(
        { tags: sourceTag._id },
        { $addToSet: { tags: targetTag._id } }
    );
    
    // Atualiza seguidores
    await User.updateMany(
        { followedTags: sourceTag._id },
        { $pull: { followedTags: sourceTag._id } }
    );
    
    await User.updateMany(
        { followedTags: sourceTag._id },
        { $addToSet: { followedTags: targetTag._id } }
    );
    
    // Atualiza contadores
    targetTag.topicsCount += sourceTag.topicsCount;
    targetTag.followersCount += sourceTag.followersCount;
    
    // Adiciona sinônimos
    if (sourceTag.metadata.synonyms) {
        targetTag.metadata.synonyms = [
            ...new Set([
                ...targetTag.metadata.synonyms || [],
                sourceTag.name,
                ...sourceTag.metadata.synonyms
            ])
        ];
    }
    
    // Desativa a tag fonte
    sourceTag.isActive = false;
    
    await Promise.all([
        targetTag.save(),
        sourceTag.save()
    ]);
    
    return targetTag;
};

// Métodos de instância
forumTagSchema.methods.updateCounts = async function() {
    const Topic = mongoose.model('ForumTopic');
    const User = mongoose.model('User');
    
    const [topicsCount, followersCount, lastTopic] = await Promise.all([
        Topic.countDocuments({ 
            tags: this._id,
            isActive: true
        }),
        User.countDocuments({
            followedTags: this._id
        }),
        Topic.findOne({ 
            tags: this._id,
            isActive: true
        })
        .sort({ createdAt: -1 })
        .select('createdAt')
    ]);
    
    this.topicsCount = topicsCount;
    this.followersCount = followersCount;
    this.lastTopicAt = lastTopic?.createdAt;
    
    return this.save();
};

forumTagSchema.methods.getSimilarTags = async function(limit = 5) {
    return this.model('ForumTag').find({
        company: this.company,
        _id: { $ne: this._id },
        isActive: true,
        $or: [
            { category: this.category },
            { _id: { $in: this.metadata.relatedTags || [] } }
        ]
    })
    .sort({ topicsCount: -1 })
    .limit(limit)
    .select('name slug topicsCount');
};

const ForumTag = mongoose.model('ForumTag', forumTagSchema);

export default ForumTag; 