import express from 'express';
import Company from '../models/Company.js';
import User from '../models/User.js';
import auth from '../middlewares/auth.js';
import BannerController from '../controllers/BannerController.js';
import NewsController from '../controllers/NewsController.js';

const router = express.Router();

// Rota para buscar empresas ativas
router.get('/empresas', async (req, res) => {
    try {
        const empresas = await Company.find(
            { active: true }, 
            'name domain logo'
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

router.post('/cookie-consent', async (req, res) => {
    try {
        const { accepted } = req.body;
        
        // Definir cookie
        res.cookie('cookieConsent', accepted, {
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 ano
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' // Mudado para 'lax' para permitir redirecionamentos
        });

        // Se houver usuário logado, salvar preferência
        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, {
                cookiePreferences: {
                    accepted,
                    updatedAt: new Date()
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao processar cookie consent:', error);
        res.status(500).json({ 
            error: 'Erro ao processar solicitação',
            details: error.message 
        });
    }
});

// Public routes for banners and news
router.get('/banners', BannerController.list);
router.get('/news', NewsController.list);
router.get('/news/:id', NewsController.get);

export default router; 