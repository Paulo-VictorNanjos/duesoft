import VirtualCurrency from '../models/VirtualCurrency.js';
import VirtualWallet from '../models/VirtualWallet.js';
import NotificationManager from '../utils/notificationManager.js';
import Notification from '../models/Notification.js';
import { ObjectId } from 'mongodb';

class RewardService {
    /**
     * Processa uma recompensa para o usuário
     * @param {Object} user - Usuário
     * @param {Object} company - Empresa
     * @param {String} type - Tipo da recompensa
     * @param {Object} data - Dados adicionais da recompensa
     */
    static async processReward(user, company, type, data) {
        console.log('\n=== INÍCIO DO PROCESSAMENTO DE RECOMPENSA ===');
        console.log('Tipo:', type);
        console.log('Usuário:', user._id);
        console.log('Empresa:', company._id);
        console.log('Dados:', JSON.stringify(data, null, 2));

        // Validar tipo de recompensa
        const rewardConfig = this.getRewardTypes().find(r => r.key === type);
        if (!rewardConfig) {
            console.error('❌ Tipo de recompensa inválido:', type);
            return null;
        }
        console.log('✓ Tipo de recompensa válido:', rewardConfig);

            // Buscar configurações da moeda virtual
        console.log('\nBuscando configurações da moeda virtual...');
            const currency = await VirtualCurrency.findOne({ company: company._id });
        console.log('Moeda encontrada:', currency ? '✓' : '❌');
        if (currency) {
            console.log('Configurações:', JSON.stringify(currency.settings, null, 2));
        }

        const validation = this.validateCurrencySettings(currency);
        if (!validation.isValid) {
            console.error('❌ Configurações de moeda inválidas:', validation.errors);
            return null;
        }
        console.log('✓ Configurações de moeda válidas');

        // Validar dados específicos do tipo
        if (type === 'COURSE_COMPLETION' || type === 'FIRST_COURSE') {
            console.log('\n=== VALIDAÇÃO DE CURSO ===');
            console.log('CourseId:', data.courseId);
            console.log('Progress:', data.progress);
            console.log('RelatedModel:', data.relatedModel);

            if (!data.courseId || !data.progress) {
                console.error('❌ Dados inválidos para recompensa de curso:', {
                    courseId: data.courseId ? 'presente' : 'ausente',
                    progress: data.progress ? 'presente' : 'ausente'
                });
                return null;
            }

            if (data.progress < 100) {
                console.error('❌ Curso não está 100% completo:', data.progress);
                return null;
            }

            // Verificar se já recebeu recompensa por este curso
            console.log('\nVerificando recompensa anterior...');
            const existingReward = await VirtualWallet.findOne({
                user: user._id,
                company: company._id,
                'transactions.relatedModel': 'Course',
                'transactions.relatedId': data.courseId
            });

            if (existingReward) {
                console.log('❌ Usuário já recebeu recompensa por este curso');
                console.log('Recompensa existente:', existingReward);
                return null;
            }
            console.log('✓ Nenhuma recompensa anterior encontrada');
        }

        // Buscar ou criar carteira
        console.log('\n=== VERIFICANDO CARTEIRA ===');
        let wallet = await VirtualWallet.findOne({
            user: user._id,
            company: company._id
        });

            if (!wallet) {
            console.log('Criando nova carteira para o usuário');
                wallet = new VirtualWallet({
                    user: user._id,
                    company: company._id,
                    balance: 0,
                transactions: []
            });
        } else {
            console.log('Carteira encontrada:', {
                id: wallet._id,
                balance: wallet.balance,
                transactionCount: wallet.transactions.length
            });
            
            // Validar e corrigir transações existentes
            wallet.transactions = wallet.transactions.map(t => {
                if (!t.referenceModel) {
                    t.referenceModel = t.reference === 'COURSE' ? 'Course' :
                                      t.reference === 'EXAM' ? 'Exam' :
                                      t.reference === 'MENTORING' ? 'MentorSession' : 'Bonus';
                }
                return t;
            });
        }

        // Preparar dados para cálculo
        console.log('\n=== PREPARANDO CÁLCULO ===');
        const calculationData = {
            userLevel: user.level || 1,
            isFirstOfDay: await this.isFirstLoginOfDay(user._id),
            isWeekend: new Date().getDay() % 6 === 0,
            streak: await this.calculateStreak(user._id, type)
        };
        console.log('Dados para cálculo:', calculationData);

            // Calcular recompensa
        const reward = this.calculateReward(
            validation.settings.earnRules,
            rewardConfig.field,
            calculationData,
            currency.settings
        );

        if (!reward || reward <= 0) {
            console.error('❌ Recompensa inválida calculada');
            return null;
        }
        console.log('✓ Recompensa calculada:', reward);

            // Adicionar transação
        console.log('\n=== CRIANDO TRANSAÇÃO ===');
        const transaction = {
            type: 'CREDIT',
                amount: reward,
            description: `Recompensa por ${rewardConfig.description}`,
                status: 'COMPLETED',
            reference: data.relatedModel === 'Course' ? 'COURSE' : 
                      data.relatedModel === 'Exam' ? 'EXAM' : 
                      data.relatedModel === 'MentorSession' ? 'MENTORING' : 'BONUS',
            referenceId: data.courseId || data.examId || data.sessionId,
            referenceModel: data.relatedModel || 'Course',
            metadata: {
                rewardType: type,
                calculationData
            }
        };
        console.log('Transação criada:', transaction);

        wallet.transactions.push(transaction);
            wallet.balance += reward;

            // Salvar alterações
        console.log('\n=== SALVANDO ALTERAÇÕES ===');
        try {
            await wallet.save();
            console.log('✓ Carteira salva com sucesso');
        } catch (error) {
            console.error('❌ Erro ao salvar carteira:', error);
            return null;
        }

        // Enviar notificação
        console.log('\n=== ENVIANDO NOTIFICAÇÃO ===');
        try {
            await NotificationManager.send(
                user._id,
                'Recompensa Recebida!',
                `Você recebeu ${reward} moedas por ${rewardConfig.description}`,
                'success',
                null,
                company._id
            );
            console.log('✓ Notificação enviada com sucesso');
        } catch (error) {
            console.error('❌ Erro ao enviar notificação:', error);
        }

        console.log('\n=== PROCESSAMENTO CONCLUÍDO ===');
            console.log('Recompensa processada com sucesso:', {
                type,
                reward,
                newBalance: wallet.balance
            });

            return {
                success: true,
                reward,
            balance: wallet.balance
        };
    }

