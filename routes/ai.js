import express from 'express';
import auth, { isAdmin } from '../middlewares/auth.js';
import AiKnowledge from '../models/aiKnowledge.js';
import { uploadKnowledge, askQuestion, getChatHistory, provideFeedback } from '../controllers/aiController.js';

const router = express.Router();

// Middleware para verificar se a empresa tem acesso ao módulo de IA
const hasAiAccess = (req, res, next) => {
    console.log('Verificando acesso à IA:', {
        company: req.company._id,
        settings: req.company.settings,
        features: req.company.settings?.features,
        aiEnabled: req.company.settings?.features?.ai
    });

    if (!req.company.settings?.features?.ai) {
        return res.status(403).json({
            success: false,
            error: 'Sua empresa não tem acesso ao módulo de IA'
        });
    }
    next();
};

// Rotas protegidas por autenticação e acesso à IA
router.use(auth, isAdmin, hasAiAccess);

// Rotas para gerenciamento de conhecimento (admin only)
router.post('/knowledge', uploadKnowledge);
router.get('/knowledge', async (req, res) => {
    try {
        const knowledge = await AiKnowledge.find({ company: req.company._id })
            .sort('-createdAt');
        
        res.json(knowledge);
    } catch (error) {
        console.error('Erro ao listar conhecimento:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});
router.delete('/knowledge/:id', async (req, res) => {
    try {
        await AiKnowledge.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir conhecimento:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Rotas para interação com a IA
router.post('/ask', askQuestion);
router.get('/history', getChatHistory);
router.post('/feedback', provideFeedback);

export default router; 