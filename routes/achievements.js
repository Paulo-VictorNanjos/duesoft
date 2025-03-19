import express from 'express';
import auth from '../middlewares/auth.js';
import Achievement from '../models/Achievement.js';
import { checkPlanAccess } from '../middlewares/planAccess.js';
import User from '../models/User.js';
import AchievementChecker from '../utils/achievementChecker.js';
import UserAchievement from '../models/UserAchievement.js';

const router = express.Router();

// Middleware de debug
router.use((req, res, next) => {
    console.log('\n=== Debug Achievements ===');
    console.log('URL:', req.originalUrl);
    console.log('Método:', req.method);
    console.log('Usuário autenticado:', !!req.user);
    if (req.user) {
        console.log('ID do usuário:', req.user._id);
        console.log('Empresa:', req.user.company?._id);
        console.log('Plano:', req.user.company?.plan);
        console.log('Licença ativa:', req.user.license?.isActive);
    }
    next();
});

// Listar todas as conquistas do usuário
router.get('/', auth, checkPlanAccess('achievements'), async (req, res) => {
    console.log('\n=== Processando rota principal de achievements ===');
    try {
        console.log('1. Iniciando busca do usuário');
        const user = await User.findById(req.user._id)
            .populate('achievements.achievement')
            .populate('highlightedAchievement');
        console.log('2. Usuário encontrado:', !!user);
        console.log('3. Número de conquistas do usuário:', user.achievements?.length || 0);

        console.log('4. Buscando todas as conquistas');
        const allAchievements = await Achievement.find();
        console.log('5. Total de conquistas disponíveis:', allAchievements.length);
        
        console.log('6. Organizando conquistas por categoria');
        const achievementsByCategory = {
            cursos: [],
            provas: [],
            experiência: [],
            social: []
        };

        allAchievements.forEach(achievement => {
            console.log(`7. Processando conquista: ${achievement.title}`);
            const userAchievement = user.achievements.find(
                ua => ua.achievement && ua.achievement._id.toString() === achievement._id.toString()
            );

            const isUnlocked = !!userAchievement;
            console.log(`8. Conquista desbloqueada: ${isUnlocked}`);

            if (achievement.category in achievementsByCategory) {
                achievementsByCategory[achievement.category].push({
                    ...achievement.toObject(),
                    unlocked: isUnlocked,
                    unlockedAt: userAchievement ? userAchievement.unlockedAt : null,
                    progress: userAchievement ? userAchievement.progress || 100 : 0
                });
            } else {
                console.log(`AVISO: Categoria desconhecida: ${achievement.category}`);
            }
        });

        console.log('9. Preparando dados para renderização');
        console.log('Categorias:', Object.keys(achievementsByCategory));
        Object.entries(achievementsByCategory).forEach(([category, achievements]) => {
            console.log(`${category}: ${achievements.length} conquistas`);
        });

        console.log('10. Renderizando página');
        res.render('achievements/index', {
            achievementsByCategory,
            user: user,
            error: req.flash('error'),
            success: req.flash('success')
        });
        console.log('11. Renderização concluída');

    } catch (error) {
        console.error('\n=== ERRO NA ROTA DE ACHIEVEMENTS ===');
        console.error('Tipo do erro:', error.name);
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        console.error('Contexto:', {
            userId: req?.user?._id,
            companyId: req?.user?.company?._id,
            plan: req?.user?.company?.plan
        });
        
        req.flash('error', 'Erro ao carregar conquistas');
        return res.redirect('/dashboard');
    }
});

// Marcar conquista como vista
router.post('/:id/seen', auth, checkPlanAccess('achievements'), async (req, res) => {
    try {
        await req.user.updateOne({
            'achievements.$[elem].seen': true
        }, {
            arrayFilters: [{ 'elem.achievement': req.params.id }]
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Rota para buscar conquistas do usuário para o modal de destaque
router.get('/user', auth, checkPlanAccess('achievements'), async (req, res) => {
    try {
        // Buscar o usuário com suas conquistas populadas
        const user = await User.findById(req.user._id)
            .populate('achievements.achievement');

        // Filtrar apenas as conquistas desbloqueadas
        const unlockedAchievements = user.achievements
            .filter(ua => ua.achievement) // Garante que a conquista existe
            .map(ua => ({
                _id: ua.achievement._id,
                title: ua.achievement.title,
                description: ua.achievement.description,
                icon: ua.achievement.icon,
                rarity: ua.achievement.rarity
            }));

        res.json(unlockedAchievements);
    } catch (error) {
        console.error('Erro ao buscar conquistas:', error);
        res.status(500).json({ success: false });
    }
});

// Rota para destacar conquista
router.post('/highlight/:id', auth, checkPlanAccess('achievements'), async (req, res) => {
    try {
        const achievementId = req.params.id;
        
        // Verifica se a conquista existe
        const achievement = await Achievement.findById(achievementId);
        if (!achievement) {
            return res.status(404).json({ 
                success: false, 
                message: 'Conquista não encontrada' 
            });
        }

        // Verifica se o usuário tem essa conquista
        const user = await User.findById(req.user._id);
        const hasAchievement = user.achievements.some(
            ua => ua.achievement && ua.achievement.toString() === achievementId
        );

        if (!hasAchievement) {
            return res.status(400).json({ 
                success: false, 
                message: 'Você precisa completar esta conquista primeiro' 
            });
        }

        // Atualiza a conquista em destaque do usuário
        user.highlightedAchievement = achievementId;
        await user.save();

        console.log('Conquista destacada:', achievementId); // Debug

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao destacar conquista:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao destacar conquista'
        });
    }
});

export default router; 