    /**
     * Retorna os tipos de recompensa disponíveis
     */
    static getRewardTypes() {
        // Mapeamento exato com os campos do frontend
        return [
            {
                key: 'COURSE_COMPLETION',
                field: 'courseCompletion', // name="earnRules.courseCompletion"
                description: 'completar um curso',
                requires: ['courseId', 'progress'],
                validate: (data) => data.progress === 100,
                defaultValue: 10
            },
            {
                key: 'FIRST_COURSE',
                field: 'firstCourseCompletion', // name="earnRules.firstCourseCompletion"
                description: 'primeiro curso completado',
                requires: ['courseId'],
                validate: async (data, user) => {
                    const completedCourses = await this.getCompletedCoursesCount(user._id);
                    return completedCourses === 1;
                },
                defaultValue: 30
            },
            {
                key: 'EXAM_COMPLETION',
                field: 'examCompletion', // name="earnRules.examCompletion"
                description: 'completar uma prova',
                requires: ['examId', 'score'],
                validate: (data) => data.score >= 0 && data.score <= 100,
                defaultValue: 5
            },
            {
                key: 'PERFECT_EXAM',
                field: 'perfectExamScore', // name="earnRules.perfectExamScore"
                description: 'nota máxima na prova',
                requires: ['examId', 'score'],
                validate: (data) => data.score === 100,
                defaultValue: 10
            },
            {
                key: 'DAILY_LOGIN',
                field: 'dailyLogin', // name="earnRules.dailyLogin"
                description: 'login diário',
                requires: [],
                validate: async (userId) => await this.isFirstLoginOfDay(userId),
                defaultValue: 1
            },
            {
                key: 'MENTOR_SESSION',
                field: 'mentorSession', // name="earnRules.mentorSession"
                description: 'sessão de mentoria',
                requires: ['sessionId'],
                validate: async (data) => await this.isValidMentorSession(data.sessionId),
                defaultValue: 20
            },
            {
                key: 'MENTOR_RATING',
                field: 'mentorRating', // name="earnRules.mentorRating"
                description: 'avaliação de mentoria',
                requires: ['sessionId', 'rating'],
                validate: (data) => data.rating >= 1 && data.rating <= 5,
                defaultValue: 10
            },
            {
                key: 'REFERRAL',
                field: 'referralBonus', // name="earnRules.referralBonus"
                description: 'bônus por indicação',
                requires: ['referredUserId'],
                validate: async (data) => await this.isValidReferral(data.referredUserId),
                defaultValue: 50
            },
            {
                key: 'COURSE_STREAK',
                field: 'courseStreak', // name="earnRules.courseStreak"
                description: 'sequência de cursos',
                requires: ['streak'],
                validate: (data) => data.streak > 0,
                defaultValue: 5
            }
        ];
    }

