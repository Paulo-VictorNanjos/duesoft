import Company from '../models/Company.js';

const checkCompany = async (req, res, next) => {
    try {
        if (!req.user || !req.user.company) {
            return res.status(401).redirect('/auth/login');
        }

        const company = await Company.findById(req.user.company);
        if (!company || !company.active) {
            req.flash('error', 'Empresa não encontrada ou inativa');
            return res.redirect('/auth/login');
        }

        req.company = company;
        next();
    } catch (error) {
        console.error('Erro ao verificar empresa:', error);
        res.status(500).redirect('/error');
    }
};

export default checkCompany; 