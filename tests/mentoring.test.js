import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import Mentor from '../models/Mentor.js';
import MentorSession from '../models/MentorSession.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

describe('Sistema de Mentoria', () => {
    let testUser;
    let testMentor;
    let testCompany;
    let testMentorUser;

    beforeAll(async () => {
        const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
        const testUrl = mongoUrl.replace(/\/[^/]+$/, '/lms_test');
        console.log('Conectando ao banco de teste:', testUrl);
        await mongoose.connect(testUrl);
    });

    beforeEach(async () => {
        await Promise.all([
            User.deleteMany({}),
            Mentor.deleteMany({}),
            MentorSession.deleteMany({}),
            Company.deleteMany({})
        ]);

        testCompany = await Company.create({
            name: 'Empresa Teste',
            domain: 'teste.com.br',
            responsible: 'Responsável Teste',
            email: 'empresa@teste.com.br',
            phone: '11999999999',
            address: 'Rua Teste, 123 - Sala 1, Bairro Teste, São Paulo/SP - CEP: 01234-567',
            cpfCnpj: '12345678901234'
        });

        testMentorUser = await User.create({
            name: 'Mentor Teste',
            email: 'mentor@teste.com.br',
            password: 'senha123',
            company: testCompany._id,
            isMentor: true
        });

        testMentor = await Mentor.create({
            user: testMentorUser._id,
            company: testCompany._id,
            specialties: ['JavaScript', 'Node.js'],
            biography: 'Biografia do mentor teste',
            experience: '5 anos de experiência',
            hourlyRate: 100,
            availability: [
                {
                    dayOfWeek: 1, // Segunda-feira
                    startTime: '09:00',
                    endTime: '17:00'
                }
            ],
            active: true,
            verified: true
        });

        testUser = await User.create({
            name: 'Usuário Teste',
            email: 'usuario@teste.com.br',
            password: 'senha123',
            company: testCompany._id
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('Disponibilidade do Mentor', () => {
        it('deve verificar disponibilidade corretamente', async () => {
            // Criar uma data que cai em uma segunda-feira
            const dataDisponivel = new Date();
            while (dataDisponivel.getDay() !== 1) {
                dataDisponivel.setDate(dataDisponivel.getDate() + 1);
            }
            dataDisponivel.setHours(10, 0, 0); // 10:00

            const dataIndisponivel = new Date(dataDisponivel);
            dataIndisponivel.setHours(8, 0, 0); // 08:00 - Fora do horário

            expect(testMentor.isAvailable(dataDisponivel)).toBe(true);
            expect(testMentor.isAvailable(dataIndisponivel)).toBe(false);
        });

        it('não deve estar disponível em dias não configurados', async () => {
            // Criar uma data que cai em um domingo
            const dataDomingo = new Date();
            while (dataDomingo.getDay() !== 0) {
                dataDomingo.setDate(dataDomingo.getDate() + 1);
            }
            dataDomingo.setHours(10, 0, 0);

            expect(testMentor.isAvailable(dataDomingo)).toBe(false);
        });
    });

    describe('Sessões de Mentoria', () => {
        it('deve criar uma sessão com todos os campos obrigatórios', async () => {
            const dataHora = new Date();
            dataHora.setDate(dataHora.getDate() + 1);
            dataHora.setHours(10, 0, 0);

            const sessao = await MentorSession.create({
                mentor: testMentor._id,
                mentee: testUser._id,
                company: testCompany._id,
                dateTime: dataHora,
                duration: 60,
                topics: 'JavaScript Básico',
                status: 'scheduled',
                paymentStatus: 'PENDING'
            });

            expect(sessao).toBeDefined();
            expect(sessao.mentor.toString()).toBe(testMentor._id.toString());
            expect(sessao.mentee.toString()).toBe(testUser._id.toString());
            expect(sessao.duration).toBe(60);
            expect(sessao.status).toBe('scheduled');
            expect(sessao.paymentStatus).toBe('PENDING');
        });

        it('deve atualizar status da sessão corretamente', async () => {
            const dataHora = new Date();
            dataHora.setDate(dataHora.getDate() + 1);
            
            const sessao = await MentorSession.create({
                mentor: testMentor._id,
                mentee: testUser._id,
                company: testCompany._id,
                dateTime: dataHora,
                duration: 60,
                topics: 'JavaScript Básico',
                status: 'scheduled'
            });

            // Testar transição de status
            sessao.status = 'in-progress';
            await sessao.save();
            expect(sessao.status).toBe('in-progress');

            sessao.status = 'completed';
            await sessao.save();
            expect(sessao.status).toBe('completed');
        });

        it('deve permitir avaliação após conclusão', async () => {
            const dataHora = new Date();
            dataHora.setDate(dataHora.getDate() + 1);
            
            const sessao = await MentorSession.create({
                mentor: testMentor._id,
                mentee: testUser._id,
                company: testCompany._id,
                dateTime: dataHora,
                duration: 60,
                topics: 'JavaScript Básico',
                status: 'completed'
            });

            sessao.rating = 5;
            sessao.feedback = 'Ótima sessão!';
            await sessao.save();

            const sessaoAtualizada = await MentorSession.findById(sessao._id);
            expect(sessaoAtualizada.rating).toBe(5);
            expect(sessaoAtualizada.feedback).toBe('Ótima sessão!');
        });

        it('não deve permitir agendamento em horário conflitante', async () => {
            const dataHora = new Date();
            dataHora.setDate(dataHora.getDate() + 1);
            while (dataHora.getDay() !== 1) { // Garantir que é segunda-feira
                dataHora.setDate(dataHora.getDate() + 1);
            }
            dataHora.setHours(10, 0, 0); // 10:00

            // Criar primeira sessão
            const primeiraSessao = await MentorSession.create({
                mentor: testMentor._id,
                mentee: testUser._id,
                company: testCompany._id,
                dateTime: dataHora,
                duration: 60,
                topics: 'Primeira Sessão',
                status: 'scheduled'
            });

            // Verificar se a primeira sessão foi criada corretamente
            expect(primeiraSessao).toBeDefined();
            expect(primeiraSessao.endTime).toBeDefined();
            expect(primeiraSessao.endTime.getTime()).toBe(dataHora.getTime() + 60 * 60000);

            // Tentar criar sessão no mesmo horário
            await expect(MentorSession.create({
                mentor: testMentor._id,
                mentee: testUser._id,
                company: testCompany._id,
                dateTime: dataHora,
                duration: 60,
                topics: 'Sessão Conflitante',
                status: 'scheduled'
            })).rejects.toThrow('Horário já está ocupado');

            // Verificar se apenas uma sessão existe
            const sessoes = await MentorSession.find({
                mentor: testMentor._id,
                status: 'scheduled'
            });
            expect(sessoes.length).toBe(1);
        });
    });

    describe('Métricas do Mentor', () => {
        it('deve calcular métricas corretamente após várias sessões', async () => {
            const dataHora = new Date();
            dataHora.setDate(dataHora.getDate() + 1);

            // Criar várias sessões com diferentes status
            await Promise.all([
                MentorSession.create({
                    mentor: testMentor._id,
                    mentee: testUser._id,
                    company: testCompany._id,
                    dateTime: dataHora,
                    duration: 60,
                    status: 'completed'
                }),
                MentorSession.create({
                    mentor: testMentor._id,
                    mentee: testUser._id,
                    company: testCompany._id,
                    dateTime: dataHora,
                    duration: 30,
                    status: 'completed'
                }),
                MentorSession.create({
                    mentor: testMentor._id,
                    mentee: testUser._id,
                    company: testCompany._id,
                    dateTime: dataHora,
                    duration: 45,
                    status: 'cancelled'
                })
            ]);

            await testMentor.updateMetrics();
            const mentorAtualizado = await Mentor.findById(testMentor._id);

            expect(mentorAtualizado.metrics.totalSessions).toBe(3);
            expect(mentorAtualizado.metrics.completedSessions).toBe(2);
            expect(mentorAtualizado.metrics.cancelledSessions).toBe(1);
            expect(mentorAtualizado.metrics.averageSessionDuration).toBe(45); // (60 + 30 + 45) / 3
        });
    });
}); 