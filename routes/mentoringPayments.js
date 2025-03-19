const express = require('express');
const router = express.Router();
const MentoringPaymentController = require('../controllers/MentoringPaymentController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Verificar saldo para sessão
router.post('/check-balance', isAuthenticated, MentoringPaymentController.checkBalance);

// Processar pagamento de sessão
router.post('/sessions/:sessionId/pay', isAuthenticated, MentoringPaymentController.processPayment);

// Processar reembolso de sessão (apenas admin ou mentor)
router.post('/sessions/:sessionId/refund', isAuthenticated, MentoringPaymentController.processRefund);

module.exports = router; 