import PaymentInfo from '../models/PaymentInfo.js';

export const paymentInfoPage = async (req, res) => {
    try {
        let paymentInfo = await PaymentInfo.findOne({
            user: req.user._id,
            company: req.company._id
        });

        res.render('virtualCurrency/payment-info', {
            paymentInfo
        });
    } catch (error) {
        console.error('Erro ao carregar dados de pagamento:', error);
        req.flash('error', 'Erro ao carregar dados de pagamento');
        res.redirect('/virtual-currency/wallet');
    }
};

export const addPixKey = async (req, res) => {
    try {
        const { type, key, isDefault } = req.body;

        let paymentInfo = await PaymentInfo.findOne({
            user: req.user._id,
            company: req.company._id
        });

        if (!paymentInfo) {
            paymentInfo = new PaymentInfo({
                user: req.user._id,
                company: req.company._id,
                pixKeys: [],
                bankAccounts: []
            });
        }

        paymentInfo.pixKeys.push({ type, key, isDefault });
        await paymentInfo.save();

        res.json({ message: 'Chave PIX adicionada com sucesso' });
    } catch (error) {
        console.error('Erro ao adicionar chave PIX:', error);
        res.status(500).json({ message: 'Erro ao adicionar chave PIX' });
    }
};

export const deletePixKey = async (req, res) => {
    try {
        const { keyId } = req.params;

        const paymentInfo = await PaymentInfo.findOne({
            user: req.user._id,
            company: req.company._id
        });

        if (!paymentInfo) {
            return res.status(404).json({ message: 'Dados de pagamento não encontrados' });
        }

        paymentInfo.pixKeys = paymentInfo.pixKeys.filter(key => key._id.toString() !== keyId);
        await paymentInfo.save();

        res.json({ message: 'Chave PIX excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir chave PIX:', error);
        res.status(500).json({ message: 'Erro ao excluir chave PIX' });
    }
};

export const setDefaultPixKey = async (req, res) => {
    try {
        const { keyId } = req.params;

        const paymentInfo = await PaymentInfo.findOne({
            user: req.user._id,
            company: req.company._id
        });

        if (!paymentInfo) {
            return res.status(404).json({ message: 'Dados de pagamento não encontrados' });
        }

        paymentInfo.pixKeys.forEach(key => {
            key.isDefault = key._id.toString() === keyId;
        });

        await paymentInfo.save();

        res.json({ message: 'Chave PIX padrão definida com sucesso' });
    } catch (error) {
        console.error('Erro ao definir chave PIX padrão:', error);
        res.status(500).json({ message: 'Erro ao definir chave PIX padrão' });
    }
};

export const addBankAccount = async (req, res) => {
    try {
        const { bankCode, bankName, agency, account, accountType, document, holderName, isDefault } = req.body;

        let paymentInfo = await PaymentInfo.findOne({
            user: req.user._id,
            company: req.company._id
        });

        if (!paymentInfo) {
            paymentInfo = new PaymentInfo({
                user: req.user._id,
                company: req.company._id,
                pixKeys: [],
                bankAccounts: []
            });
        }

        paymentInfo.bankAccounts.push({
            bankCode,
            bankName,
            agency,
            account,
            accountType,
            document,
            holderName,
            isDefault
        });

        await paymentInfo.save();

        res.json({ message: 'Conta bancária adicionada com sucesso' });
    } catch (error) {
        console.error('Erro ao adicionar conta bancária:', error);
        res.status(500).json({ message: 'Erro ao adicionar conta bancária' });
    }
};

export const deleteBankAccount = async (req, res) => {
    try {
        const { accountId } = req.params;

        const paymentInfo = await PaymentInfo.findOne({
            user: req.user._id,
            company: req.company._id
        });

        if (!paymentInfo) {
            return res.status(404).json({ message: 'Dados de pagamento não encontrados' });
        }

        paymentInfo.bankAccounts = paymentInfo.bankAccounts.filter(account => account._id.toString() !== accountId);
        await paymentInfo.save();

        res.json({ message: 'Conta bancária excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir conta bancária:', error);
        res.status(500).json({ message: 'Erro ao excluir conta bancária' });
    }
};

export const setDefaultBankAccount = async (req, res) => {
    try {
        const { accountId } = req.params;

        const paymentInfo = await PaymentInfo.findOne({
            user: req.user._id,
            company: req.company._id
        });

        if (!paymentInfo) {
            return res.status(404).json({ message: 'Dados de pagamento não encontrados' });
        }

        paymentInfo.bankAccounts.forEach(account => {
            account.isDefault = account._id.toString() === accountId;
        });

        await paymentInfo.save();

        res.json({ message: 'Conta bancária padrão definida com sucesso' });
    } catch (error) {
        console.error('Erro ao definir conta bancária padrão:', error);
        res.status(500).json({ message: 'Erro ao definir conta bancária padrão' });
    }
}; 