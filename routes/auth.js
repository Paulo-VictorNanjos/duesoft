import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { showRegisterForm, login, register, logout } from '../controllers/authController.js';
import { planFeatures } from '../middlewares/planAccess.js';

const router = express.Router();

// GET login page
router.get('/login', (req, res) => {
    res.render('auth/login', {
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// POST login
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { email, password } = req.body;

        // Verificar se o usuário existe e popular os dados da empresa
        const user = await User.findOne({ email }).populate('company');
        if (!user) {
            console.log('User not found:', email);
            req.flash('error', 'Email ou senha inválidos');
            return res.redirect('/auth/login');
        }

        // Verificar senha
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Invalid password for:', email);
            req.flash('error', 'Email ou senha inválidos');
            return res.redirect('/auth/login');
        }

        // Verificar se a empresa tem um plano válido
        if (!user.company || !planFeatures[user.company.plan]) {
            console.log('Invalid company plan:', user.company?.plan);
            req.flash('error', 'Plano da empresa inválido ou expirado');
            return res.redirect('/auth/login');
        }

        // Criar token JWT com informações adicionais do plano
        const token = jwt.sign(
            { 
                userId: user._id,
                companyId: user.company._id,
                plan: user.company.plan
            },
            process.env.JWT_SECRET || '34649813',
            { expiresIn: '24h' }
        );

        console.log('Generated token:', token);

        // Salvar token no cookie
        res.cookie('token', token, { 
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });

        console.log('Login successful for:', email);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Erro durante o login');
        res.redirect('/auth/login');
    }
});

// GET register page
router.get('/register', async (req, res) => {
    try {
        // Pegar o hostname completo
        const fullHostname = req.hostname;
        console.log('Hostname:', fullHostname);
        
        let company;
        
        // Se não tiver ponto no hostname, significa que é o domínio base (sem subdomínio)
        if (!fullHostname.includes('.')) {
            company = await Company.findOne({ isDemo: true });
            console.log('Buscando empresa demo');
        } else {
            // Se tiver ponto, pega o primeiro segmento como domínio
            const domain = fullHostname.split('.')[0];
            console.log('Buscando empresa com domínio:', domain);
            company = await Company.findOne({ domain });
        }
        
        if (!company) {
            console.log('Empresa não encontrada');
            return res.status(404).send('Empresa não encontrada');
        }

        console.log('Empresa encontrada:', company.name);

        // Se encontrou a empresa, renderiza a página de registro
        res.render('auth/register', {
            companies: [company], // Passa apenas a empresa atual
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Erro ao carregar página de registro:', error);
        res.status(500).send('Erro ao carregar página de registro');
    }
});

// POST register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, companyId } = req.body;
        
        // Verificar se o usuário já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email já cadastrado');
            return res.redirect('/auth/register');
        }

        // Verificar se a empresa existe e tem um plano válido
        const company = await Company.findById(companyId);
        if (!company || !planFeatures[company.plan]) {
            req.flash('error', 'Empresa inválida ou plano expirado');
            return res.redirect('/auth/register');
        }

        // Criar o novo usuário
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            company: companyId
        });

        req.flash('success', 'Cadastro realizado com sucesso! Faça login para continuar.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Erro no registro:', error);
        req.flash('error', 'Erro ao realizar cadastro');
        res.redirect('/auth/register');
    }
});

// Middleware para verificar autenticação
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        // Usuário autenticado, permitir acesso
        return next();
    }
    // Usuário não autenticado, redirecionar para a página de login
    req.flash('error', 'Please login to access this page.');
    res.redirect('/auth/login');
};

// Logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.flash('success', 'Logged out successfully');
    res.redirect('/auth/login');
});

router.get('/register', showRegisterForm);
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);

// Rota para buscar empresas ativas
router.get('/companies', async (req, res) => {
    try {
        const empresas = await Company.find(
            { active: true }, 
            'name domain logo'
        );
        res.json(empresas);
    } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        res.status(500).json({ error: 'Erro ao carregar empresas' });
    }
});

export default router;
