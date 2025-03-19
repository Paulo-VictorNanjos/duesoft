import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '.env') });

// Debug de todas as variáveis do Stripe
console.log('Variáveis do Stripe:', {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publicKey: process.env.STRIPE_PUBLIC_KEY,
    priceBasic: process.env.STRIPE_PRICE_BASIC,
    pricePro: process.env.STRIPE_PRICE_PRO,
    priceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE
});

// Adicione este console.log para debug
console.log('Todas as variáveis de ambiente:', process.env);
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY);

console.log('Variáveis do Cloudinary:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET?.substring(0, 5) + '...'
});

import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import flash from 'connect-flash';
import expressLayouts from 'express-ejs-layouts';
import { Server } from 'socket.io';
import { createServer } from 'http';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';

// Importar modelos
import LandingPage from './models/LandingPage.js';
import Company from './models/Company.js';
import VirtualWallet from './models/VirtualWallet.js';
import VirtualCurrency from './models/VirtualCurrency.js';

// Rotas
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import coursesRoutes from './routes/courses.js';
import dashboardRoutes from './routes/dashboard.js';
import profileRoutes from './routes/profile.js';
import chatRoutes from './routes/chat.js';
import adminExamRouter from './routes/admin/exams.js';
import examRoutes from './routes/exams.js';
import rankingRoutes from './routes/ranking.js';
import certificatesRoutes from './routes/certificates.js';
import achievementsRouter from './routes/achievements.js';
import notificationsRoutes from './routes/notifications.js';
import legalRoutes from './routes/legal.js';
import accountRoutes from './routes/account.js';
import licenseRoutes from './routes/license.js';
import { indexRouter } from './routes/index.js';
import companyRoutes from './routes/admin/companies.js';
import plansRoutes from './routes/plans.js';
import apiRoutes from './routes/api.js';
import mentoringRoutes from './routes/mentoring.js';
import virtualCurrencyRoutes from './routes/virtualCurrency.js';
import storeRoutes from './routes/store.js';
import adminStoreRoutes from './routes/admin/store.js';
import storeRouter from './routes/store.js';
import aiRoutes from './routes/ai.js';
import forumRoutes from './routes/forum.js';
import adminForumRouter from './routes/admin/forum.js';

import checkLicense from './middlewares/checkLicense.js';
import auth from './middlewares/auth.js';
import companyData from './middlewares/companyData.js';
import mentorData from './middlewares/mentorData.js';
import securityMiddleware from './middlewares/security.js';

// Importar rotas
import adminRouter from './routes/admin.js';
import virtualCurrencyRouter from './routes/admin/virtualCurrency.js';
import virtualWalletRouter from './routes/virtualCurrency.js';

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // timeout após 5 segundos
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));


const app = express();
const server = createServer(app);
const io = new Server(server);
const onlineUsers = new Map();

// Configurações iniciais
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração da sessão
app.use(session({
    secret: process.env.JWT_SECRET || '34649813',
    resave: false,
    saveUninitialized: true
}));

// Configurar Flash Messages - DEVE VIR DEPOIS DA SESSÃO
app.use(flash());

// Middleware para disponibilizar variáveis globais
app.use((req, res, next) => {
    // Variáveis locais básicas
    res.locals.showCookieConsent = true;
    res.locals.user = req.user || null;
    res.locals.company = req.company || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    
    next();
});

// Depois aplique os middlewares de segurança
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.rateLimiter);
app.use(securityMiddleware.cookieConsent);

// Configurações
app.use(express.static('public'));

// Configuração do EJS
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('views', path.resolve('views'));

// Middleware para verificar o caminho atual e definir layout
app.use((req, res, next) => {
    res.locals.path = req.path;
    res.locals.user = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');

    if (req.path === '/') {
        res.locals.layout = 'layouts/landing';
    } else if (req.path.startsWith('/auth')) {
        res.locals.layout = 'layouts/auth';
    } else if (req.path.startsWith('/admin')) {
        res.locals.layout = 'layouts/admin';
    } else {
        res.locals.layout = 'layouts/main';
    }
    next();
});

