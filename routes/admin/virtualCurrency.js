import express from 'express';
import { isAuthenticated, isAdmin } from '../../middlewares/auth.js';
import * as virtualCurrencyController from '../../controllers/VirtualCurrencyController.js';

const router = express.Router();

// Configurações da moeda virtual
router.get('/settings', [isAuthenticated, isAdmin], virtualCurrencyController.settingsPage);
router.post('/settings', [isAuthenticated, isAdmin], virtualCurrencyController.saveSettings);

// Regras de recompensa
router.post('/earn-rules', [isAuthenticated, isAdmin], virtualCurrencyController.saveEarnRules);

// Configurações de saque
router.get('/withdraw', [isAuthenticated, isAdmin], virtualCurrencyController.withdrawSettingsPage);
router.post('/withdraw-settings', [isAuthenticated, isAdmin], virtualCurrencyController.saveWithdrawSettings);

// Creditar moedas (admin)
router.get('/credit', [isAuthenticated, isAdmin], virtualCurrencyController.creditPage);
router.post('/credit', [isAuthenticated, isAdmin], virtualCurrencyController.creditCoins);

export default router; 