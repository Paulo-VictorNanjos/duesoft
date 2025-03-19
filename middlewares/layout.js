import Banner from '../models/Banner.js';

export default async function layoutMiddleware(req, res, next) {
    try {
        // Adicionar dados do usuário ao layout
        res.locals.user = req.user;
        res.locals.company = req.company;

        // Buscar banner de cabeçalho ativo
        if (req.company) {
            const currentDate = new Date();
            
            // Buscar o banner de cabeçalho ativo mais recente
            const headerBanner = await Banner.findOne({
                company_id: req.company._id,
                type: 'header',
                status: 'active',
                start_date: { $lte: currentDate },
                end_date: { $gte: currentDate }
            }).sort({ createdAt: -1 });

            // Disponibilizar o banner para todas as views
            res.locals.headerBanner = headerBanner;
        }

        next();
    } catch (error) {
        console.error('Erro no middleware de layout:', error);
        next(error);
    }
} 