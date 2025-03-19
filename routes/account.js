import express from 'express';
import auth from '../middlewares/auth.js'; // Comentado temporariamente
import DeleteRequest from '../models/DeleteRequest.js';
import NotificationManager from '../utils/notificationManager.js';

const router = express.Router();

// Rota para exibir o formulário (auth removido temporariamente)
router.get('/delete-request', (req, res) => {
    res.render('account/delete-request', {
        user: {}, // Objeto vazio temporariamente
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Rota para processar a solicitação (auth removido temporariamente)
router.post('/delete-request', async (req, res) => {
    try {
        const { reason, otherReason, feedback } = req.body;

        // Criar nova solicitação (usando ID temporário para teste)
        const deleteRequest = new DeleteRequest({
            user: '123456789', // ID temporário
            reason: reason === 'other' ? otherReason : reason,
            feedback,
            status: 'pending',
            requestedAt: new Date()
        });

        await deleteRequest.save();

        req.flash('success', 'Sua solicitação foi recebida e será processada em até 30 dias');
        res.redirect('/');

    } catch (error) {
        console.error('Erro ao processar solicitação de exclusão:', error);
        req.flash('error', 'Erro ao processar sua solicitação');
        res.redirect('/account/delete-request');
    }
});

export default router; 