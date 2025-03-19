import express from 'express';
import { isAuthenticated, isAdmin } from '../../middlewares/auth.js';
import * as StoreController from '../../controllers/storeController.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/store');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'));
        }
    }
});

// Middleware de autenticação e autorização
router.use(isAuthenticated, isAdmin);

// Rotas administrativas da loja
router.get('/', StoreController.admin);
router.get('/items', StoreController.listItems);
router.get('/items/:id', StoreController.getItem);
router.post('/items', upload.single('image'), StoreController.addItem);
router.put('/items/:id', upload.single('image'), StoreController.updateItem);
router.delete('/items/:id', StoreController.deleteItem);
router.get('/orders', StoreController.ordersManagement);
router.get('/orders/:id', StoreController.getOrderDetails);
router.put('/orders/:orderId/status', StoreController.updateOrderStatus);
router.get('/stats', StoreController.getStats);

export default router; 