    /**
     * Valida as configurações de moeda virtual
     */
    static validateCurrencySettings(currency) {
        console.log('\n=== VALIDANDO CONFIGURAÇÕES DE MOEDA ===');
        
        // Obter tipos de recompensa e seus valores padrão
        const rewardTypes = this.getRewardTypes();
        const requiredRules = rewardTypes.map(type => ({
            key: type.field,
            defaultValue: type.defaultValue
        }));

        const errors = [];

        // Validar estrutura básica
        if (!currency) {
            console.log('❌ Moeda virtual não encontrada');
            errors.push('Moeda virtual não encontrada');
            return { isValid: false, errors };
        }

        if (!currency.settings) {
            console.log('❌ Configurações não definidas');
            errors.push('Configurações não definidas');
            return { isValid: false, errors };
        }

        if (!currency.settings.earnRules) {
            console.log('❌ Regras de ganho não definidas');
            errors.push('Regras de ganho não definidas');
            return { isValid: false, errors };
        }

        console.log('Configurações encontradas:', currency.settings.earnRules);

        // Validar cada regra necessária e usar valor padrão se necessário
        for (const rule of requiredRules) {
            const value = currency.settings.earnRules[rule.key];
            
            if (value === undefined || value === null) {
                console.log(`⚠️ Regra '${rule.key}' não definida, usando valor padrão: ${rule.defaultValue}`);
                currency.settings.earnRules[rule.key] = rule.defaultValue;
                continue;
            }

            if (typeof value !== 'number') {
                console.log(`⚠️ Valor da regra '${rule.key}' não é um número, usando valor padrão: ${rule.defaultValue}`);
                currency.settings.earnRules[rule.key] = rule.defaultValue;
                continue;
            }

            if (value < 0) {
                console.log(`⚠️ Valor da regra '${rule.key}' é negativo, usando valor padrão: ${rule.defaultValue}`);
                currency.settings.earnRules[rule.key] = rule.defaultValue;
                continue;
            }

            console.log(`✓ Regra '${rule.key}': ${value}`);
        }

        // Log do resultado
        if (errors.length > 0) {
            console.log('\nErros encontrados:');
            errors.forEach(error => console.log(`❌ ${error}`));
        } else {
            console.log('\n✅ Todas as configurações estão válidas');
        }

        return {
            isValid: true,
            errors,
            settings: currency.settings
        };
    }

