import VirtualWallet from '../models/VirtualWallet.js';
import VirtualCurrency from '../models/VirtualCurrency.js';

// Página da carteira
export const walletPage = async (req, res) => {
    try {
        const [wallet, currency] = await Promise.all([
            VirtualWallet.findOne({ 
                user: req.user._id,
                company: req.company._id
            }).populate('transactions').exec(),
            VirtualCurrency.findOne({ company: req.company._id })
        ]);
        
        // Ordenar transações por data (mais recentes primeiro)
        const transactions = wallet?.transactions?.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        ) || [];

        res.render('virtualCurrency/wallet', {
            wallet,
            currency,
            transactions,
            success: req.flash('success'),
            error: req.flash('error')
        });
        
    } catch (error) {
        console.error('Erro ao carregar carteira:', error);
        req.flash('error', 'Erro ao carregar carteira');
        res.redirect('/dashboard');
    }
};

// Solicitar saque
export const requestWithdraw = async (req, res) => {
    try {
        const { amount, method, ...paymentInfo } = req.body;
        
        // Buscar carteira e moeda
        const [wallet, currency] = await Promise.all([
            VirtualWallet.findOne({ 
                user: req.user._id,
                company: req.company._id
            }),
            VirtualCurrency.findOne({ company: req.company._id })
        ]);
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Carteira não encontrada'
            });
        }
        
        if (!currency) {
            return res.status(404).json({
                success: false,
                message: 'Moeda virtual não configurada'
            });
        }
        
        // Validar se saques estão habilitados
        if (!currency.settings.withdrawEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Saques estão desabilitados no momento'
            });
        }
        
        // Validar método de saque
        const methodConfig = currency.settings.withdrawMethods[method];
        if (!methodConfig || !methodConfig.enabled) {
            return res.status(400).json({
                success: false,
                message: 'Método de saque inválido ou indisponível'
            });
        }
        
        // Validar valor mínimo
        if (amount < currency.settings.minWithdraw) {
            return res.status(400).json({
                success: false,
                message: `Valor mínimo para saque é R$ ${currency.settings.minWithdraw}`
            });
        }
        
        // Validar saldo
        if (wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Saldo insuficiente'
            });
        }
        
        // Calcular taxas
        const generalFee = amount * (currency.settings.withdrawFee / 100);
        const methodFee = amount * (methodConfig.fee / 100);
        const totalFee = generalFee + methodFee;
        const finalAmount = amount - totalFee;
        
        // Criar transação de saque
        const withdrawTransaction = {
            type: 'WITHDRAW',
            amount: amount,
            fee: totalFee,
            finalAmount: finalAmount,
            status: 'PENDING',
            description: `Saque via ${method === 'pix' ? 'PIX' : 'Transferência Bancária'}`,
            method,
            paymentInfo,
            createdAt: new Date()
        };
        
        // Atualizar carteira
        wallet.balance -= amount;
        wallet.pendingBalance += amount;
        wallet.transactions.push(withdrawTransaction);
        
        await wallet.save();
        
        // Enviar notificação ao admin
        // TODO: Implementar sistema de notificações
        
        res.json({
            success: true,
            message: 'Solicitação de saque enviada com sucesso',
            transaction: withdrawTransaction
        });
        
    } catch (error) {
        console.error('Erro ao solicitar saque:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar solicitação de saque',
            error: error.message
        });
    }
};

// Listar transações
export const getTransactions = async (req, res) => {
    try {
        const wallet = await VirtualWallet.findOne({
            user: req.user._id,
            company: req.company._id
        });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Carteira não encontrada'
            });
        }
        
        // Ordenar transações por data (mais recentes primeiro)
        const transactions = wallet.transactions
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 50); // Limitar a 50 transações
        
        res.json({
            success: true,
            transactions,
            balance: wallet.balance
        });
        
    } catch (error) {
        console.error('Erro ao listar transações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar transações',
            error: error.message
        });
    }
}; 