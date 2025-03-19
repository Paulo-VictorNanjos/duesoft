import User from '../models/User.js';
import Company from '../models/Company.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendLoginAlert } from '../utils/email.js';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const domain = req.hostname.split('.')[0];
        
        // Validação básica
        if (!email || !password) {
            req.flash('error', 'Email e senha são obrigatórios');
            return res.redirect('/auth/login');
        }

        // Buscar empresa pelo domínio
        const company = await Company.findOne({ domain });
        if (!company) {
            req.flash('error', 'Empresa não encontrada');
            return res.redirect('/auth/login');
        }

        // Buscar usuário que pertence à empresa específica
        const user = await User.findOne({ 
            email: email.toLowerCase(), 
            company: company._id 
        }).populate('company');

        // Verificar se usuário existe
        if (!user) {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000)); // Timing attack protection
            req.flash('error', 'Credenciais inválidas');
            return res.redirect('/auth/login');
        }

        // Verificar se conta está bloqueada
        if (user.lockUntil && user.lockUntil > Date.now()) {
            req.flash('error', 'Conta temporariamente bloqueada. Tente novamente mais tarde.');
            return res.redirect('/auth/login');
        }

        // Verificar senha
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            await user.incLoginAttempts();
            req.flash('error', 'Credenciais inválidas');
            return res.redirect('/auth/login');
        }

        // Verificar se é usuário master
        if (user.isMaster) {
            console.log('Usuário é master, gerando token...');
            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });

            return res.redirect('/master/companies');
        }

        // Verificar se empresa está ativa
        if (!user.company || !user.company.active) {
            req.flash('error', 'Empresa inativa ou não encontrada');
            return res.redirect('/auth/login');
        }

        // Login bem-sucedido
        const loginInfo = {
            date: new Date(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            success: true
        };

        // Atualizar informações do usuário
        await User.findByIdAndUpdate(user._id, {
            $set: {
                loginAttempts: 0,
                lastLogin: new Date(),
                lockUntil: null
            },
            $push: {
                previousLogins: loginInfo,
                loginDates: new Date()
            }
        });

        // Verificar se é um local de login não usual
        const unusualLogin = await checkUnusualLogin(user, req.ip);
        if (unusualLogin) {
            await sendLoginAlert(user.email, loginInfo);
        }

        // Gerar token JWT com informações da empresa
        const token = jwt.sign(
            { 
                userId: user._id,
                companyId: user.company._id
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Configurar cookie seguro
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        // Limitar histórico de login a 30 dias
        if (user.loginDates.length > 30) {
            user.loginDates.shift();
        }

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro no login:', error);
        req.flash('error', 'Erro ao processar login');
        res.redirect('/auth/login');
    }
};

// Função para verificar login incomum
async function checkUnusualLogin(user, currentIp) {
    if (!user.previousLogins?.length) return true;
    
    const lastLogin = user.previousLogins[user.previousLogins.length - 1];
    if (lastLogin.ip !== currentIp) return true;
    
    return false;
}

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const domain = req.hostname.split('.')[0];
        
        // Buscar empresa pelo domínio
        const company = await Company.findOne({ domain });
        if (!company || !company.active) {
            req.flash('error', 'Empresa inválida ou inativa');
            return res.redirect('/auth/register');
        }

        const user = new User({
            name,
            email,
            password,
            company: company._id,
            loginDates: [new Date()]
        });

        await user.save();

        req.flash('success', 'Registro realizado com sucesso');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Erro no registro:', error);
        req.flash('error', 'Erro ao realizar registro');
        res.redirect('/auth/register');
    }
};

export const logout = (req, res) => {
    res.clearCookie('token');
    req.flash('success', 'Logged out successfully');
    res.redirect('/auth/login');
};

export const showRegisterForm = async (req, res) => {
    try {
        const companies = await Company.find({ active: true });
        res.render('auth/register', { companies });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        req.flash('error', 'Erro ao carregar formulário de registro');
        res.redirect('/auth/login');
    }
}; 