    /**
     * Calcula a recompensa com validações adicionais
     */
    static calculateReward(earnRules, ruleKey, data, settings) {
        console.log('\n=== CÁLCULO DE RECOMPENSA ===');
        console.log('Regra:', ruleKey);
        console.log('Regras disponíveis:', earnRules);
        console.log('Dados para cálculo:', JSON.stringify(data, null, 2));

        const baseReward = earnRules[ruleKey];
        console.log('Recompensa base encontrada:', baseReward);

        if (!baseReward) {
            console.error('❌ Recompensa base não encontrada para a regra:', ruleKey);
            console.error('Regras disponíveis:', Object.keys(earnRules));
            return 0;
        }

        const bonusConfig = {
            level: {
                condition: (data, settings) => settings?.bonusRules?.levelBonus?.enabled && data.userLevel,
                calculate: (data, settings) => {
                    const { bonusPerLevel, levelsRequired } = settings.bonusRules.levelBonus;
                    return Math.floor(data.userLevel / levelsRequired) * (bonusPerLevel / 100);
                },
                description: (data, settings) => {
                    const { bonusPerLevel, levelsRequired } = settings.bonusRules.levelBonus;
                    return `Nível ${data.userLevel}: +${Math.floor(data.userLevel / levelsRequired) * bonusPerLevel}%`;
                }
            },
            firstOfDay: {
                condition: (data, settings) => settings?.bonusRules?.firstActivityOfDay && data.isFirstOfDay,
                calculate: (data, settings) => settings.bonusRules.firstActivityBonus / 100,
                description: (data, settings) => `Primeira atividade: +${settings.bonusRules.firstActivityBonus}%`
            },
            weekend: {
                condition: (data, settings) => settings?.bonusRules?.weekendActivity && data.isWeekend,
                calculate: (data, settings) => settings.bonusRules.weekendBonus / 100,
                description: (data, settings) => `Fim de semana: +${settings.bonusRules.weekendBonus}%`
            },
            streak: {
                condition: (data, settings) => settings?.bonusRules?.streakBonus?.enabled && data.streak,
                calculate: (data, settings) => {
                    const { bonusPerStreak, streakRequired, maxBonus } = settings.bonusRules.streakBonus;
                    const bonus = Math.floor(data.streak / streakRequired) * (bonusPerStreak / 100);
                    return Math.min(bonus, maxBonus / 100);
                },
                description: (data, settings) => {
                    const { bonusPerStreak, streakRequired } = settings.bonusRules.streakBonus;
                    const bonus = Math.floor(data.streak / streakRequired) * bonusPerStreak;
                    return `Sequência ${data.streak}x: +${bonus}%`;
                }
            }
        };

        // Calcula todos os bônus aplicáveis
        const appliedBonuses = Object.entries(bonusConfig)
            .filter(([_, bonus]) => bonus.condition(data, settings))
            .map(([_, bonus]) => ({
                multiplier: bonus.calculate(data, settings),
                description: bonus.description(data, settings)
            }));

        // Calcula o multiplicador total
        const totalMultiplier = 1 + appliedBonuses.reduce((sum, bonus) => sum + bonus.multiplier, 0);
        
        // Calcula a recompensa final
        const finalReward = Math.round(baseReward * totalMultiplier);

        // Log dos detalhes
        console.log('\nDetalhes do cálculo:');
        console.log('Recompensa base:', baseReward);
        console.log('Multiplicador total:', totalMultiplier.toFixed(2), 'x');
        console.log('Bônus aplicados:', appliedBonuses.map(b => b.description).join(', ') || 'Nenhum');
        console.log('Recompensa final:', finalReward);

        return finalReward;
    }

    /**
     * Gera a descrição da recompensa
     */
    static getRewardDescription(type, data) {
        const descriptions = {
            'COURSE_COMPLETION': 'Recompensa por completar um curso',
            'FIRST_COURSE': 'Bônus pelo primeiro curso completado',
            'EXAM_COMPLETION': 'Recompensa por completar uma prova',
            'PERFECT_EXAM': 'Bônus por nota máxima na prova',
            'DAILY_LOGIN': 'Recompensa por login diário',
            'MENTOR_SESSION': 'Recompensa por sessão de mentoria',
            'MENTOR_RATING': 'Recompensa por avaliação de mentoria',
            'REFERRAL': 'Bônus por indicação',
            'COURSE_STREAK': 'Bônus por sequência de cursos'
        };

        const bonusDescriptions = {
            streak: data => data.streak && `${data.streak}ª vez consecutiva`,
            rating: data => data.rating && `${data.rating} estrelas`,
            firstOfDay: data => data.isFirstOfDay && 'Bônus primeira atividade do dia',
            weekend: data => data.isWeekend && 'Bônus de fim de semana',
            score: data => data.score && `Nota: ${data.score}%`,
            quickCompletion: data => data.completionTime && data.averageTime && 'Conclusão rápida'
        };

        const description = descriptions[type] || 'Recompensa';
        const bonuses = Object.values(bonusDescriptions)
            .map(fn => fn(data))
            .filter(Boolean);

        return bonuses.length > 0 ? `${description} (${bonuses.join(', ')})` : description;
    }

