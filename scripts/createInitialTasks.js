import mongoose from 'mongoose';
import Task from '../models/Task.js';
import dotenv from 'dotenv';

dotenv.config();

const tasks = [
    {
        title: 'Separar Certificados (routes/certificates.js)',
        description: 'Criar CertificateController e CertificateService para gerenciar certificados. Mover lógica de negócios para o service.',
        priority: 2,
        category: 'Controller',
        estimatedTime: '4 horas',
        dependencies: ['models/Certificate.js'],
        notes: 'Incluir validações e logs adequados'
    },
    {
        title: 'Separar Exames (routes/exams.js)',
        description: 'Criar StudentExamController e StudentExamService para gerenciar exames do aluno. Separar lógica de submissão e correção.',
        priority: 1,
        category: 'Controller',
        estimatedTime: '8 horas',
        dependencies: ['models/Exam.js', 'models/ExamAttempt.js'],
        notes: 'Atenção especial ao processamento de respostas e cálculo de notas'
    },
    {
        title: 'Separar Legal (routes/legal.js)',
        description: 'Criar LegalController para páginas estáticas legais. Simplificar rotas e adicionar cache.',
        priority: 3,
        category: 'Controller',
        estimatedTime: '2 horas',
        notes: 'Considerar implementação de cache para melhor performance'
    },
    {
        title: 'Separar Master (routes/master.js)',
        description: 'Criar MasterController e MasterService para operações de super admin. Melhorar validações e logs.',
        priority: 2,
        category: 'Controller',
        estimatedTime: '6 horas',
        dependencies: ['middlewares/isMaster.js'],
        notes: 'Implementar logs detalhados para auditoria'
    },
    {
        title: 'Separar Mentoria (routes/mentoring.js)',
        description: 'Criar MentoringController e MentoringService, separando em subcontrollers se necessário.',
        priority: 1,
        category: 'Controller',
        estimatedTime: '10 horas',
        dependencies: ['models/Mentor.js', 'models/MentorSession.js'],
        notes: 'Considerar separação em múltiplos controllers por funcionalidade'
    },
    {
        title: 'Separar Notificações (routes/notifications.js)',
        description: 'Criar NotificationController e NotificationService para operações CRUD.',
        priority: 2,
        category: 'Controller',
        estimatedTime: '4 horas',
        dependencies: ['models/Notification.js'],
        notes: 'Implementar sistema de templates para notificações'
    },
    {
        title: 'Separar Licença (routes/license.js)',
        description: 'Criar LicenseController e LicenseService, separando controllers admin e usuário.',
        priority: 2,
        category: 'Controller',
        estimatedTime: '6 horas',
        dependencies: ['models/License.js'],
        notes: 'Separar lógica de aprovação e renovação'
    },
    {
        title: 'Separar Planos (routes/plans.js)',
        description: 'Criar PlanController e PlanService, integrando com serviços de pagamento.',
        priority: 1,
        category: 'Controller',
        estimatedTime: '8 horas',
        dependencies: ['models/Plan.js', 'services/payment.js'],
        notes: 'Atenção à integração com gateway de pagamento'
    },
    {
        title: 'Separar Cursos (routes/courses.js)',
        description: 'Criar CourseController e CourseService, separando lógica de progresso e anexos.',
        priority: 1,
        category: 'Controller',
        estimatedTime: '12 horas',
        dependencies: ['models/Course.js', 'models/Progress.js'],
        notes: 'Considerar cache para listagens e detalhes do curso'
    },
    {
        title: 'Separar Perfil (routes/profile.js)',
        description: 'Criar ProfileController e ProfileService, separando upload de imagens.',
        priority: 2,
        category: 'Controller',
        estimatedTime: '4 horas',
        dependencies: ['models/User.js'],
        notes: 'Melhorar tratamento de uploads'
    },
    {
        title: 'Separar Chat (routes/chat.js)',
        description: 'Criar ChatController e ChatService, separando upload de arquivos.',
        priority: 2,
        category: 'Controller',
        estimatedTime: '6 horas',
        dependencies: ['models/Chat.js', 'models/Message.js'],
        notes: 'Otimizar queries de mensagens'
    },
    {
        title: 'Separar Auth (routes/auth.js)',
        description: 'Criar AuthController e AuthService, separando lógica de autenticação.',
        priority: 1,
        category: 'Controller',
        estimatedTime: '6 horas',
        dependencies: ['models/User.js', 'middlewares/auth.js'],
        notes: 'Implementar refresh tokens'
    },
    {
        title: 'Separar Ranking (routes/ranking.js)',
        description: 'Criar RankingController e RankingService para cálculos de ranking.',
        priority: 2,
        category: 'Controller',
        estimatedTime: '4 horas',
        dependencies: ['models/User.js'],
        notes: 'Otimizar cálculos de ranking'
    }
];

async function createInitialTasks() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado ao MongoDB');

        // Limpa tasks existentes
        await Task.deleteMany({});
        console.log('Tasks existentes removidas');

        // Insere novas tasks
        await Task.insertMany(tasks);
        console.log('Tasks iniciais criadas com sucesso');

        await mongoose.disconnect();
        console.log('Desconectado do MongoDB');
    } catch (error) {
        console.error('Erro ao criar tasks:', error);
    }
}

createInitialTasks(); 