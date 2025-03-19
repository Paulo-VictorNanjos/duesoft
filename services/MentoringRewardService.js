import VirtualWallet from '../models/VirtualWallet.js';
import VirtualCurrency from '../models/VirtualCurrency.js';
import Notification from '../models/Notification.js';
import Mentor from '../models/Mentor.js';

class MentoringRewardService {
    /**
     * Processa o pagamento da sessão de mentoria com moedas virtuais
     */
    static async processSessionPayment(session, userId, companyId) {
        try {
            // Buscar mentor e configurações da moeda virtual
            const mentor = await Mentor.findById(session.mentor).populate('user');
            if (!mentor || !mentor.hourlyRate) {
                throw new Error('Mentor não encontrado ou valor/hora não definido');
            }

            // Calcular custo baseado no valor/hora do mentor e duração da sessão
            const hourlyRate = mentor.hourlyRate;
            const durationInHours = session.duration / 60; // Convertendo minutos para horas
            const cost = Math.round(hourlyRate * durationInHours);

            // Buscar ou criar carteira do usuário
            let wallet = await VirtualWallet.findOne({
                user: userId,
                company: companyId
            });

            if (!wallet) {
                wallet = new VirtualWallet({
                    user: userId,
                    company: companyId,
                    balance: 0,
                    pendingBalance: 0
                });
            }

            // Verificar se tem saldo suficiente
            if (wallet.balance < cost) {
                throw new Error('Saldo insuficiente para agendar mentoria');
            }

            // Adicionar transação de débito
            wallet.transactions.push({
                type: 'DEBIT',
                amount: cost,
                description: `Agendamento de mentoria com ${mentor.user.name} - ${session.duration} minutos`,
                status: 'COMPLETED',
                reference: 'MENTORING',
                referenceId: session._id,
                referenceModel: 'MentorSession'
            });

            // Atualizar saldo
            wallet.balance -= cost;

            // Salvar alterações
            await wallet.save();

            return {
                success: true,
                cost,
                newBalance: wallet.balance
            };

        } catch (error) {
            console.error('Erro ao processar pagamento da mentoria:', error);
            throw error;
        }
    }

    /**
     * Recompensa o mentor por uma sessão concluída
     */
    static async rewardMentorSession(session, company) {
        try {
            console.log('=== PROCESSANDO RECOMPENSA DE MENTORIA ===');

            // Buscar configurações da moeda virtual
            const currency = await VirtualCurrency.findOne({ company: company._id });
            if (!currency || !currency.settings?.earnRules?.mentorSession) {
                console.log('Moeda virtual não configurada ou regra de mentoria não definida');
                return;
            }

            // Buscar carteira do mentor
            let mentorWallet = await VirtualWallet.findOne({
                user: session.mentor.user,
                company: company._id
            });

            // Criar carteira se não existir
            if (!mentorWallet) {
                mentorWallet = new VirtualWallet({
                    user: session.mentor.user,
                    company: company._id,
                    balance: 0,
                    pendingBalance: 0
                });
            }

            // Calcular recompensa
            const reward = currency.settings.earnRules.mentorSession;
            console.log('Recompensa calculada:', reward);

            // Adicionar transação
            mentorWallet.transactions.push({
                type: 'CREDIT',
                amount: reward,
                description: 'Recompensa por sessão de mentoria concluída',
                status: 'COMPLETED',
                reference: 'MENTORING',
                referenceId: session._id,
                referenceModel: 'MentorSession'
            });

            // Atualizar saldo
            mentorWallet.balance += reward;

            // Salvar alterações
            await mentorWallet.save();

            // Notificar mentor
            const notification = new Notification({
                user: session.mentor.user,
                company: company._id,
                title: 'Recompensa Recebida',
                message: `Você recebeu ${reward} moedas por concluir uma sessão de mentoria!`,
                type: 'success'
            });
            await notification.save();

            console.log('Recompensa processada com sucesso:', {
                mentor: session.mentor.user,
                reward,
                newBalance: mentorWallet.balance
            });

        } catch (error) {
            console.error('Erro ao processar recompensa:', error);
            throw error;
        }
    }

    /**
     * Recompensa o mentor por uma avaliação recebida
     */
    static async rewardMentorRating(session, rating, company) {
        try {
            console.log('=== PROCESSANDO RECOMPENSA POR AVALIAÇÃO ===');

            // Buscar configurações da moeda virtual
            const currency = await VirtualCurrency.findOne({ company: company._id });
            if (!currency || !currency.settings?.earnRules?.mentorRating) {
                console.log('Moeda virtual não configurada ou regra de avaliação não definida');
                return;
            }

            // Buscar carteira do mentor
            let mentorWallet = await VirtualWallet.findOne({
                user: session.mentor.user,
                company: company._id
            });

            // Criar carteira se não existir
            if (!mentorWallet) {
                mentorWallet = new VirtualWallet({
                    user: session.mentor.user,
                    company: company._id,
                    balance: 0,
                    pendingBalance: 0
                });
            }

            // Calcular recompensa baseada na avaliação
            const baseReward = currency.settings.earnRules.mentorRating;
            const ratingMultiplier = rating / 5; // 5 estrelas = 100% da recompensa
            const reward = Math.round(baseReward * ratingMultiplier);

            console.log('Recompensa calculada:', {
                baseReward,
                rating,
                ratingMultiplier,
                finalReward: reward
            });

            // Adicionar transação
            mentorWallet.transactions.push({
                type: 'CREDIT',
                amount: reward,
                description: `Recompensa por avaliação ${rating}/5 estrelas`,
                status: 'COMPLETED',
                reference: 'MENTORING',
                referenceId: session._id,
                referenceModel: 'MentorSession'
            });

            // Atualizar saldo
            mentorWallet.balance += reward;

            // Salvar alterações
            await mentorWallet.save();

            // Notificar mentor
            const notification = new Notification({
                user: session.mentor.user,
                company: company._id,
                title: 'Recompensa por Avaliação',
                message: `Você recebeu ${reward} moedas por uma avaliação de ${rating} estrelas!`,
                type: 'success'
            });
            await notification.save();

            console.log('Recompensa por avaliação processada:', {
                mentor: session.mentor.user,
                reward,
                newBalance: mentorWallet.balance
            });

        } catch (error) {
            console.error('Erro ao processar recompensa por avaliação:', error);
            throw error;
        }
    }
}

export default MentoringRewardService; 