    // Método auxiliar para verificar se é primeira atividade do dia
    static async isFirstActivityOfDay(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const transactions = await VirtualWallet.findOne(
            { user: userId, 'transactions.createdAt': { $gte: today } }
        );
        
        return !transactions;
    }

    // Método auxiliar para verificar se é fim de semana
    static isWeekend() {
        const day = new Date().getDay();
        return day === 0 || day === 6;
    }

    // Método auxiliar para calcular streak
    static async calculateStreak(userId, type) {
        try {
            const transactions = await VirtualWallet.findOne(
                { user: userId },
                { transactions: { $slice: -10 } } // Pegar últimas 10 transações
            );

            if (!transactions?.transactions) return 0;

            let streak = 0;
            const recentTransactions = transactions.transactions
                .filter(t => t.type === 'EARN' && t.description.includes(type))
                .sort((a, b) => b.createdAt - a.createdAt);

            for (let i = 0; i < recentTransactions.length; i++) {
                if (i === 0 || this.isConsecutiveDay(recentTransactions[i-1].createdAt, recentTransactions[i].createdAt)) {
                    streak++;
                } else {
                    break;
                }
            }

            return streak;
        } catch (error) {
            console.error('Erro ao calcular streak:', error);
            return 0;
        }
    }

    // Método auxiliar para verificar dias consecutivos
    static isConsecutiveDay(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        d1.setHours(0,0,0,0);
        d2.setHours(0,0,0,0);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 1;
    }

    /**
     * Métodos auxiliares de validação
     */
    static async getCompletedCoursesCount(userId) {
        try {
            const wallet = await VirtualWallet.findOne({ user: userId });
            return wallet?.transactions.filter(t => 
                t.type === 'EARN' && 
                t.description.includes('completar um curso')
            ).length || 0;
        } catch (error) {
            console.error('Erro ao contar cursos completos:', error);
            return 0;
        }
    }

    static async isFirstLoginOfDay(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const logins = await VirtualWallet.findOne({
            user: userId,
            'transactions.type': 'EARN',
            'transactions.description': 'Recompensa por login diário',
            'transactions.createdAt': { $gte: today }
        });

        return !logins;
    }

    static async isValidMentorSession(sessionId) {
        // Implementar validação de sessão de mentoria
        return true; // Temporário
    }

    static async isValidReferral(referredUserId) {
        // Implementar validação de indicação
        return true; // Temporário
    }

