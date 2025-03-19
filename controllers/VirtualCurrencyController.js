import VirtualCurrency from '../models/VirtualCurrency.js';
import VirtualWallet from '../models/VirtualWallet.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Withdraw from '../models/Withdraw.js';

// Configurar moeda virtual da empresa
export const setupCurrency = async (req, res) => {
    try {
        const { name, symbol, conversionRate, settings } = req.body;
        
        let currency = await VirtualCurrency.findOne({ company: req.company._id });
        
        if (currency) {
            // Atualizar configurações existentes
            currency.name = name;
            currency.symbol = symbol;
            currency.conversionRate = conversionRate;
            if (settings) {
                currency.settings = { ...currency.settings, ...settings };
            }
        } else {
            // Criar nova configuração
            currency = new VirtualCurrency({
                company: req.company._id,
                name,
                symbol,
                conversionRate,
                settings
            });
        }
        
        await currency.save();
        res.json({ success: true, currency });
        
    } catch (error) {
        console.error('Erro ao configurar moeda virtual:', error);
        res.status(500).json({ success: false, error: 'Erro ao processar operação' });
    }
};

// Obter configurações da moeda
export const getCurrencySettings = async (req, res) => {
    try {
        const currency = await VirtualCurrency.findOne({ company: req.company._id });
        
        if (!currency) {
            return res.status(404).json({ success: false, error: 'Moeda virtual não configurada' });
        }
        
        res.json({ success: true, currency });
        
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar configurações' });
    }
};

// Criar ou obter carteira do usuário
export const getOrCreateWallet = async (req, res) => {
    try {
        let wallet = await VirtualWallet.findOne({
            user: req.user._id,
            company: req.company._id
        });
        
        if (!wallet) {
            wallet = await VirtualWallet.create({
                user: req.user._id,
                company: req.company._id
            });
        }
        
        res.json({ success: true, wallet });
        
    } catch (error) {
        console.error('Erro ao processar carteira:', error);
        res.status(500).json({ success: false, error: 'Erro ao processar operação' });
    }
};

// Adicionar transação
export const addTransaction = async (req, res) => {
    try {
        const { type, amount, reference, description, metadata } = req.body;
        
        const wallet = await VirtualWallet.findOne({
            user: req.user._id,
            company: req.company._id
        });
        
        if (!wallet) {
            return res.status(404).json({ success: false, error: 'Carteira não encontrada' });
        }
        
        const transaction = await wallet.addTransaction(type, amount, reference, description, metadata);
        res.json({ success: true, transaction, newBalance: wallet.balance });
        
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Solicitar saque
export const requestWithdraw = async (req, res) => {
    try {
        const { amount } = req.body;
        
        // Buscar carteira e configurações da moeda
        const [wallet, currency] = await Promise.all([
            VirtualWallet.findOne({ user: req.user._id, company: req.company._id }),
            VirtualCurrency.findOne({ company: req.company._id })
        ]);
        
        if (!wallet) {
            return res.status(404).json({ success: false, error: 'Carteira não encontrada' });
        }
        
        if (!currency) {
            return res.status(404).json({ success: false, error: 'Moeda virtual não configurada' });
        }
        
        // Validar valor mínimo
        if (amount < currency.settings.minWithdraw) {
            return res.status(400).json({ 
                success: false, 
                error: `Valor mínimo para saque é ${currency.settings.minWithdraw} ${currency.symbol}` 
            });
        }
        
        // Calcular taxa
        const fee = (amount * currency.settings.withdrawFee) / 100;
        const totalAmount = amount + fee;
        
        // Criar transação de saque
        const transaction = await wallet.addTransaction(
            'WITHDRAW',
            totalAmount,
            'WITHDRAW',
            'Solicitação de saque',
            { fee, originalAmount: amount }
        );
        
        res.json({ 
            success: true, 
            transaction, 
            newBalance: wallet.balance,
            withdrawDetails: {
                amount,
                fee,
                totalAmount
            }
        });
        
    } catch (error) {
        console.error('Erro ao solicitar saque:', error);
        res.status(500).json({ success: false, error: error.message });
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
            return res.status(404).json({ success: false, error: 'Carteira não encontrada' });
        }
        
        const transactions = wallet.transactions
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 50); // Limitar a 50 transações mais recentes
        
        res.json({ success: true, transactions, balance: wallet.balance });
        
    } catch (error) {
        console.error('Erro ao listar transações:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar transações' });
    }
};

