import VirtualCurrency from '../models/VirtualCurrency.js';
import VirtualWallet from '../models/VirtualWallet.js';

// Middleware para verificar se a moeda virtual está configurada
export const checkCurrencySetup = async (req, res, next) => {
    try {
        const currency = await VirtualCurrency.findOne({ company: req.company._id });
        
        if (!currency) {
            return res.status(404).json({
                success: false,
                error: 'Moeda virtual não configurada para esta empresa'
            });
        }
        
        req.virtualCurrency = currency;
        next();
        
    } catch (error) {
        console.error('Erro ao verificar configuração da moeda:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar configuração da moeda'
        });
    }
};

// Middleware para carregar ou criar carteira do usuário
export const loadWallet = async (req, res, next) => {
    try {
        let wallet = await VirtualWallet.findOne({
            user: req.user._id,
            company: req.company._id
        });
        
        if (!wallet) {
            wallet = await VirtualWallet.create({
                user: req.user._id,
                company: req.company._id,
                balance: 0
            });
        }
        
        req.virtualWallet = wallet;
        next();
        
    } catch (error) {
        console.error('Erro ao carregar carteira:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao carregar carteira'
        });
    }
};

// Middleware para verificar saldo suficiente
export const checkBalance = (amount) => {
    return async (req, res, next) => {
        try {
            const wallet = req.virtualWallet;
            
            if (!wallet || wallet.balance < amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Saldo insuficiente'
                });
            }
            
            next();
            
        } catch (error) {
            console.error('Erro ao verificar saldo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao verificar saldo'
            });
        }
    };
}; 