    /**
     * Função para testar todas as recompensas
     */
    static async testRewards(user, company) {
        console.log('\n=== TESTE DE TODAS AS RECOMPENSAS ===\n');
        const results = {
            success: [],
            failed: []
        };

        // 1. COURSE_COMPLETION
        console.log('1. Testando COURSE_COMPLETION\n');
        try {
            const courseResult = await this.testSpecificReward(user, company, 'COURSE_COMPLETION', {
                courseId: new ObjectId(),
                progress: 100,
                relatedModel: 'Course'
            });
            if (courseResult) results.success.push('COURSE_COMPLETION');
            else results.failed.push('COURSE_COMPLETION');
        } catch (error) {
            console.warn('Erro em COURSE_COMPLETION:', error);
            results.failed.push('COURSE_COMPLETION');
        }

        // 2. FIRST_COURSE
        console.log('\n2. Testando FIRST_COURSE\n');
        try {
            const firstCourseResult = await this.testSpecificReward(user, company, 'FIRST_COURSE', {
                courseId: new ObjectId(),
                progress: 100,
                relatedModel: 'Course'
            });
            if (firstCourseResult) results.success.push('FIRST_COURSE');
            else results.failed.push('FIRST_COURSE');
        } catch (error) {
            console.warn('Erro em FIRST_COURSE:', error);
            results.failed.push('FIRST_COURSE');
        }

        // 3. EXAM_COMPLETION
        console.log('\n3. Testando EXAM_COMPLETION\n');
        try {
            const examResult = await this.testSpecificReward(user, company, 'EXAM_COMPLETION', {
                examId: new ObjectId(),
                score: 85,
                relatedModel: 'Exam'
            });
            if (examResult) results.success.push('EXAM_COMPLETION');
            else results.failed.push('EXAM_COMPLETION');
        } catch (error) {
            console.warn('Erro em EXAM_COMPLETION:', error);
            results.failed.push('EXAM_COMPLETION');
        }

        // 4. PERFECT_EXAM
        console.log('\n4. Testando PERFECT_EXAM\n');
        try {
            const perfectExamResult = await this.testSpecificReward(user, company, 'PERFECT_EXAM', {
                examId: new ObjectId(),
                score: 100,
                relatedModel: 'Exam'
            });
            if (perfectExamResult) results.success.push('PERFECT_EXAM');
            else results.failed.push('PERFECT_EXAM');
        } catch (error) {
            console.warn('Erro em PERFECT_EXAM:', error);
            results.failed.push('PERFECT_EXAM');
        }

        // 5. DAILY_LOGIN
        console.log('\n5. Testando DAILY_LOGIN\n');
        try {
            const loginResult = await this.testSpecificReward(user, company, 'DAILY_LOGIN', {
                relatedModel: 'Login'
            });
            if (loginResult) results.success.push('DAILY_LOGIN');
            else results.failed.push('DAILY_LOGIN');
        } catch (error) {
            console.warn('Erro em DAILY_LOGIN:', error);
            results.failed.push('DAILY_LOGIN');
        }

        // 6. MENTOR_SESSION
        console.log('\n6. Testando MENTOR_SESSION\n');
        try {
            const mentorSessionResult = await this.testSpecificReward(user, company, 'MENTOR_SESSION', {
                sessionId: new ObjectId(),
                relatedModel: 'MentorSession'
            });
            if (mentorSessionResult) results.success.push('MENTOR_SESSION');
            else results.failed.push('MENTOR_SESSION');
        } catch (error) {
            console.warn('Erro em MENTOR_SESSION:', error);
            results.failed.push('MENTOR_SESSION');
        }

        // 7. MENTOR_RATING
        console.log('\n7. Testando MENTOR_RATING\n');
        try {
            const mentorRatingResult = await this.testSpecificReward(user, company, 'MENTOR_RATING', {
                sessionId: new ObjectId(),
                rating: 5,
                relatedModel: 'MentorRating'
            });
            if (mentorRatingResult) results.success.push('MENTOR_RATING');
            else results.failed.push('MENTOR_RATING');
        } catch (error) {
            console.warn('Erro em MENTOR_RATING:', error);
            results.failed.push('MENTOR_RATING');
        }

        // 8. REFERRAL
        console.log('\n8. Testando REFERRAL\n');
        try {
            const referralResult = await this.testSpecificReward(user, company, 'REFERRAL', {
                referredUserId: new ObjectId(),
                relatedModel: 'User'
            });
            if (referralResult) results.success.push('REFERRAL');
            else results.failed.push('REFERRAL');
        } catch (error) {
            console.warn('Erro em REFERRAL:', error);
            results.failed.push('REFERRAL');
        }

        // 9. COURSE_STREAK
        console.log('\n9. Testando COURSE_STREAK\n');
        try {
            const streakResult = await this.testSpecificReward(user, company, 'COURSE_STREAK', {
                streak: 3,
                relatedModel: 'Course'
            });
            if (streakResult) results.success.push('COURSE_STREAK');
            else results.failed.push('COURSE_STREAK');
        } catch (error) {
            console.warn('Erro em COURSE_STREAK:', error);
            results.failed.push('COURSE_STREAK');
        }

        // Relatório final
        console.log('\n=== RELATÓRIO FINAL DE TESTES ===');
        console.log('Sucessos:', results.success.length);
        console.log('Falhas:', results.failed.length);
        console.log('\nTestes bem-sucedidos:', results.success.join(', ') || 'Nenhum');
        console.log('Testes falhos:', results.failed.join(', ') || 'Nenhum');

        return results;
    }

