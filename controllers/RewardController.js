const RewardService = require('../services/RewardService');

// Processar recompensa
exports.processReward = async (req, res) => {
    try {
        const { type } = req.params;
        const data = req.body;

        const result = await RewardService.processReward(
            req.user,
            req.company,
            type,
            data
        );

        if (!result) {
            return res.status(400).json({
                success: false,
                message: 'Não foi possível processar a recompensa'
            });
        }

        res.json({
            success: true,
            message: 'Recompensa processada com sucesso',
            ...result
        });
    } catch (error) {
        console.error('Erro ao processar recompensa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar recompensa',
            error: error.message
        });
    }
}; 