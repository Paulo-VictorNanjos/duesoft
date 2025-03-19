import express from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';
import * as StoreController from '../controllers/storeController.js';

const router = express.Router();

// Middleware para verificar se a empresa tem acesso ao recurso
router.use(isAuthenticated);

// Página principal da loja
router.get('/', StoreController.storePage);

// Rotas da loja (usuários autenticados)
router.get('/items/:id', (req, res, next) => {
    console.log('=== ROTA DE DETALHES DO ITEM ===');
    console.log('Parâmetros:', req.params);
    console.log('Query:', req.query);
    console.log('URL:', req.originalUrl);
    next();
}, StoreController.getItem);

router.get('/orders', StoreController.listOrders);
router.post('/buy', StoreController.purchaseItem);

// Rotas de administração (apenas admin)
router.post('/items', isAdmin, StoreController.addItem);
router.get('/stats', isAdmin, StoreController.getStats);

export default router; 