    /**
     * Função auxiliar para log de resultados de teste
     */
    static logTestResult(type, result, results) {
        if (result && result.success) {
            console.log(`✅ ${type} funcionou corretamente`);
            console.log('Recompensa:', result.reward);
            console.log('Novo saldo:', result.newBalance);
            results.success.push(type);
        } else {
            console.log(`❌ ${type} falhou`);
            results.failed.push(type);
        }
    }

    /**
     * Função para testar uma recompensa específica
     */
    static async testSpecificReward(user, company, type, data = {}) {
        console.log(`\n=== TESTE DE RECOMPENSA: ${type} ===`);
        
        try {
            // Preparar dados de teste
            const testData = {
                ...this.getDefaultTestData(type),
                ...data
            };

            console.log('Dados de teste:', testData);

            // Processar recompensa
            const result = await this.processReward(user, company, type, testData);

            // Log do resultado
            if (result && result.success) {
                console.log('\n✅ Teste bem-sucedido!');
                console.log('Recompensa:', result.reward);
                console.log('Novo saldo:', result.newBalance);
                console.log('Transação:', result.transaction);
            } else {
                console.log('\n❌ Teste falhou!');
            }

            return result;

        } catch (error) {
            console.error(`\n❌ Erro ao testar ${type}:`, error);
            return null;
        }
    }

    /**
     * Retorna dados de teste padrão para cada tipo de recompensa
     */
    static getDefaultTestData(type) {
        const defaults = {
            'COURSE_COMPLETION': {
                courseId: 'test_course_id',
                progress: 100,
                relatedModel: 'Course'
            },
            'FIRST_COURSE': {
                courseId: 'test_first_course_id',
                relatedModel: 'Course'
            },
            'EXAM_COMPLETION': {
                examId: 'test_exam_id',
                score: 85,
                relatedModel: 'Exam'
            },
            'PERFECT_EXAM': {
                examId: 'test_perfect_exam_id',
                score: 100,
                relatedModel: 'Exam'
            },
            'DAILY_LOGIN': {
                relatedModel: 'Login'
            },
            'MENTOR_SESSION': {
                sessionId: 'test_session_id',
                relatedModel: 'MentorSession'
            },
            'MENTOR_RATING': {
                sessionId: 'test_session_id',
                rating: 5,
                relatedModel: 'MentorRating'
            },
            'REFERRAL': {
                referredUserId: 'test_referred_user_id',
                relatedModel: 'User'
            },
            'COURSE_STREAK': {
                streak: 3,
                relatedModel: 'Course'
            }
        };

        return defaults[type] || {};
    }

    /**
     * Função para testar recompensa de curso real
     */
    static async testCourseReward(user, company, courseId, progress) {
        return this.testSpecificReward(user, company, 'COURSE_COMPLETION', {
            courseId,
            progress,
            relatedModel: 'Course',
            completionTime: Date.now(),
            averageTime: Date.now() + 3600000 // 1 hora como tempo médio
        });
    }

    /**
     * Função para testar recompensa de prova real
     */
    static async testExamReward(user, company, examId, score) {
        return this.testSpecificReward(user, company, score === 100 ? 'PERFECT_EXAM' : 'EXAM_COMPLETION', {
            examId,
            score,
            relatedModel: 'Exam'
        });
    }

    /**
     * Função para testar recompensa de mentoria real
     */
    static async testMentorReward(user, company, sessionId, rating) {
        // Primeiro processa a sessão
        const sessionResult = await this.testSpecificReward(user, company, 'MENTOR_SESSION', {
            sessionId,
            relatedModel: 'MentorSession'
        });

        // Se houver rating, processa também
        if (rating) {
            const ratingResult = await this.testSpecificReward(user, company, 'MENTOR_RATING', {
                sessionId,
                rating,
                relatedModel: 'MentorRating'
            });

            return {
                session: sessionResult,
                rating: ratingResult
            };
        }

        return { session: sessionResult };
    }
}

export default RewardService; 