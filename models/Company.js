import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    isDemo: {
        type: Boolean,
        default: false
    },
    domain: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    logo: {
        type: String,
        required: false
    },
    theme: {
        primaryColor: {
            type: String,
            default: '#4f46e5'
        },
        secondaryColor: {
            type: String,
            default: '#4338ca'
        }
    },
    settings: {
        allowUserRegistration: {
            type: Boolean,
            default: true
        },
        requireLicenseApproval: {
            type: Boolean,
            default: true
        },
        features: {
            dashboard: {
                type: Boolean,
                default: true
            },
            courses: {
                type: Boolean,
                default: true
            },
            exams: {
                type: Boolean,
                default: true
            },
            chat: {
                type: Boolean,
                default: false
            },
            profile: {
                type: Boolean,
                default: false
            },
            ranking: {
                type: Boolean,
                default: false
            },
            achievements: {
                type: Boolean,
                default: false
            },
            ai: {
                type: Boolean,
                default: false
            }
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    cpfCnpj: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} não é um e-mail válido!`
        }
    },
    responsible: {
        type: String,
        required: true,
        trim: true
    },
    plan: {
        type: String,
        enum: ['basic', 'pro', 'enterprise'],
        default: 'basic'
    },
    certificate: {
        logo: {
            type: String,
            default: null
        },
        background: {
            type: String,
            default: null
        },
        title: {
            type: String,
            default: "Certificado de Conclusão"
        },
        subtitle: {
            type: String,
            default: "Este certificado é conferido a"
        },
        description: {
            type: String,
            default: "pela conclusão do curso {courseName} com carga horária de {hours} horas"
        },
        signature: {
            image: {
                type: String,
                default: null
            },
            name: {
                type: String,
                default: null
            },
            role: {
                type: String,
                default: null
            }
        }
    }
}, {
    timestamps: true
});

// Middleware pre-save para configurar features baseado no plano
companySchema.pre('save', function(next) {
    const baseFeatures = {
        dashboard: true,
        courses: true,
        exams: true
    };

    switch (this.plan) {
        case 'enterprise':
            this.settings.features = {
                ...baseFeatures,
                chat: true,
                profile: true,
                ranking: true,
                achievements: true,
                ai: true
            };
            break;
        case 'pro':
            this.settings.features = {
                ...baseFeatures,
                chat: false,
                profile: true,
                ranking: true,
                achievements: true,
                ai: false
            };
            break;
        default: // basic
            this.settings.features = {
                ...baseFeatures,
                chat: false,
                profile: false,
                ranking: false,
                achievements: false,
                ai: false
            };
    }
    next();
});

const Company = mongoose.model('Company', companySchema);
export default Company; 