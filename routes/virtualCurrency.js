import express from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';
import * as VirtualCurrencyController from '../controllers/VirtualCurrencyController.js';
import * as VirtualWalletController from '../controllers/VirtualWalletController.js';
import * as PaymentInfoController from '../controllers/PaymentInfoController.js';

const router = express.Router();

// Middleware para verificar se a empresa tem acesso ao recurso
router.use(isAuthenticated);

// Rotas de administração (apenas admin da empresa)
router.post('/setup', isAdmin, VirtualCurrencyController.setupCurrency);
router.get('/stats', isAdmin, VirtualCurrencyController.getCurrencyStats);

// Rotas públicas (usuários autenticados)
router.get('/settings', VirtualCurrencyController.getCurrencySettings);
router.get('/wallet', VirtualWalletController.walletPage);
router.get('/transactions', VirtualWalletController.getTransactions);
router.post('/withdraw', VirtualWalletController.requestWithdraw);

// Página de dados de pagamento
router.get('/payment-info', isAuthenticated, PaymentInfoController.paymentInfoPage);

// Rotas para chaves PIX
router.post('/payment-info/pix', isAuthenticated, PaymentInfoController.addPixKey);
router.delete('/payment-info/pix/:keyId', isAuthenticated, PaymentInfoController.deletePixKey);
router.put('/payment-info/pix/:keyId/default', isAuthenticated, PaymentInfoController.setDefaultPixKey);

// Rotas para contas bancárias
router.post('/payment-info/bank', isAuthenticated, PaymentInfoController.addBankAccount);
router.delete('/payment-info/bank/:accountId', isAuthenticated, PaymentInfoController.deleteBankAccount);
router.put('/payment-info/bank/:accountId/default', isAuthenticated, PaymentInfoController.setDefaultBankAccount);

// Rota para creditar moedas manualmente (apenas admin)
router.post('/credit', isAuthenticated, isAdmin, VirtualCurrencyController.creditCoins);

export default router; 