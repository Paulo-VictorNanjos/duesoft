import mongoose from 'mongoose';

const landingPageSchema = new mongoose.Schema({
    general: {
        logo: String,
        logoWhite: String,
        favicon: String,
        primaryColor: {
            type: String,
            default: '#00b4d8'
        },
        secondaryColor: {
            type: String,
            default: '#0096c7'
        },
        contactEmail: String,
        contactPhone: String
    },
    
    hero: {
        title: String,
        subtitle: String,
        backgroundImage: String,
        backgroundVideo: String
    },
    
    sections: [{
        type: {
            type: String,
            enum: ['features', 'testimonials', 'cta']
        },
        title: String,
        subtitle: String,
        style: {
            backgroundColor: String,
            textColor: String,
            padding: String
        },
        content: {
            // Para a seção Features
            features: [{
                icon: String,
                title: String,
                description: String
            }],
            
            // Para a seção Testimonials
            testimonials: [{
                image: String,
                name: String,
                role: String,
                text: String
            }],
            
            // Para a seção CTA
            primaryButtonText: String,
            primaryButtonUrl: String,
            secondaryButtonText: String,
            secondaryButtonUrl: String
        }
    }],
    
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
}, {
    timestamps: true
});

// Middleware para garantir que sempre haja seções padrão
landingPageSchema.pre('save', function(next) {
    // Verifica se as seções existem, se não, cria com valores padrão
    if (!this.sections || this.sections.length === 0) {
        this.sections = [
            {
                type: 'features',
                title: 'Recursos Poderosos',
                subtitle: 'Tudo que você precisa para criar e gerenciar seus cursos online',
                content: {
                    features: [
                        {
                            icon: 'fas fa-laptop-code',
                            title: 'Plataforma Intuitiva',
                            description: 'Interface amigável e fácil de usar'
                        }
                        // Outros recursos padrão podem ser adicionados aqui
                    ]
                }
            },
            {
                type: 'testimonials',
                title: 'O Que Dizem Nossos Usuários',
                subtitle: 'Histórias de sucesso de quem já utiliza nossa plataforma',
                content: {
                    testimonials: [
                        {
                            name: 'Jo��o Silva',
                            role: 'Professor',
                            text: 'Excelente plataforma para criar cursos online'
                        }
                        // Outros depoimentos padrão podem ser adicionados aqui
                    ]
                }
            },
            {
                type: 'cta',
                title: 'Comece Sua Jornada Hoje',
                subtitle: 'Transforme seu conhecimento em um negócio de sucesso',
                content: {
                    primaryButtonText: 'Criar Conta Grátis',
                    primaryButtonUrl: '/auth/register',
                    secondaryButtonText: 'Saiba Mais',
                    secondaryButtonUrl: '#features'
                }
            }
        ];
    }
    next();
});

const LandingPage = mongoose.model('LandingPage', landingPageSchema);

export default LandingPage; 