// Adicionar middleware para compartilhar socket.io
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware de autenticação global (exceto rotas públicas)
app.use((req, res, next) => {
    console.log('Rota atual:', req.path);
    next();
});

app.use((req, res, next) => {
    res.locals.company = req.company || null;
    next();
});

// Rotas públicas (sem verificação)
app.use('/auth', authRoutes);
app.use('/license', licenseRoutes);
app.use('/legal', legalRoutes);
app.use('/plans', plansRoutes);
app.use('/', indexRouter);

// Rota principal (landing page)
app.get('/', async (req, res) => {
    if (req.headers.host !== DOMAIN) {
        return res.redirect(`http://${DOMAIN}`);
    }
    try {
        const landingPage = await LandingPage.findOne();
        console.log('Landing page data:', landingPage);
        
        res.render('landing/index', { 
            layout: 'layouts/landing',
            landing: landingPage || {},
            user: req.user || null
        });
    } catch (error) {
        console.error('Erro ao carregar landing page:', error);
        res.status(500).send('Erro ao carregar página');
    }
});

// Middleware de autenticação para rotas protegidas
app.use(auth);

// Rotas administrativas
app.use('/admin/exams', adminExamRouter);
app.use('/admin/forum', adminForumRouter);
app.use('/admin', adminRouter);

// Middleware de licença para rotas protegidas
app.use(checkLicense);

// Adicionar a nova rota de mentoria aqui
app.use('/mentoring', mentoringRoutes);

// Rotas protegidas
app.use('/dashboard', auth, checkLicense, companyData, dashboardRoutes);
app.use('/courses', auth, checkLicense, companyData, coursesRoutes);
app.use('/forum', auth, checkLicense, companyData, forumRoutes);
app.use('/profile', auth, checkLicense, companyData, profileRoutes);
app.use('/chat', auth, checkLicense, companyData, chatRoutes);
app.use('/exams', auth, checkLicense, companyData, examRoutes);
app.use('/ranking', auth, checkLicense, companyData, rankingRoutes);
app.use('/certificates', auth, checkLicense, companyData, certificatesRoutes);
app.use('/achievements', auth, checkLicense, companyData, achievementsRouter);
app.use('/notifications', auth, checkLicense, companyData, notificationsRoutes);
app.use('/account', auth, checkLicense, companyData, accountRoutes);
app.use('/mentoring', auth, checkLicense, companyData, mentorData, mentoringRoutes);
app.use('/virtual-currency', auth, checkLicense, companyData, virtualCurrencyRoutes);
app.use('/store', auth, checkLicense, companyData, storeRoutes);

// Adicionar as novas rotas
app.use('/admin/companies', companyRoutes);

// Adicionar depois do middleware de autenticação
app.use(companyData);
app.use(mentorData);

// Adicione esta linha para incluir as rotas da API
app.use('/api', apiRoutes);

// Configuração do Socket.IO
io.on('connection', (socket) => {
    console.log('=== NOVA CONEXÃO SOCKET.IO ===');
    console.log('Socket ID:', socket.id);
    console.log('User Data:', socket.handshake.auth);

    // Log de desconexão
    socket.on('disconnect', () => {
        console.log('=== DESCONEXÃO SOCKET.IO ===');
        console.log('Socket ID:', socket.id);
        console.log('Reason:', socket.disconnectReason);
    });

    // Entrar em uma sala de chat
    socket.on('join-room', (roomId) => {
        try {
            console.log('=== ENTRANDO NA SALA ===');
            console.log('Socket ID:', socket.id);
            console.log('Room ID:', roomId);
            
            socket.join(roomId);
            console.log('Entrou na sala com sucesso');
        } catch (error) {
            console.error('Erro ao entrar na sala:', error);
            socket.emit('error', { message: 'Erro ao entrar na sala' });
        }
    });

    // Enviar mensagem
    socket.on('send-message', async (data) => {
        try {
            console.log('=== NOVA MENSAGEM ===');
            console.log('De:', data.from);
            console.log('Para sala:', data.roomId);
            console.log('Conteúdo:', data.content);

            // Salvar mensagem no banco de dados
            const message = new ChatMessage({
                room: data.roomId,
                sender: data.from,
                content: data.content,
                timestamp: new Date()
            });

            await message.save();
            console.log('Mensagem salva no banco:', message._id);

            // Emitir mensagem para a sala
            io.to(data.roomId).emit('receive-message', {
                id: message._id,
                sender: data.from,
                content: data.content,
                timestamp: message.timestamp
            });

            console.log('Mensagem emitida com sucesso');
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
            socket.emit('error', { message: 'Erro ao enviar mensagem' });
        }
    });

    // Digitando
    socket.on('typing', (data) => {
        try {
            console.log('=== USUÁRIO DIGITANDO ===');
            console.log('Usuário:', data.userId);
            console.log('Sala:', data.roomId);
            
            socket.to(data.roomId).emit('user-typing', {
                userId: data.userId,
                username: data.username
            });
        } catch (error) {
            console.error('Erro ao processar evento typing:', error);
        }
    });

    // Parou de digitar
    socket.on('stop-typing', (data) => {
        try {
            console.log('=== USUÁRIO PAROU DE DIGITAR ===');
            console.log('Usuário:', data.userId);
            console.log('Sala:', data.roomId);
            
            socket.to(data.roomId).emit('user-stop-typing', {
                userId: data.userId
            });
        } catch (error) {
            console.error('Erro ao processar evento stop-typing:', error);
        }
    });
});