// Obter estatísticas da moeda (admin)
export const getCurrencyStats = async (req, res) => {
    try {
        const [currency, wallets] = await Promise.all([
            VirtualCurrency.findOne({ company: req.company._id }),
            VirtualWallet.find({ company: req.company._id })
        ]);
        
        if (!currency) {
            return res.status(404).json({ success: false, error: 'Moeda virtual não configurada' });
        }
        
        const stats = {
            totalUsers: wallets.length,
            totalBalance: wallets.reduce((sum, w) => sum + w.balance, 0),
            totalPendingBalance: wallets.reduce((sum, w) => sum + w.pendingBalance, 0),
            totalWithdraws: wallets.reduce((sum, w) => 
                sum + w.transactions
                    .filter(t => t.type === 'WITHDRAW' && t.status === 'COMPLETED')
                    .reduce((wSum, t) => wSum + t.amount, 0)
            , 0)
        };
        
        res.json({ success: true, currency, stats });
        
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
    }
};

// Buscar estatísticas da moeda
export async function getStats(companyId) {
    try {
        const [totalSupply, totalUsers, totalTransactions] = await Promise.all([
            // Total em circulação
            VirtualWallet.aggregate([
                { $match: { company: companyId } },
                { $group: { _id: null, total: { $sum: '$balance' } } }
            ]),
            // Total de usuários com carteira
            VirtualWallet.countDocuments({ company: companyId }),
            // Total de transações
            VirtualWallet.aggregate([
                { $match: { company: companyId } },
                { $project: { transactionCount: { $size: '$transactions' } } },
                { $group: { _id: null, total: { $sum: '$transactionCount' } } }
            ])
        ]);
        
        return {
            totalSupply: totalSupply[0]?.total || 0,
            totalUsers: totalUsers || 0,
            totalTransactions: totalTransactions[0]?.total || 0
        };
        
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
            totalSupply: 0,
            totalUsers: 0,
            totalTransactions: 0
        };
    }
}

// Página de configurações da moeda virtual
export const settingsPage = async (req, res) => {
    try {
        const currency = await VirtualCurrency.findOne({ company: req.company._id });
        
        // Buscar estatísticas usando a função exportada
        const stats = await getStats(req.company._id);
        
        res.render('admin/virtualCurrency/settings', {
            currency: currency ? { ...currency.toObject(), stats } : null,
            success: req.flash('success'),
            error: req.flash('error')
        });
        
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        req.flash('error', 'Erro ao carregar configurações');
        res.redirect('/admin');
    }
};

