async saveWithdrawSettings(req, res) {
    try {
        const settings = req.body;
        
        // Validações
        if (settings.minAmount < 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'O valor mínimo para saque não pode ser negativo' 
            });
        }
        
        if (settings.fee < 0 || settings.fee > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'A taxa de saque deve estar entre 0% e 100%' 
            });
        }

        // Validar taxas dos métodos
        if (settings.methods?.bankTransfer?.fee < 0 || settings.methods?.bankTransfer?.fee > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'A taxa adicional para transferência bancária deve estar entre 0% e 100%' 
            });
        }

        if (settings.methods?.pix?.fee < 0 || settings.methods?.pix?.fee > 100) {
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
            minAmount: Number(settings.minAmount),
            fee: Number(settings.fee),
            methods: {
                bankTransfer: {
                    enabled: settings.methods?.bankTransfer?.enabled === 'on',
                    fee: Number(settings.methods?.bankTransfer?.fee),
                    delay: Number(settings.methods?.bankTransfer?.delay)
                },
                pix: {
                    enabled: settings.methods?.pix?.enabled === 'on',
                    fee: Number(settings.methods?.pix?.fee),
                    delay: Number(settings.methods?.pix?.delay)
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
} 