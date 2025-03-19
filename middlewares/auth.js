import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Mentor from '../models/Mentor.js';

// Função para obter a URL base
function getBaseUrl(domain) {
    return process.env.NODE_ENV === 'production' 
        ? `https://${domain}.studywob.com.br`
        : `http://${domain}.localhost:3008`;
}

// Middleware de autenticação
export const isAuthenticated = async (req, res, next) => {
    try {
        console.log('\n=== INÍCIO DA VERIFICAÇÃO DE AUTENTICAÇÃO ===');
        console.log('Rota:', req.path);
        console.log('Hostname completo:', req.hostname);
        console.log('URL completa:', req.protocol + '://' + req.get('host') + req.originalUrl);

        const token = req.cookies.token;
        console.log('Token presente:', !!token);
        console.log('Cookies:', req.cookies);

        if (!token) {
            console.log('Token não encontrado - Redirecionando para login local');
            return res.redirect('/auth/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || '34649813');
        console.log('Token decodificado:', { userId: decoded.userId, companyId: decoded.companyId });
        
        const user = await User.findById(decoded.userId)
            .populate({
                path: 'company',
                select: 'name domain _id plan settings.features'
            });

        if (!user) {
            console.log('Usuário não encontrado - Redirecionando para login local');
            return res.redirect('/auth/login');
        }

        console.log('Usuário encontrado:', {
            id: user._id,
            email: user.email,
            company: user.company ? {
                id: user.company._id,
                name: user.company.name,
                domain: user.company.domain
            } : null
        });

        if (!user.company) {
            console.log('Usuário sem empresa associada - Redirecionando para login local');
            return res.redirect('/auth/login');
        }

        // Adicionar verificação de domínio
        const fullHostname = req.hostname;
        console.log('\n=== VERIFICAÇÃO DE DOMÍNIO ===');
        console.log('Hostname completo:', fullHostname);

        let company;
        
        // Se não tiver ponto no hostname, significa que é o domínio base (sem subdomínio)
        if (!fullHostname.includes('.')) {
            company = await Company.findOne({ isDemo: true }).select('+plan +settings.features');
            console.log('Buscando empresa demo');
        } else {
            // Se tiver ponto, pega o primeiro segmento como domínio
            const domain = fullHostname.split('.')[0];
            console.log('Buscando empresa com domínio:', domain);
            company = await Company.findOne({ domain }).select('+plan +settings.features');
        }

        console.log('Empresa encontrada:', company ? {
            id: company._id,
            name: company.name,
            domain: company.domain
        } : 'Nenhuma');
        
        if (!company) {
            console.error('Empresa não encontrada');
            return res.status(404).render('errors/404', { 
                message: 'Empresa não encontrada'
            });
        }

        // Se for a empresa demo ou se as empresas coincidirem, permite o acesso
        if (company.isDemo || user.company._id.toString() === company._id.toString()) {
            console.log('\n=== ACESSO PERMITIDO ===');
            req.user = user;
            req.company = company;
            res.locals.user = user;
            res.locals.company = company;
            next();
        } else {
            console.log('\n=== REDIRECIONAMENTO NECESSÁRIO ===');
            const redirectUrl = getBaseUrl(user.company.domain) + '/auth/login';
            console.log('URL de redirecionamento:', redirectUrl);
            return res.redirect(redirectUrl);
        }

    } catch (error) {
        console.error('\n=== ERRO NA AUTENTICAÇÃO ===');
        console.error('Tipo do erro:', error.name);
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        res.redirect('/auth/login');
    }
};

// Middleware para verificar se é mentor
export const isMentor = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ 
            user: req.user._id,
            company: req.company._id,
            active: true,
            verified: true
        });
        
        if (!mentor) {
            return res.status(403).json({ error: 'Acesso permitido apenas para mentores' });
        }

        req.mentor = mentor;
        next();
    } catch (error) {
        console.error('Erro ao verificar mentor:', error);
        res.status(403).json({ error: 'Erro ao verificar permissões de mentor' });
    }
};

