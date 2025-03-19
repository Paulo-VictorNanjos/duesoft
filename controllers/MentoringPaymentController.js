const MentoringPaymentService = require('../services/MentoringPaymentService');
const MentorSession = require('../models/MentorSession');
const User = require('../models/User');
const Mentor = require('../models/Mentor');

// Verificar saldo para sessão
exports.checkBalance = async (req, res) => {
    try {
        const { mentorId, duration } = req.body;

        // Buscar mentor
        const mentor = await Mentor.findById(mentorId);
        if (!mentor) {
            return res.status(404).json({
                success: false,
                message: 'Mentor não encontrado'
            });
        }

        // Verificar saldo
        const result = await MentoringPaymentService.checkBalance(
            req.user,
            mentor,
            duration,
            req.company
        );

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Erro ao verificar saldo:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar saldo',
            error: error.message
        });
    }
};

// Processar pagamento de sessão
exports.processPayment = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Buscar sessão
        const session = await MentorSession.findById(sessionId)
            .populate('student')
            .populate({
                path: 'mentor',
                populate: {
                    path: 'user'
                }
            });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada'
            });
        }

        // Verificar se o usuário é o estudante da sessão
        if (session.student._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para pagar esta sessão'
            });
        }

        // Processar pagamento
        const result = await MentoringPaymentService.processPayment(
            session,
            session.student,
            session.mentor,
            req.company
        );

        // Atualizar status da sessão
        session.paymentStatus = 'PAID';
        await session.save();

        res.json({
            success: true,
            message: 'Pagamento processado com sucesso',
            ...result
        });

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao processar pagamento'
        });
    }
};

// Processar reembolso de sessão
exports.processRefund = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Buscar sessão
        const session = await MentorSession.findById(sessionId)
            .populate('student')
            .populate({
                path: 'mentor',
                populate: {
                    path: 'user'
                }
            });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Sessão não encontrada'
            });
        }

        // Verificar se o usuário tem permissão (admin ou mentor da sessão)
        const isMentor = session.mentor.user._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isAdmin && !isMentor) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para reembolsar esta sessão'
            });
        }

        // Processar reembolso
        const result = await MentoringPaymentService.refundPayment(
            session,
            req.company
        );

        // Atualizar status da sessão
        session.paymentStatus = 'REFUNDED';
        session.status = 'CANCELLED';
        await session.save();

        res.json({
            success: true,
            message: 'Reembolso processado com sucesso',
            ...result
        });

    } catch (error) {
        console.error('Erro ao processar reembolso:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao processar reembolso'
        });
    }
}; 