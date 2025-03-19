// routes/license.js
import express from 'express';
import auth from '../middlewares/auth.js';
import isAdmin from '../middlewares/admin.js';
import License from '../models/License.js';
import LicenseRequest from '../models/LicenseRequest.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import NotificationManager from '../utils/notificationManager.js';

const router = express.Router();

// Página de solicitação/visualização de licença
router.get('/request', auth, async (req, res) => {
    try {
        // Primeiro verifica se tem licença ativa
        const license = await License.findOne({
            user: req.user._id,
            status: 'active',
            expiryDate: { $gt: new Date() }
        });

        // Depois verifica se tem solicitação pendente
        const existingRequest = await LicenseRequest.findOne({
            user: req.user._id,
            status: 'pending'
        });

        // Buscando a lista de empresas
        const companies = await Company.find();

        // Passa todas as variáveis necessárias para a view
        res.render('license/request', {
            user: req.user,
            license: license || null,  // Se não tiver licença, passa null
            existingRequest: existingRequest || null,  // Se não tiver solicitação, passa null
            companies,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error('Erro ao carregar página de licença:', error);
        req.flash('error', 'Erro ao carregar informações da licença');
        res.redirect('/dashboard');
    }
});

// Enviar solicitação de licença
router.post('/request', auth, async (req, res) => {
    try {
        // Verifica se já existe uma solicitação pendente
        const existingRequest = await LicenseRequest.findOne({
            user: req.user._id,
            status: 'pending'
        });

        if (existingRequest) {
            req.flash('error', 'Você já possui uma solicitação pendente');
            return res.redirect('/license/request');
        }

        const { company, role, type } = req.body;

        const request = new LicenseRequest({
            user: req.user._id,
            company,
            role,
            type
        });

        await request.save();

        // Notificar administradores
        const admins = await User.find({ isAdmin: true });
        for (const admin of admins) {
            await NotificationManager.send(
                admin._id,
                'Nova solicitação de licença',
                `${req.user.name} solicitou uma licença ${type}`,
                'info',
                '/admin/licenses/requests'
            );
        }

        req.flash('success', 'Solicitação enviada com sucesso!');
        res.redirect('/license/request');
    } catch (error) {
        console.error('Erro ao solicitar licença:', error);
        req.flash('error', 'Erro ao enviar solicitação');
        res.redirect('/license/request');
    }
});

// Rotas administrativas
router.get('/admin/requests', auth, isAdmin, async (req, res) => {
    try {
        const requests = await LicenseRequest.find()
            .populate('user')
            .sort('-createdAt');

        res.render('admin/licenses/requests', {
            requests,
            user: req.user
        });
    } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
        res.redirect('/admin/dashboard');
    }
});

// Aprovar/rejeitar solicitação
router.post('/admin/requests/:id/process', auth, isAdmin, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const request = await LicenseRequest.findById(req.params.id)
            .populate('user');

        if (status === 'approved') {
            // Criar nova licença
            const expiryDate = new Date();
            switch (request.type) {
                case 'monthly':
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                    break;
                case 'quarterly':
                    expiryDate.setMonth(expiryDate.getMonth() + 3);
                    break;
                case 'yearly':
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                    break;
            }

            const license = new License({
                user: request.user._id,
                type: request.type,
                expiryDate,
                createdBy: req.user._id
            });

            await license.save();
        }

        request.status = status;
        request.notes = notes;
        await request.save();

        // Notificar usuário
        await NotificationManager.send(
            request.user._id,
            'Atualização da solicitação de licença',
            `Sua solicitação foi ${status === 'approved' ? 'aprovada' : 'rejeitada'}`,
            status === 'approved' ? 'success' : 'warning',
            '/dashboard'
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao processar solicitação:', error);
        res.status(500).json({ success: false });
    }
});

export default router;