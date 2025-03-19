import express from 'express';
import LandingPage from '../models/LandingPage.js';

const router = express.Router();

// Rota pública para a landing page
router.get('/', async (req, res) => {
    try {
        const landingPage = await LandingPage.findOne();
        
        res.render('landing/index', {
            layout: 'layouts/landing',
            title: 'EduPro LMS - Plataforma de Ensino Online',
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY, // Adicionando a chave pública do Stripe
            landing: landingPage || {
                seo: {
                    title: "EduPro LMS",
                    description: "Plataforma de Ensino Online"
                }
            }
        });
    } catch (error) {
        console.error('Erro ao carregar landing page:', error);
        res.status(500).send('Erro ao carregar página');
    }
});

export { router as indexRouter }; 