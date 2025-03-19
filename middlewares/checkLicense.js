import License from '../models/License.js';

const checkLicense = async (req, res, next) => {
    try {
        console.log('Verificando licença para rota:', req.path);
        console.log('Usuário atual:', req.user);

        // Lista de rotas que não precisam de licença
        const publicRoutes = [
            '/license/request',
            '/auth/logout',
            '/auth/login',
            '/auth/register',
            '/auth/forgot-password',
            '/auth/reset-password'
        ];

        // Se é uma rota pública, permite acesso
        if (publicRoutes.includes(req.path)) {
            console.log('Rota pública, permitindo acesso');
            return next();
        }

        // Se não há usuário logado
        if (!req.user) {
            console.log('Usuário não autenticado, redirecionando para login');
            return res.redirect('/auth/login');
        }

        // Verifica se o usuário tem uma licença ativa
        const license = await License.findOne({
            user: req.user._id,
            status: 'active',
            expiryDate: { $gt: new Date() }
        });

        console.log('Licença encontrada:', license);

        // Se não tem licença ativa, redireciona para a página de solicitação
        if (!license) {
            console.log('Sem licença ativa, redirecionando para solicitação');
            req.flash('error', 'Você precisa de uma licença ativa para acessar esta área.');
            return res.redirect('/license/request');
        }

        // Se chegou aqui, tem licença ativa
        req.license = license;
        next();
    } catch (error) {
        console.error('Erro ao verificar licença:', error);
        req.flash('error', 'Erro ao verificar licença');
        res.redirect('/license/request');
    }
};

export default checkLicense;

