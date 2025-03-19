import express from 'express';
import auth from '../middlewares/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Listar notificações do usuário
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort('-createdAt')
            .limit(20);
            
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
});

// Marcar notificação como lida
router.put('/:id/read', auth, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { read: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar notificação' });
    }
});

// Marcar todas como lidas
router.put('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, read: false },
            { read: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar notificações' });
    }
});

export default router; 