// Criar pastas necessárias
const dirs = [
    'public/uploads',
    'public/uploads/landing',
    'public/uploads/chat',
    'public/uploads/profile',
    'public/uploads/courses',
    'public/videos'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const DOMAIN = process.env.DOMAIN || 'localhost';

const PORT = process.env.PORT || 3008;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
// Adicione esta linha para tornar o io acessível em toda a aplicação
app.set('io', io);

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads/companies', express.static(path.join(__dirname, 'public/uploads/companies')));
app.use('/images', express.static('public/images'));
app.use('/js', express.static('public/js'));

// Configure method override - deve vir antes das rotas
app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        return method;
    }
    if (req.query._method) {
        return req.query._method;
    }
}));

// Altere a rota de master para admin
app.use('/admin/companies', companyRoutes);

// Configurar diretórios estáticos
app.use('/uploads/companies', express.static('public/uploads/companies'));
app.use('/uploads', express.static('public/uploads'));
app.use('/js', express.static('public/js'));

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads/companies', express.static(path.join(__dirname, 'public/uploads/companies')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Rota da API para buscar empresas
app.get('/api/empresas', async (req, res) => {
    try {
        const empresas = await Company.find(
            { active: true }, 
            'name domain logo'  // Campos que precisamos
        );
        
        const empresasFormatadas = empresas.map(empresa => ({
            nome: empresa.name,
            dominio: empresa.domain,
            logo: empresa.logo || '/img/default-company-logo.png'
        }));

        res.json(empresasFormatadas);
    } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        res.status(500).json({ error: 'Erro ao carregar empresas' });
    }
});

// Configurar variáveis globais para as views
app.use((req, res, next) => {
    res.locals.stripePublicKey = process.env.STRIPE_PUBLIC_KEY;
    next();
});

// Rotas administrativas
app.use('/admin/store', adminStoreRoutes);
app.use('/store', storeRoutes);

// Registrar rotas
app.use('/admin', adminRouter);
app.use('/admin/virtual-currency', virtualCurrencyRouter);

// Rotas da Moeda Virtual
app.use('/admin/virtual-currency', virtualCurrencyRouter);
app.use('/virtual-currency', virtualWalletRouter);

// Middleware para compartilhar dados da carteira
app.use(async (req, res, next) => {
    if (req.user && req.company) {
        try {
            const [wallet, currency] = await Promise.all([
                VirtualWallet.findOne({ 
                    user: req.user._id,
                    company: req.company._id
                }),
                VirtualCurrency.findOne({ company: req.company._id })
            ]);
            
            res.locals.wallet = wallet;
            res.locals.currency = currency;
        } catch (error) {
            console.error('Erro ao carregar dados da carteira:', error);
        }
    }
    next();
});

// Rotas da loja
app.use('/store', storeRouter);

// Registrar rotas
app.use('/certificates', certificatesRoutes);

// Adicionar novas rotas
app.use('/ai', aiRoutes);