// Salvar configurações da moeda virtual
export const saveSettings = async (req, res) => {
    try {
        const { 
            name, 
            symbol, 
            conversionRate, 
            minWithdraw, 
            withdrawFee, 
            withdrawEnabled 
        } = req.body;
        
        console.log('==== DEBUG WITHDRAW ENABLED ====');
        console.log('1. Dados brutos recebidos:', req.body);
        
        // Processar regras de recompensa do formulário
        const earnRules = {};
        for (let [key, value] of Object.entries(req.body)) {
            if (key.startsWith('earnRules.')) {
                const ruleName = key.replace('earnRules.', '');
                earnRules[ruleName] = Number(value);
            }
        }
        
        console.log('2. Regras de recompensa extraídas:', earnRules);
        
        let currency = await VirtualCurrency.findOne({ company: req.company._id });
        
        // Manter regras existentes se não forem atualizadas
        const updatedRules = currency ? {
            ...currency.settings.earnRules,
            ...earnRules
        } : {
            courseCompletion: 10,
            examCompletion: 5,
            dailyLogin: 1,
            mentorSession: 20,
            perfectExamScore: 10,
            courseStreak: 5,
            referralBonus: 50,
            firstCourseCompletion: 30,
            ...earnRules
        };
        
        console.log('3. Regras mescladas:', updatedRules);

        if (currency) {
            // Atualizar configurações existentes
            currency = await VirtualCurrency.findOneAndUpdate(
                { company: req.company._id },
                {
                    name,
                    symbol,
                    conversionRate: Number(conversionRate),
                    settings: {
                        minWithdraw: Number(minWithdraw),
                        withdrawFee: Number(withdrawFee),
                        withdrawEnabled: Boolean(withdrawEnabled),
                        earnRules: updatedRules
                    }
                },
                { new: true, runValidators: true }
            );
        } else {
            // Criar nova moeda virtual
            currency = new VirtualCurrency({
                company: req.company._id,
                name,
                symbol,
                conversionRate: Number(conversionRate),
                settings: {
                    minWithdraw: Number(minWithdraw),
                    withdrawFee: Number(withdrawFee),
                    withdrawEnabled: Boolean(withdrawEnabled),
                    earnRules: updatedRules
                }
            });
            
            await currency.save();
        }
        
        console.log('4. Configuração final:', {
            withdrawEnabled: currency.settings?.withdrawEnabled,
            earnRules: currency.settings?.earnRules
        });
        
        res.json({ 
            success: true, 
            message: 'Configurações salvas com sucesso',
            currency
        });
        
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao salvar configurações',
            error: error.message 
        });
    }
};

// Salvar regras de recompensa
export const saveEarnRules = async (req, res) => {
    try {
        console.log('==== DEBUG SAVE EARN RULES ====');
        console.log('1. Body recebido:', req.body);
        
        const earnRules = req.body.earnRules || {};
        console.log('2. Regras extraídas:', earnRules);
        
        let currency = await VirtualCurrency.findOne({ company: req.company._id });
        console.log('3. Moeda encontrada:', currency ? 'Sim' : 'Não');
        
        if (!currency) {
            return res.status(404).json({
                success: false,
                message: 'Moeda virtual não encontrada'
            });
        }
        
        console.log('4. Regras atuais:', currency.settings.earnRules);
        
        // Validar os valores
        for (let key in earnRules) {
            earnRules[key] = Number(earnRules[key]);
            if (earnRules[key] < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Os valores de recompensa não podem ser negativos'
                });
            }
        }
        
        console.log('5. Regras após conversão:', earnRules);
        
        // Atualizar as regras de recompensa mantendo as regras existentes que não foram enviadas
        const updatedRules = {
            ...currency.settings.earnRules,
            ...earnRules
        };
        
        console.log('6. Regras mescladas:', updatedRules);
        
        // Atualizar as regras de recompensa
        currency = await VirtualCurrency.findOneAndUpdate(
            { company: req.company._id },
            { 
                $set: { 
                    'settings.earnRules': updatedRules 
                }
            },
            { new: true, runValidators: true }
        );
        
        console.log('7. Moeda após atualização:', {
            earnRules: currency.settings.earnRules,
            success: !!currency
        });
        
        res.json({
            success: true,
            message: 'Regras de recompensa atualizadas com sucesso',
            earnRules: currency.settings.earnRules
        });
        
    } catch (error) {
        console.error('Erro ao salvar regras de recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar regras de recompensa',
            error: error.message
        });
    }
};

