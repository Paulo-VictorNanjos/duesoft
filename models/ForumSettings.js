import mongoose from 'mongoose';

const forumSettingsSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        unique: true
    },
    general: {
        topicsPerPage: {
            type: Number,
            default: 20,
            min: 5,
            max: 100
        },
        repliesPerPage: {
            type: Number,
            default: 15,
            min: 5,
            max: 50
        },
        allowGuestView: {
            type: Boolean,
            default: false
        },
        allowFileAttachments: {
            type: Boolean,
            default: true
        },
        maxAttachmentSize: {
            type: Number,
            default: 5242880 // 5MB em bytes
        },
        allowedFileTypes: [{
            type: String,
            default: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
        }]
    },
    moderation: {
        requireApproval: {
            type: Boolean,
            default: false
        },
        autoModerateFirstPost: {
            type: Boolean,
            default: true
        },
        minPostsForTrusted: {
            type: Number,
            default: 10
        },
        minReputationForTrusted: {
            type: Number,
            default: 50
        },
        prohibitedWords: [{
            type: String,
            trim: true
        }],
        spamFilter: {
            enabled: {
                type: Boolean,
                default: true
            },
            maxLinks: {
                type: Number,
                default: 5
            },
            minTimeBetweenPosts: {
                type: Number,
                default: 60 // segundos
            }
        }
    },
    notifications: {
        notifyModerators: {
            newReport: {
                type: Boolean,
                default: true
            },
            newUser: {
                type: Boolean,
                default: true
            }
        },
        notifyUsers: {
            replies: {
                type: Boolean,
                default: true
            },
            mentions: {
                type: Boolean,
                default: true
            },
            solutions: {
                type: Boolean,
                default: true
            }
        },
        emailDigest: {
            enabled: {
                type: Boolean,
                default: true
            },
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'never'],
                default: 'weekly'
            }
        }
    },
    reputation: {
        pointsForNewTopic: {
            type: Number,
            default: 2
        },
        pointsForReply: {
            type: Number,
            default: 1
        },
        pointsForAcceptedAnswer: {
            type: Number,
            default: 15
        },
        pointsForUpvote: {
            type: Number,
            default: 10
        },
        pointsForDownvote: {
            type: Number,
            default: -2
        }
    },
    badges: {
        enabled: {
            type: Boolean,
            default: true
        },
        requirements: {
            questioner: {
                topics: {
                    type: Number,
                    default: 10
                }
            },
            helper: {
                replies: {
                    type: Number,
                    default: 50
                }
            },
            expert: {
                acceptedAnswers: {
                    type: Number,
                    default: 25
                }
            }
        }
    },
    layout: {
        showStatistics: {
            type: Boolean,
            default: true
        },
        showTopUsers: {
            type: Boolean,
            default: true
        },
        showRecentTopics: {
            type: Boolean,
            default: true
        },
        categoriesPerRow: {
            type: Number,
            default: 3,
            min: 1,
            max: 4
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'auto'
        }
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
forumSettingsSchema.index({ company: 1 }, { unique: true });

// Middleware para atualizar timestamps
forumSettingsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Métodos estáticos
forumSettingsSchema.statics.getSettings = async function(companyId) {
    let settings = await this.findOne({ company: companyId });
    
    if (!settings) {
        settings = await this.create({ company: companyId });
    }
    
    return settings;
};

// Métodos de instância
forumSettingsSchema.methods.isUserTrusted = function(user) {
    return user.forumPosts >= this.moderation.minPostsForTrusted &&
           user.reputation >= this.moderation.minReputationForTrusted;
};

forumSettingsSchema.methods.needsModeration = function(user) {
    if (!this.moderation.requireApproval) return false;
    if (!this.moderation.autoModerateFirstPost) return true;
    return user.forumPosts === 0;
};

forumSettingsSchema.methods.calculateReputationChange = function(action) {
    const points = {
        newTopic: this.reputation.pointsForNewTopic,
        reply: this.reputation.pointsForReply,
        acceptedAnswer: this.reputation.pointsForAcceptedAnswer,
        upvote: this.reputation.pointsForUpvote,
        downvote: this.reputation.pointsForDownvote
    };
    
    return points[action] || 0;
};

const ForumSettings = mongoose.model('ForumSettings', forumSettingsSchema);

export default ForumSettings; 