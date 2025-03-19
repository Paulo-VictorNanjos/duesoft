const mongoose = require('mongoose');

const rewardRuleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'COURSE_COMPLETION',
            'FIRST_COURSE',
            'EXAM_COMPLETION',
            'PERFECT_EXAM',
            'DAILY_LOGIN',
            'LOGIN_STREAK',
            'MENTOR_SESSION',
            'MENTOR_RATING',
            'REFERRAL',
            'COURSE_STREAK',
            'CUSTOM'
        ],
        required: true
    },
    coins: {
        type: Number,
        required: true,
        min: 0
    },
    multiplier: {
        type: Number,
        default: 1,
        min: 0
    },
    streakBonus: {
        enabled: {
            type: Boolean,
            default: false
        },
        interval: {
            type: Number,
            default: 5
        },
        bonus: {
            type: Number,
            default: 0
        }
    },
    conditions: {
        minValue: {
            type: Number,
            default: 0
        },
        maxValue: {
            type: Number
        },
        cooldown: {
            type: Number, // em minutos
            default: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
}, {
    timestamps: true
});

// Índices
rewardRuleSchema.index({ company: 1, type: 1 });
rewardRuleSchema.index({ company: 1, isActive: 1 });

const RewardRule = mongoose.model('RewardRule', rewardRuleSchema);

module.exports = RewardRule; 