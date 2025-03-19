const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const AchievementService = require('../services/AchievementService');

// Listar todas as conquistas da empresa
exports.listAchievements = async (req, res) => {
    try {
        const achievements = await Achievement.find({
            company: req.company._id,
            isActive: true
        }).sort({ 'condition.value': 1 });

        res.json({
            success: true,
            achievements
        });
    } catch (error) {
        console.error('Erro ao listar conquistas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar conquistas',
            error: error.message
        });
    }
};

// Listar conquistas do usuário
exports.listUserAchievements = async (req, res) => {
    try {
        const userAchievements = await UserAchievement.find({
            user: req.user._id,
            company: req.company._id
        })
        .populate('achievement')
        .sort({ earnedAt: -1 });

        res.json({
            success: true,
            achievements: userAchievements
        });
    } catch (error) {
        console.error('Erro ao listar conquistas do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar conquistas do usuário',
            error: error.message
        });
    }
};

// Destacar/remover destaque de uma conquista
exports.toggleHighlight = async (req, res) => {
    try {
        const { achievementId } = req.params;

        // Remover destaque de todas as conquistas do usuário
        await UserAchievement.updateMany(
            {
                user: req.user._id,
                company: req.company._id
            },
            { isHighlighted: false }
        );

        // Destacar a conquista selecionada
        const userAchievement = await UserAchievement.findOneAndUpdate(
            {
                user: req.user._id,
                company: req.company._id,
                achievement: achievementId
            },
            { isHighlighted: true },
            { new: true }
        ).populate('achievement');

        if (!userAchievement) {
            return res.status(404).json({
                success: false,
                message: 'Conquista não encontrada'
            });
        }

        res.json({
            success: true,
            achievement: userAchievement
        });
    } catch (error) {
        console.error('Erro ao destacar conquista:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao destacar conquista',
            error: error.message
        });
    }
};

// Criar nova conquista (admin)
exports.createAchievement = async (req, res) => {
    try {
        const {
            title,
            description,
            icon,
            rarity,
            condition,
            rewards
        } = req.body;

        const achievement = new Achievement({
            title,
            description,
            icon,
            rarity,
            condition,
            rewards,
            company: req.company._id
        });

        await achievement.save();

        res.json({
            success: true,
            message: 'Conquista criada com sucesso',
            achievement
        });
    } catch (error) {
        console.error('Erro ao criar conquista:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar conquista',
            error: error.message
        });
    }
};

// Atualizar conquista (admin)
exports.updateAchievement = async (req, res) => {
    try {
        const { achievementId } = req.params;
        const {
            title,
            description,
            icon,
            rarity,
            condition,
            rewards,
            isActive
        } = req.body;

        const achievement = await Achievement.findOneAndUpdate(
            {
                _id: achievementId,
                company: req.company._id
            },
            {
                title,
                description,
                icon,
                rarity,
                condition,
                rewards,
                isActive
            },
            { new: true }
        );

        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: 'Conquista não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Conquista atualizada com sucesso',
            achievement
        });
    } catch (error) {
        console.error('Erro ao atualizar conquista:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar conquista',
            error: error.message
        });
    }
};

// Excluir conquista (admin)
exports.deleteAchievement = async (req, res) => {
    try {
        const { achievementId } = req.params;

        const achievement = await Achievement.findOneAndDelete({
            _id: achievementId,
            company: req.company._id
        });

        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: 'Conquista não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Conquista excluída com sucesso'
        });
    } catch (error) {
        console.error('Erro ao excluir conquista:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir conquista',
            error: error.message
        });
    }
};

// Criar conquistas padrão para uma empresa (admin)
exports.createDefaultAchievements = async (req, res) => {
    try {
        await AchievementService.createDefaultAchievements(req.company);

        res.json({
            success: true,
            message: 'Conquistas padrão criadas com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar conquistas padrão:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar conquistas padrão',
            error: error.message
        });
    }
}; 