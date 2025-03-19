import mongoose from 'mongoose';

const forumSubscriptionSchema = new mongoose.Schema({
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
    type: {
        type: String,
        required: true,
        enum: ['category', 'topic']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumCategory'
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic'
    },
    notificationPreferences: {
        email: {
            enabled: {
                type: Boolean,
                default: true
            },
            frequency: {
                type: String,
                enum: ['instant', 'daily', 'weekly'],
                default: 'instant'
            },
            lastSentAt: {
                type: Date
            }
        },
        inApp: {
            enabled: {
                type: Boolean,
                default: true
            },
            types: {
                newTopic: {
                    type: Boolean,
                    default: true
                },
                newReply: {
                    type: Boolean,
                    default: true
                },
                solution: {
                    type: Boolean,
                    default: true
                }
            }
        }
    },
    lastViewedAt: {
        type: Date,
        default: Date.now
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
forumSubscriptionSchema.index({ user: 1, type: 1 });
forumSubscriptionSchema.index({ category: 1 });
forumSubscriptionSchema.index({ topic: 1 });
forumSubscriptionSchema.index({ 
    user: 1, 
    company: 1, 
    type: 1, 
    category: 1, 
    topic: 1 
}, { unique: true });

// Validação personalizada
forumSubscriptionSchema.pre('validate', function(next) {
    if (this.type === 'category' && !this.category) {
        next(new Error('Category ID is required for category subscriptions'));
    } else if (this.type === 'topic' && !this.topic) {
        next(new Error('Topic ID is required for topic subscriptions'));
    } else {
        next();
    }
});

// Middleware para atualizar timestamps
forumSubscriptionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
forumSubscriptionSchema.statics.getUserSubscriptions = async function(userId, options = {}) {
    const query = {
        user: userId,
        isActive: true
    };
    
    if (options.type) {
        query.type = options.type;
    }
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('category', 'name slug')
        .populate('topic', 'title slug');
};

forumSubscriptionSchema.statics.getSubscribers = async function(type, id) {
    const query = {
        type,
        isActive: true
    };
    
    if (type === 'category') {
        query.category = id;
    } else if (type === 'topic') {
        query.topic = id;
    }
    
    return this.find(query)
        .populate('user', 'name email notificationPreferences');
};

forumSubscriptionSchema.statics.toggleSubscription = async function(data) {
    const query = {
        user: data.user,
        company: data.company,
        type: data.type
    };
    
    if (data.type === 'category') {
        query.category = data.category;
    } else if (data.type === 'topic') {
        query.topic = data.topic;
    }
    
    const subscription = await this.findOne(query);
    
    if (subscription) {
        subscription.isActive = !subscription.isActive;
        return subscription.save();
    } else {
        return this.create(data);
    }
};

// Métodos de instância
forumSubscriptionSchema.methods.updateLastViewed = async function() {
    this.lastViewedAt = Date.now();
    return this.save();
};

forumSubscriptionSchema.methods.updateNotificationPreferences = async function(preferences) {
    if (preferences.email) {
        this.notificationPreferences.email = {
            ...this.notificationPreferences.email,
            ...preferences.email
        };
    }
    
    if (preferences.inApp) {
        this.notificationPreferences.inApp = {
            ...this.notificationPreferences.inApp,
            ...preferences.inApp
        };
    }
    
    return this.save();
};

const ForumSubscription = mongoose.model('ForumSubscription', forumSubscriptionSchema);

export default ForumSubscription; 