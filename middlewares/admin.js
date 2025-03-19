const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            req.flash('error', 'Acesso negado. Você precisa ser um administrador.');
            return res.redirect('/dashboard');
        }
        next();
    } catch (error) {
        req.flash('error', 'Você não tem permissão para acessar esta página.');
        res.redirect('/dashboard');
    }
};

export default isAdmin;
