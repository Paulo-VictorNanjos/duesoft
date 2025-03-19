import VirtualWallet from '../models/VirtualWallet.js';
import VirtualCurrency from '../models/VirtualCurrency.js';

class MentoringPaymentService {
    /**
     * Processa o pagamento de uma sessão de mentoria
     * @param {Object} session - Sessão de mentoria
     * @param {Object} student - Estudante
     * @param {Object} mentor - Mentor
     * @param {Object} company - Empresa
     */
    static async processPayment(session, student, mentor, company) {
        try {
            console.log('=== PROCESSANDO PAGAMENTO DE MENTORIA ===', {
                sessionId: session._id,
                studentId: student._id,
                mentorId: mentor._id
            });

            // Buscar carteira do estudante
            let studentWallet = await VirtualWallet.findOne({
                user: student._id,
                company: company._id
            });

            if (!studentWallet) {
                throw new Error('Carteira do estudante não encontrada');
            }

            // Buscar carteira do mentor
            let mentorWallet = await VirtualWallet.findOne({
                user: mentor.user,
                company: company._id
            });

            // Criar carteira do mentor se não existir
            if (!mentorWallet) {
                mentorWallet = new VirtualWallet({
                    user: mentor.user,
                    company: company._id,
                    balance: 0,
                    pendingBalance: 0
                });
            }

            // Calcular valor da sessão baseado nas horas e valor/hora do mentor
            const sessionCost = this.calculateSessionCost(session, mentor);
            console.log('Custo da sessão:', sessionCost);

            // Verificar se o estudante tem saldo suficiente
            if (studentWallet.balance < sessionCost) {
                throw new Error('Saldo insuficiente para agendar mentoria');
            }

            // Registrar transação de débito na carteira do estudante
            studentWallet.transactions.push({
                type: 'DEBIT',
                amount: sessionCost,
                description: `Pagamento de mentoria com ${mentor.name} - ${session.duration} minutos`,
                status: 'COMPLETED',
                reference: 'MENTORING',
                referenceModel: 'MentorSession',
                referenceId: session._id
            });

            // Atualizar saldo do estudante
            studentWallet.balance -= sessionCost;

            // Registrar transação de crédito na carteira do mentor
            mentorWallet.transactions.push({
                type: 'CREDIT',
                amount: sessionCost,
                description: `Recebimento por mentoria com ${student.name} - ${session.duration} minutos`,
                status: 'COMPLETED',
                reference: 'MENTORING',
                referenceModel: 'MentorSession',
                referenceId: session._id
            });

            // Atualizar saldo do mentor
            mentorWallet.balance += sessionCost;

            // Salvar alterações nas duas carteiras
            await Promise.all([
                studentWallet.save(),
                mentorWallet.save()
            ]);

            console.log('Pagamento processado com sucesso:', {
                sessionId: session._id,
                cost: sessionCost,
                studentNewBalance: studentWallet.balance,
                mentorNewBalance: mentorWallet.balance
            });

            return {
                success: true,
                sessionCost,
                studentBalance: studentWallet.balance,
                mentorBalance: mentorWallet.balance
            };

        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            throw error;
        }
    }

    /**
     * Calcula o custo de uma sessão de mentoria
     * @param {Object} session - Sessão de mentoria
     * @param {Object} mentor - Mentor
     */
    static calculateSessionCost(session, mentor) {
        // O custo é baseado na duração da sessão e no valor/hora do mentor
        const hourlyRate = mentor.hourlyRate || 0;
        const durationInHours = (session.duration || 60) / 60; // Convertendo minutos para horas
        return Math.round(hourlyRate * durationInHours); // Valor direto sem multiplicador
    }

    /**
     * Verifica se um estudante tem saldo suficiente para uma sessão
     * @param {Object} student - Estudante
     * @param {Object} mentor - Mentor
     * @param {Number} duration - Duração em horas
     * @param {Object} company - Empresa
     */
    static async checkBalance(student, mentor, duration, company) {
        try {
            // Buscar carteira do estudante
            const studentWallet = await VirtualWallet.findOne({
                user: student._id,
                company: company._id
            });

            if (!studentWallet) {
                return {
                    success: false,
                    message: 'Carteira não encontrada'
                };
            }

            // Calcular custo estimado
            const estimatedCost = mentor.hourlyRate * duration;

            // Verificar saldo
            const hasBalance = studentWallet.balance >= estimatedCost;

            return {
                success: true,
                hasBalance,
                balance: studentWallet.balance,
                estimatedCost,
                missing: hasBalance ? 0 : estimatedCost - studentWallet.balance
            };

        } catch (error) {
            console.error('Erro ao verificar saldo:', error);
            throw error;
        }
    }

    /**
     * Reembolsa o pagamento de uma sessão cancelada
     * @param {Object} session - Sessão de mentoria
     * @param {Object} company - Empresa
     */
    static async refundPayment(session, company) {
        try {
            console.log('=== PROCESSANDO REEMBOLSO DE MENTORIA ===', {
                sessionId: session._id
            });

            // Buscar carteiras
            const [studentWallet, mentorWallet] = await Promise.all([
                VirtualWallet.findOne({
                    user: session.student,
                    company: company._id
                }),
                VirtualWallet.findOne({
                    user: session.mentor.user,
                    company: company._id
                })
            ]);

            if (!studentWallet || !mentorWallet) {
                throw new Error('Carteiras não encontradas');
            }

            // Calcular valor do reembolso
            const refundAmount = this.calculateSessionCost(session, session.mentor);

            // Registrar reembolso para o estudante
            studentWallet.transactions.push({
                type: 'REFUND',
                amount: refundAmount,
                description: `Reembolso de mentoria cancelada com ${session.mentor.name}`,
                status: 'COMPLETED',
                relatedModel: 'MentorSession',
                relatedId: session._id
            });

            // Atualizar saldo do estudante
            studentWallet.balance += refundAmount;

            // Registrar estorno do mentor
            mentorWallet.transactions.push({
                type: 'CHARGEBACK',
                amount: refundAmount,
                description: `Estorno de mentoria cancelada com ${session.student.name}`,
                status: 'COMPLETED',
                relatedModel: 'MentorSession',
                relatedId: session._id
            });

            // Atualizar saldo do mentor
            mentorWallet.balance -= refundAmount;

            // Salvar alterações
            await Promise.all([
                studentWallet.save(),
                mentorWallet.save()
            ]);

            console.log('Reembolso processado com sucesso:', {
                sessionId: session._id,
                refundAmount,
                studentNewBalance: studentWallet.balance,
                mentorNewBalance: mentorWallet.balance
            });

            return {
                success: true,
                refundAmount,
                studentBalance: studentWallet.balance,
                mentorBalance: mentorWallet.balance
            };

        } catch (error) {
            console.error('Erro ao processar reembolso:', error);
            throw error;
        }
    }
}

export default MentoringPaymentService; 