import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import History from '../models/History.js';
import { ExamAttempt } from '../models/Exam.js';
import Message from '../models/Message.js';
import NotificationManager from './notificationManager.js';
import NodeCache from 'node-cache';

// Cache com tempo de vida menor e checagem de validade
const achievementCache = new NodeCache({ 
    stdTTL: 180, // 3 minutos
    checkperiod: 60, // Checa expiração a cada 1 minuto
    useClones: false // Otimização de performance
});

class AchievementChecker {
    static async checkAchievements(userId) {
        try {
            const cacheKey = `achievements_${userId}`;
            
            // Reduzindo tempo de cache para 5 minutos
            const cached = achievementCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 300000) {
                return cached.achievements;
            }

            const user = await User.findById(userId)
                .populate('achievements.achievement')
                .populate('completedCourses')
                .lean(); // Usando lean() para melhor performance
            
            if (!user) {
                console.error('Usuário não encontrado:', userId);
                return [];
            }

            // Buscar apenas conquistas relevantes baseado no nível e categoria do usuário
            const achievements = await Achievement.find({
                _id: { $nin: user.achievements.map(a => a.achievement?._id) },
                $or: [
                    { 'condition.minLevel': { $lte: user.level } },
                    { 'condition.minLevel': { $exists: false } }
                ]
            }).lean();

            const unlockedAchievements = [];

            for (const achievement of achievements) {
                const unlocked = await this.checkCondition(user, achievement);
                
                if (unlocked) {
                    user.achievements.push({
                        achievement: achievement._id,
                        unlockedAt: new Date(),
                        seen: false
                    });

                    const xpGained = await user.addExperience(achievement.xpReward);
                    
                    if (xpGained) {
                        unlockedAchievements.push(achievement);
                        
                        await NotificationManager.send(
                            userId,
                            'Nova Conquista!',
                            `Você desbloqueou "${achievement.title}" (+${achievement.xpReward} XP)`,
                            'success',
                            '/achievements'
                        );
                    }
                }
            }

            if (unlockedAchievements.length > 0) {
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        experience: user.experience,
                        level: user.level,
                        achievements: user.achievements
                    }
                });
            }

            // Salva no cache com timestamp
            achievementCache.set(cacheKey, {
                achievements: unlockedAchievements,
                timestamp: Date.now()
            });

            return unlockedAchievements;
        } catch (error) {
            console.error('Erro ao verificar conquistas:', error);
            return [];
        }
    }

    static async checkCondition(user, achievement) {
        try {
            console.log('\nVerificando condição específica:');
            
            switch (achievement.condition.type) {
                case 'coursesCompleted':
                    const completedCourses = await History.find({
                        user: user._id,
                        completedAt: { $ne: null },
                        progress: 100
                    });
                    console.log('Cursos completados:', completedCourses.length);
                    console.log('Necessário:', achievement.condition.value);
                    return completedCourses.length >= achievement.condition.value;

                case 'examsPassed':
                    const passedExams = await ExamAttempt.countDocuments({
                        user: user._id,
                        passed: true
                    });
                    console.log('Exames aprovados:', passedExams);
                    return passedExams >= achievement.condition.value;

                case 'experienceReached':
                    console.log('XP atual:', user.experience);
                    return user.experience >= achievement.condition.value;

                case 'messagesExchanged':
                    const messageCount = await Message.countDocuments({
                        $or: [
                            { sender: user._id },
                            { receiver: user._id }
                        ]
                    });
                    console.log('Mensagens trocadas:', messageCount);
                    return messageCount >= achievement.condition.value;

                default:
                    console.log('Tipo de condição desconhecido:', achievement.condition.type);
                    return false;
            }
        } catch (error) {
            console.error('Erro ao verificar condição:', error);
            return false;
        }
    }

    // Método para limpar cache quando necessário
    static clearUserCache(userId) {
        const cacheKey = `achievements_${userId}`;
        achievementCache.del(cacheKey);
    }
}

export default AchievementChecker; 