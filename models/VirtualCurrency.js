import mongoose from 'mongoose';

const virtualCurrencySchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    symbol: {
        type: String,
        required: true,
        trim: true
    },
    conversionRate: {
        type: Number,
        required: true,
        default: 1 // 1 moeda virtual = 1 real
    },
    isActive: {
        type: Boolean,
        default: true
    },
    settings: {
        withdrawSettings: {
            enabled: {
                type: Boolean,
                default: false
            },
            minAmount: {
                type: Number,
                default: 50
            },
            fee: {
                type: Number,
                default: 0
            },
            methods: {
                bankTransfer: {
                    enabled: {
                        type: Boolean,
                        default: true
                    },
                    fee: {
                        type: Number,
                        default: 0
                    },
                    delay: {
                        type: Number,
                        default: 2
                    }
                },
                pix: {
                    enabled: {
                        type: Boolean,
                        default: true
                    },
                    fee: {
                        type: Number,
                        default: 0
                    },
                    delay: {
                        type: Number,
                        default: 0
                    }
                }
            }
        },
        earnRules: {
            courseCompletion: {
                type: Number,
                default: 70,
                min: 0
            },
            examCompletion: {
                type: Number,
                default: 30,
                min: 0
            },
            dailyLogin: {
                type: Number,
                default: 10,
                min: 0
            },
            mentorSession: {
                type: Number,
                default: 50,
                min: 0
            },
            perfectExamScore: {
                type: Number,
                default: 20,
                min: 0
            },
            courseStreak: {
                type: Number,
                default: 10,
                min: 0
            },
            referralBonus: {
                type: Number,
                default: 30,
                min: 0
            },
            firstCourseCompletion: {
                type: Number,
                default: 60,
                min: 0
            },
            mentorRating: {
                type: Number,
                default: 20,
                min: 0
            }
        },
        bonusRules: {
            firstActivityOfDay: {
                type: Boolean,
                default: true
            },
            firstActivityBonus: {
                type: Number,
                default: 20,
                min: 0,
                max: 100
            },
            weekendActivity: {
                type: Boolean,
                default: true
            },
            weekendBonus: {
                type: Number,
                default: 25,
                min: 0,
                max: 100
            },
            levelBonus: {
                enabled: {
                    type: Boolean,
                    default: true
                },
                bonusPerLevel: {
                    type: Number,
                    default: 10,
                    min: 0,
                    max: 100
                },
                levelsRequired: {
                    type: Number,
                    default: 10,
                    min: 1
                }
            },
            streakBonus: {
                enabled: {
                    type: Boolean,
                    default: true
                },
                bonusPerStreak: {
                    type: Number,
                    default: 20,
                    min: 0,
                    max: 100
                },
                streakRequired: {
                    type: Number,
                    default: 3,
                    min: 1
                },
                maxBonus: {
                    type: Number,
                    default: 100,
                    min: 0,
                    max: 500
                }
            }
        }
    }
}, { timestamps: true });

// Índices
virtualCurrencySchema.index({ company: 1 }, { unique: true });

export default mongoose.model('VirtualCurrency', virtualCurrencySchema); 