// Página de configurações de saque
export const withdrawSettingsPage = async (req, res) => {
    try {
        const currency = await VirtualCurrency.findOne({ company: req.company._id });
        
        if (!currency) {
            return res.status(404).render('error', {
                message: 'Moeda virtual não encontrada'
            });
        }

        // Calcular estatísticas
        const stats = {
            totalWithdraws: await calculateTotalWithdraws(req.company._id),
            pendingWithdraws: await countPendingWithdraws(req.company._id),
            averageWithdrawFee: await calculateAverageWithdrawFee(req.company._id)
        };

        res.render('admin/virtualCurrency/withdraw', {
            currency: {
                ...currency.toObject(),
                stats
            }
        });

    } catch (error) {
        console.error('Erro ao carregar página de configurações de saque:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar configurações de saque'
        });
    }
};

// Funções auxiliares para estatísticas
const calculateTotalWithdraws = async (companyId) => {
    try {
        const result = await Withdraw.aggregate([
            { $match: { company: companyId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        return result[0]?.total || 0;
    } catch (error) {
        console.error('Erro ao calcular total de saques:', error);
        return 0;
    }
};

const countPendingWithdraws = async (companyId) => {
    try {
        return await Withdraw.countDocuments({ 
            company: companyId, 
            status: 'pending' 
        });
    } catch (error) {
        console.error('Erro ao contar saques pendentes:', error);
        return 0;
    }
};

const calculateAverageWithdrawFee = async (companyId) => {
    try {
        const result = await Withdraw.aggregate([
            { $match: { company: companyId } },
            { $group: { _id: null, avgFee: { $avg: '$fee' } } }
        ]);
        return result[0]?.avgFee || 0;
    } catch (error) {
        console.error('Erro ao calcular taxa média:', error);
        return 0;
    }
};

// Salvar configurações de saque
export const saveWithdrawSettings = async (req, res) => {
    try {
        const settings = req.body;
        
        // Validações
        const minAmount = Number(settings.minAmount) || 0;
        if (minAmount < 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'O valor mínimo para saque não pode ser negativo' 
            });
        }
        
        const fee = Number(settings.fee) || 0;
        if (fee < 0 || fee > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'A taxa de saque deve estar entre 0% e 100%' 
            });
        }

        // Validar taxas dos métodos
        const bankTransferFee = Number(settings.methods?.bankTransfer?.fee) || 0;
        if (bankTransferFee < 0 || bankTransferFee > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'A taxa adicional para transferência bancária deve estar entre 0% e 100%' 
            });
        }

        const pixFee = Number(settings.methods?.pix?.fee) || 0;
        if (pixFee < 0 || pixFee > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'A taxa adicional para PIX deve estar entre 0% e 100%' 
            });
        }

        // Buscar moeda virtual da empresa
        const currency = await VirtualCurrency.findOne({ company: req.company._id });
        if (!currency) {
            return res.status(404).json({ 
                success: false, 
                message: 'Moeda virtual não encontrada' 
            });
        }

        // Atualizar configurações
        currency.settings.withdrawSettings = {
            enabled: settings.enabled === 'on',
            minAmount: minAmount,
            fee: fee,
            methods: {
                bankTransfer: {
                    enabled: settings.methods?.bankTransfer?.enabled === 'on',
                    fee: bankTransferFee,
                    delay: Number(settings.methods?.bankTransfer?.delay) || 2
                },
                pix: {
                    enabled: settings.methods?.pix?.enabled === 'on',
                    fee: pixFee,
                    delay: Number(settings.methods?.pix?.delay) || 0
                }
            }
        };

        await currency.save();

        return res.json({ 
            success: true, 
            message: 'Configurações de saque atualizadas com sucesso' 
        });

    } catch (error) {
        console.error('Erro ao salvar configurações de saque:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Erro interno ao salvar configurações de saque' 
        });
    }
};

