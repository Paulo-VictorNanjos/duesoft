import Company from '../models/Company.js';

const companyData = async (req, res, next) => {
    try {
        if (req.user && req.user.company) {
            const company = await Company.findById(req.user.company._id);
            if (company) {
                res.locals.company = company;
                req.company = company;
            }
        }
        next();
    } catch (error) {
        console.error('Erro no middleware companyData:', error);
        next();
    }
};

export default companyData; 