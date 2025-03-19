import mongoose from 'mongoose';
import slugify from 'slugify';

const forumCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'O nome da categoria é obrigatório'],
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        required: [true, 'A descrição da categoria é obrigatória'],
        trim: true
    },
    icon: {
        type: String,
        default: 'fas fa-folder'
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    topicsCount: {
        type: Number,
        default: 0
    },
    repliesCount: {
        type: Number,
        default: 0
    },
    lastTopic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic'
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
forumCategorySchema.index({ company: 1, slug: 1 }, { unique: true });
forumCategorySchema.index({ company: 1, displayOrder: 1 });

// Virtuals
forumCategorySchema.virtual('topics', {
    ref: 'ForumTopic',
    localField: '_id',
    foreignField: 'category'
});

// Middleware para gerar slug antes de salvar
forumCategorySchema.pre('save', function(next) {
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
forumCategorySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
forumCategorySchema.statics.getTopCategories = async function(companyId, limit = 5) {
    return this.find({ company: companyId, isActive: true })
        .sort({ topicsCount: -1 })
        .limit(limit)
        .populate('lastTopic');
};

// Métodos de instância
forumCategorySchema.methods.updateCounts = async function() {
    const Topic = mongoose.model('ForumTopic');
    
    const [topicsCount, repliesCount] = await Promise.all([
        Topic.countDocuments({ category: this._id }),
        Topic.aggregate([
            { $match: { category: this._id } },
            { $group: {
                _id: null,
                totalReplies: { $sum: '$repliesCount' }
            }}
        ])
    ]);

    this.topicsCount = topicsCount;
    this.repliesCount = repliesCount[0]?.totalReplies || 0;
    
    return this.save();
};

const ForumCategory = mongoose.model('ForumCategory', forumCategorySchema);

export default ForumCategory; 