// Creditar moedas para um usuário
export const creditCoins = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Usuário e valor são obrigatórios'
            });
        }

        // Buscar carteira do usuário
        let wallet = await VirtualWallet.findOne({
            user: userId,
            company: req.company._id
        });

        // Criar carteira se não existir
        if (!wallet) {
            wallet = new VirtualWallet({
                user: userId,
                company: req.company._id,
                balance: 0,
                pendingBalance: 0
            });
        }

        // Adicionar transação
        wallet.transactions.push({
            type: 'CREDIT',
            amount: Number(amount),
            description: description || 'Crédito manual por administrador',
            status: 'COMPLETED',
            relatedModel: 'User',
            relatedId: req.user._id, // ID do admin que fez o crédito
            reference: 'BONUS' // Usando um valor válido do enum
        });

        // Atualizar saldo
        wallet.balance += Number(amount);

        // Salvar alterações
        await wallet.save();

        // Registrar log da operação
        console.log('Moedas creditadas:', {
            admin: req.user.email,
            user: userId,
            amount,
            newBalance: wallet.balance
        });

        // Notificar usuário
        const notification = new Notification({
            user: userId,
            company: req.company._id,
            title: 'Moedas Creditadas',
            message: `Você recebeu ${amount} moedas em sua carteira!`,
            type: 'success'
        });
        await notification.save();

        res.json({
            success: true,
            message: 'Moedas creditadas com sucesso',
            newBalance: wallet.balance
        });

    } catch (error) {
        console.error('Erro ao creditar moedas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao creditar moedas',
            error: error.message
        });
    }
};

// Página de crédito de moedas
export const creditPage = async (req, res) => {
    try {
        // Buscar todos os usuários da empresa
        const users = await User.find({ 
            company: req.company._id,
            isAdmin: false // Excluir admins da lista
        }).select('name email');

        // Buscar configurações da moeda
        const currency = await VirtualCurrency.findOne({ 
            company: req.company._id 
        });

        res.render('admin/virtualCurrency/credit', {
            users,
            currency,
            success: req.flash('success'),
            error: req.flash('error')
        });

    } catch (error) {
        console.error('Erro ao carregar página de crédito:', error);
        req.flash('error', 'Erro ao carregar página de crédito');
        res.redirect('/admin/dashboard');
    }
};

// Salvar configurações de bônus
export const saveBonusSettings = async (req, res) => {
    try {
        console.log('=== SALVANDO CONFIGURAÇÕES DE BÔNUS ===');
        console.log('Dados recebidos:', req.body);

        // Processar configurações de bônus do formulário
        const bonusRules = {
            firstActivityOfDay: req.body['bonusRules.firstActivityOfDay'] === 'on',
            firstActivityBonus: Number(req.body['bonusRules.firstActivityBonus']),
            weekendActivity: req.body['bonusRules.weekendActivity'] === 'on',
            weekendBonus: Number(req.body['bonusRules.weekendBonus']),
            levelBonus: {
                enabled: req.body['bonusRules.levelBonus.enabled'] === 'on',
                bonusPerLevel: Number(req.body['bonusRules.levelBonus.bonusPerLevel']),
                levelsRequired: Number(req.body['bonusRules.levelBonus.levelsRequired'])
            },
            streakBonus: {
                enabled: req.body['bonusRules.streakBonus.enabled'] === 'on',
                bonusPerStreak: Number(req.body['bonusRules.streakBonus.bonusPerStreak']),
                streakRequired: Number(req.body['bonusRules.streakBonus.streakRequired']),
                maxBonus: Number(req.body['bonusRules.streakBonus.maxBonus'])
            }
        };

        console.log('Configurações processadas:', bonusRules);

        // Atualizar configurações no banco de dados
        let currency = await VirtualCurrency.findOne({ company: req.company._id });
        
        if (!currency) {
            return res.status(404).json({
                success: false,
                message: 'Moeda virtual não encontrada'
            });
        }

        // Atualizar configurações de bônus
        currency.settings.bonusRules = bonusRules;
        await currency.save();

        console.log('Configurações salvas com sucesso');

        res.json({
            success: true,
            message: 'Configurações de bônus salvas com sucesso'
        });

    } catch (error) {
        console.error('Erro ao salvar configurações de bônus:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar configurações de bônus',
            error: error.message
        });
    }
}; 