// Middleware principal de autenticação (mantido para compatibilidade)
const auth = async (req, res, next) => {
    try {
        console.log('==== VERIFICAÇÃO DE AUTENTICAÇÃO ====');
        console.log('Rota:', req.path);

        // Rotas públicas
        const publicRoutes = [
            '/auth/login',
            '/auth/register'
        ];

        if (publicRoutes.includes(req.path)) {
            return next();
        }

        const token = req.cookies.token;
        console.log('Verificando token:', !!token);

        if (!token) {
            console.log('Token não encontrado');
            return res.redirect('/auth/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || '34649813');
        
        // Modificado para incluir plan e features no populate
        const user = await User.findById(decoded.userId)
            .populate({
                path: 'company',
                select: 'name domain _id plan settings.features'
            });

        if (!user) {
            console.log('Usuário não encontrado');
            return res.redirect('/auth/login');
        }

        if (!user.company) {
            console.log('Usuário sem empresa associada');
            return res.redirect('/auth/login');
        }

        // Adicionar verificação de domínio
        const fullHostname = req.hostname;
        console.log('\n=== VERIFICAÇÃO DE DOMÍNIO ===');
        console.log('Hostname completo:', fullHostname);

        let company;
        
        // Se não tiver ponto no hostname, significa que é o domínio base (sem subdomínio)
        if (!fullHostname.includes('.')) {
            company = await Company.findOne({ isDemo: true }).select('+plan +settings.features');
            console.log('Buscando empresa demo');
        } else {
            // Se tiver ponto, pega o primeiro segmento como domínio
            const domain = fullHostname.split('.')[0];
            console.log('Buscando empresa com domínio:', domain);
            company = await Company.findOne({ domain }).select('+plan +settings.features');
        }

        console.log('Empresa encontrada:', company ? {
            id: company._id,
            name: company.name,
            domain: company.domain
        } : 'Nenhuma');
        
        if (!company) {
            console.error('Empresa não encontrada');
            return res.status(404).render('errors/404', { 
                message: 'Empresa não encontrada'
            });
        }

        // Se for a empresa demo ou se as empresas coincidirem, permite o acesso
        if (company.isDemo || user.company._id.toString() === company._id.toString()) {
            console.log('\n=== ACESSO PERMITIDO ===');
            req.user = user;
            req.company = company;
            res.locals.user = user;
            res.locals.company = company;
            next();
        } else {
            console.log('\n=== REDIRECIONAMENTO NECESSÁRIO ===');
            const redirectUrl = getBaseUrl(user.company.domain) + '/auth/login';
            console.log('URL de redirecionamento:', redirectUrl);
            return res.redirect(redirectUrl);
        }

    } catch (error) {
        console.error('Erro na autenticação:', error);
        console.error(error.stack);
        res.redirect('/auth/login');
    }
};

// Adicionar verificação de feature
const checkMentoringFeature = async (req, res, next) => {
    try {
        const company = req.company;
        if (!company.settings?.features?.mentoring) {
            console.log('Feature de mentoria não disponível');
            return res.redirect('/dashboard');
        }
        next();
    } catch (error) {
        console.error('Erro ao verificar feature de mentoria:', error);
        res.redirect('/dashboard');
    }
};

// Adicionar logger sem interferir no fluxo existente
const requestLogger = (req, res, next) => {
    // Apenas logar rotas administrativas para não sobrecarregar
    if (req.path.startsWith('/admin')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Usuário: ${req.user?.email || 'Não autenticado'}`);
    }
    next();
};

// Tratamento de erro que não interfere no fluxo atual
const errorHandler = (err, req, res, next) => {
    console.error('Erro na requisição:', {
        path: req.path,
        method: req.method,
        error: err.message
    });
    
    // Se já foi enviada resposta, passa adiante
    if (res.headersSent) {
        return next(err);
    }

    // Mantém o comportamento padrão de redirecionamento
    if (req.xhr || req.path.startsWith('/api')) {
        res.status(500).json({ 
            error: process.env.NODE_ENV === 'production' 
                ? 'Erro interno do servidor' 
                : err.message 
        });
    } else {
        req.flash('error', 'Ocorreu um erro. Tente novamente.');
        res.redirect('/dashboard');
    }
};

// Middleware para verificar se é admin
export const isAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).redirect('/dashboard');
    }
    next();
};

// Exportar os novos middlewares separadamente
export { requestLogger, errorHandler, checkMentoringFeature };

export default auth;

