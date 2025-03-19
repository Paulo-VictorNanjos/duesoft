import express from 'express';
import auth from '../middlewares/auth.js';
import Mentor from '../models/Mentor.js';
import MentorSession from '../models/MentorSession.js';
import NotificationManager from '../utils/notificationManager.js';
import { checkPlanAccess } from '../middlewares/planAccess.js';
import { createMeetingEvent, updateMeetingEvent, cancelMeetingEvent } from '../utils/googleCalendar.js';
import MentoringRewardService from '../services/MentoringRewardService.js';
import MentoringPaymentService from '../services/MentoringPaymentService.js';

const router = express.Router();

// Adicionar a rota de verificação no início do arquivo
router.get('/check-mentor', auth, async (req, res) => {
    try {
        const mentor = await Mentor.findOne({ 
            user: req.user._id,
            company: req.company._id
        });
        
        res.json({
            isMentor: !!mentor,
            mentorDetails: mentor,
            userDetails: {
                id: req.user._id,
                email: req.user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota principal de mentoria
router.get('/', auth, checkPlanAccess('mentoring'), async (req, res) => {
    try {
        // Se for mentor, redirecionar para área do mentor
        if (req.user.isMentor) {
            return res.redirect('/mentoring/mentor-area');
        }

        console.log('=== CARREGANDO PÁGINA DE MENTORIA ===');
        console.log('Stripe Public Key:', process.env.STRIPE_PUBLIC_KEY);

        // Buscar mentores disponíveis
        const mentors = await Mentor.find({
            company: req.company._id,
            active: true,
            verified: true
        }).populate('user', 'name email profilePicture');

        // Buscar sessões como mentee
        const [upcomingSessions, pastSessions] = await Promise.all([
            MentorSession.find({
                company: req.company._id,
                mentee: req.user._id,
                status: 'scheduled',
                dateTime: { $gte: new Date() }
            }).populate({
                path: 'mentor',
                populate: { path: 'user', select: 'name profilePicture' }
            }).sort({ dateTime: 1 }),

            MentorSession.find({
                company: req.company._id,
                mentee: req.user._id,
                $or: [
                    { status: { $in: ['completed', 'cancelled'] } },
                    { dateTime: { $lt: new Date() } }
                ]
            }).populate({
                path: 'mentor',
                populate: { path: 'user', select: 'name profilePicture' }
            }).sort({ dateTime: -1 })
        ]);

        // Extrair especialidades únicas
        const specialties = [...new Set(mentors.flatMap(m => m.specialties || []))];

        const renderData = {
            mentors,
            upcomingSessions,
            pastSessions,
            specialties,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success'),
            csrfToken: req.csrfToken(),
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY
        };

        console.log('Dados enviados para a view:', {
            ...renderData,
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY
        });

        res.render('mentoring/index', renderData);

    } catch (error) {
        console.error('Erro ao carregar página de mentoria:', error);
        req.flash('error', 'Erro ao carregar página de mentoria');
        res.redirect('/dashboard');
    }
});

// Listar mentores disponíveis
router.get('/mentors', auth, async (req, res) => {
    try {
        const mentors = await Mentor.find({ 
            company: req.company._id,
            active: true 
        }).populate('user', 'name email profilePicture');
        
        res.render('mentoring/mentors', { 
            mentors,
            user: req.user
        });
    } catch (error) {
        req.flash('error', 'Erro ao carregar mentores');
        res.redirect('/dashboard');
    }
});

// Verificar disponibilidade do mentor
router.get('/mentors/:id/availability', auth, async (req, res) => {
    try {
        const mentor = await Mentor.findById(req.params.id);
        const selectedDate = new Date(req.query.date);
        const dayOfWeek = selectedDate.getDay();

        // Buscar disponibilidade do mentor para este dia
        const dayAvailability = mentor.availability.find(a => a.dayOfWeek === dayOfWeek);
        
        if (!dayAvailability) {
            return res.json({ slots: [] });
        }

        // Buscar sessões já agendadas para este dia
        const existingSessions = await MentorSession.find({
            mentor: mentor._id,
            status: 'scheduled',
            dateTime: {
                $gte: new Date(selectedDate.setHours(0, 0, 0)),
                $lt: new Date(selectedDate.setHours(23, 59, 59))
            }
        });

        const availableSlots = generateAvailableSlots(dayAvailability, existingSessions, selectedDate);
        res.json({ slots: availableSlots });
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        res.status(500).json({ error: 'Erro ao verificar disponibilidade', slots: [] });
    }
});

// Agendar sessão
router.post('/sessions', auth, async (req, res) => {
    try {
        console.log('=== INICIANDO AGENDAMENTO DE SESSÃO ===');
        console.log('Dados recebidos:', req.body);
        
        const { mentorId, date, time, duration, topics } = req.body;

        // Log dos dados recebidos
        console.log('Dados extraídos:', {
            mentorId,
            date,
            time,
            duration,
            topics,
            userId: req.user._id,
            companyId: req.company._id
        });

        // Validar dados
        if (!mentorId || !date || !time || !duration || !topics) {
            console.error('Dados incompletos:', {
                mentorId: !!mentorId,
                date: !!date,
                time: !!time,
                duration: !!duration,
                topics: !!topics
            });
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        // Converter data e hora para objeto Date
        const dateTime = new Date(`${date}T${time}`);
        console.log('DateTime criado:', dateTime);

        const mentor = await Mentor.findById(mentorId).populate('user');
        console.log('Mentor encontrado:', mentor ? {
            id: mentor._id,
            name: mentor.user?.name,
            active: mentor.active,
            verified: mentor.verified
        } : 'Mentor não encontrado');

        if (!mentor) {
            return res.status(404).json({ error: 'Mentor não encontrado' });
        }

        // Verificar disponibilidade do mentor
        const dayOfWeek = dateTime.getDay();
        const dayAvailability = mentor.availability.find(a => a.dayOfWeek === dayOfWeek);
        
        console.log('Verificação de disponibilidade:', {
            dayOfWeek,
            dayAvailability: dayAvailability ? {
                startTime: dayAvailability.startTime,
                endTime: dayAvailability.endTime
            } : 'Não disponível neste dia'
        });

        if (!dayAvailability) {
            return res.status(400).json({ 
                error: 'Mentor não disponível neste dia da semana' 
            });
        }

        // Verificar conflitos de horário
        const conflictingSession = await MentorSession.findOne({
            mentor: mentorId,
            status: 'scheduled',
            dateTime: {
                $lt: new Date(dateTime.getTime() + duration * 60000),
                $gt: dateTime
            }
        });

        console.log('Verificação de conflitos:', {
            hasConflict: !!conflictingSession,
            conflictDetails: conflictingSession ? {
                id: conflictingSession._id,
                dateTime: conflictingSession.dateTime
            } : null
        });

        if (conflictingSession) {
            return res.status(400).json({ 
                error: 'Horário não disponível' 
            });
        }

        // Criar sessão
        console.log('Criando nova sessão com os dados:', {
            mentor: mentorId,
            mentee: req.user._id,
            company: req.company._id,
            dateTime,
            duration,
            topics
        });

        const session = await MentorSession.create({
            mentor: mentorId,
            mentee: req.user._id,
            company: req.company._id,
            dateTime,
            duration,
            topics,
            status: 'scheduled',
            paymentStatus: 'PENDING'
        });

        // Processar pagamento
        try {
            await MentoringPaymentService.processPayment(
                session,
                req.user,
                mentor,
                req.company
            );

            // Atualizar status de pagamento
            session.paymentStatus = 'PAID';
            await session.save();

        } catch (paymentError) {
            // Se houver erro no pagamento, deletar a sessão criada
            await MentorSession.findByIdAndDelete(session._id);
            throw paymentError;
        }

        console.log('Sessão criada com sucesso:', {
            id: session._id,
            status: session.status,
            dateTime: session.dateTime,
            paymentStatus: session.paymentStatus
        });

        res.json({ success: true, session });

    } catch (error) {
        console.error('=== ERRO AO AGENDAR SESSÃO ===');
        console.error('Detalhes do erro:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Erro ao agendar sessão', details: error.message });
    }
});

// Atualizar a rota de cancelamento para também cancelar o evento do Google
router.post('/sessions/:id/cancel', auth, async (req, res) => {
    try {
        const session = await MentorSession.findById(req.params.id);
        
        if (!session || 
            (session.mentee.toString() !== req.user._id.toString() && 
             session.mentor.toString() !== req.user._id.toString())) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        // Se houver um evento do Google, cancelá-lo
        if (session.googleEventId) {
            try {
                await cancelMeetingEvent(session.googleEventId);
            } catch (error) {
                console.error('Erro ao cancelar evento do Google:', error);
                // Continuar mesmo se falhar o cancelamento do evento
            }
        }

        session.status = 'cancelled';
        session.cancellationReason = req.body.reason;
        session.cancelledBy = req.user._id;
        await session.save();

        // Notificar a outra parte
        const notifyUser = session.mentee.toString() === req.user._id.toString() 
            ? session.mentor 
            : session.mentee;

        await NotificationManager.sendNotification({
            user: notifyUser,
            title: 'Sessão Cancelada',
            message: `A sessão de ${session.dateTime.toLocaleString()} foi cancelada`
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao cancelar sessão' });
    }
});

// Avaliar sessão
router.post('/sessions/:id/review', auth, async (req, res) => {
    try {
        console.log('=== AVALIANDO SESSÃO ===');
        console.log('Dados recebidos:', {
            sessionId: req.params.id,
            rating: req.body.rating,
            feedback: req.body.feedback,
            userId: req.user._id
        });

        const { rating, feedback } = req.body;
        const session = await MentorSession.findById(req.params.id)
            .populate('mentor');

        if (!session) {
            console.error('Sessão não encontrada');
            return res.status(404).json({ error: 'Sessão não encontrada' });
        }

        if (session.mentee.toString() !== req.user._id.toString()) {
            console.error('Usuário não autorizado');
            return res.status(403).json({ error: 'Não autorizado' });
        }

        // Atualizar sessão
        session.rating = rating;
        session.feedback = feedback;
        await session.save();

        // Atualizar rating do mentor
        const mentor = await Mentor.findById(session.mentor._id);
        const mentorSessions = await MentorSession.find({
            mentor: mentor._id,
            rating: { $exists: true, $ne: null }
        });

        const totalRating = mentorSessions.reduce((acc, s) => acc + (s.rating || 0), 0);
        mentor.rating = totalRating / mentorSessions.length;
        mentor.reviewsCount = mentorSessions.length;
        await mentor.save();

        // Processar recompensa baseada na avaliação
        await MentoringRewardService.rewardMentorRating(session, rating, req.company);

        console.log('Avaliação salva com sucesso:', {
            sessionRating: session.rating,
            mentorRating: mentor.rating,
            reviewsCount: mentor.reviewsCount
        });

        // Notificar mentor
        await NotificationManager.send(
            mentor.user,
            'Nova Avaliação',
            `Você recebeu uma nova avaliação de ${req.user.name}`,
            'info',
            '/mentoring/mentor-area'
        );

        res.json({ 
            success: true,
            message: 'Avaliação salva com sucesso',
            newRating: mentor.rating
        });

    } catch (error) {
        console.error('=== ERRO AO AVALIAR SESSÃO ===');
        console.error('Detalhes:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Erro ao avaliar sessão',
            details: error.message 
        });
    }
});

// Função auxiliar para gerar link de reunião
function generateMeetingLink() {
    return `https://meet.google.com/${Math.random().toString(36).substring(7)}`;
}

// Função auxiliar para gerar slots disponíveis
function generateAvailableSlots(availability, existingSessions, selectedDate) {
    const slots = [];
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);
    
    // Configurar data inicial e final
    const startTime = new Date(selectedDate);
    startTime.setHours(startHour, startMinute, 0);
    
    const endTime = new Date(selectedDate);
    endTime.setHours(endHour, endMinute, 0);
    
    // Data atual para comparação
    const now = new Date();

    // Gerar slots de 30 em 30 minutos
    const currentSlot = new Date(startTime);
    while (currentSlot < endTime) {
        // Pular slots no passado
        if (currentSlot > now) {
            // Verificar se o slot está disponível
            const slotTime = currentSlot.toTimeString().slice(0, 5);
            const isBooked = existingSessions.some(session => {
                const sessionTime = session.dateTime.toTimeString().slice(0, 5);
                return sessionTime === slotTime;
            });

            if (!isBooked) {
                slots.push(slotTime);
            }
        }
        
        // Avançar 30 minutos
        currentSlot.setMinutes(currentSlot.getMinutes() + 30);
    }

    return slots;
}

// Listar sessões do mentor
router.get('/mentor-sessions', auth, async (req, res) => {
    try {
        console.log('Verificando mentor para usuário:', req.user._id);
        
        // Buscar mentor com todos os campos
        const mentor = await Mentor.findOne({ 
            user: req.user._id,
            company: req.company._id
        });

        console.log('Mentor encontrado:', mentor);

        // Verificar status do mentor
        if (!mentor) {
            console.log('Mentor não encontrado');
            req.flash('error', 'Acesso permitido apenas para mentores');
            return res.redirect('/dashboard');
        }

        if (!mentor.active) {
            console.log('Mentor não está ativo');
            req.flash('error', 'Seu cadastro de mentor não está ativo');
            return res.redirect('/dashboard');
        }

        if (!mentor.verified) {
            console.log('Mentor não está verificado');
            req.flash('error', 'Seu cadastro de mentor ainda não foi verificado');
            return res.redirect('/dashboard');
        }

        const [upcomingSessions, pastSessions] = await Promise.all([
            MentorSession.find({
                mentor: mentor._id,
                dateTime: { $gte: new Date() },
                status: 'scheduled'
            }).populate('mentee', 'name email profilePicture')
              .sort({ dateTime: 1 }),

            MentorSession.find({
                mentor: mentor._id,
                $or: [
                    { status: 'completed' },
                    { status: 'cancelled' },
                    { dateTime: { $lt: new Date() } }
                ]
            }).populate('mentee', 'name email profilePicture')
              .sort({ dateTime: -1 })
        ]);

        console.log('Sessões encontradas:', {
            upcoming: upcomingSessions.length,
            past: pastSessions.length
        });

        res.render('mentoring/mentor-sessions', {
            mentor,
            upcomingSessions,
            pastSessions,
            path: '/mentoring/mentor-sessions',
            pageTitle: 'Minhas Sessões de Mentoria',
            success: req.flash('success'),
            error: req.flash('error')
        });

    } catch (error) {
        console.error('Erro ao listar sessões do mentor:', error);
        req.flash('error', 'Erro ao carregar sessões');
        res.redirect('/dashboard');
    }
});

// Atualizar status da sessão
router.post('/sessions/:id/status', auth, async (req, res) => {
    try {
        console.log('=== ATUALIZANDO STATUS DA SESSÃO ===');
        console.log('Dados:', {
            sessionId: req.params.id,
            status: req.body.status,
            userId: req.user._id,
            company: req.company._id
        });

        // Primeiro, buscar o mentor
        const userMentor = await Mentor.findOne({ 
            user: req.user._id,
            company: req.company._id
        });

        if (!userMentor) {
            console.error('Usuário não é mentor');
            return res.status(403).json({ error: 'Usuário não é mentor' });
        }

        // Buscar a sessão
        const session = await MentorSession.findOne({
            _id: req.params.id,
            mentor: userMentor._id,
            company: req.company._id
        }).populate('mentee');

        if (!session) {
            console.error('Sessão não encontrada');
            return res.status(404).json({ error: 'Sessão não encontrada' });
        }

        // Atualizar status
        session.status = req.body.status;
        if (req.body.status === 'completed') {
            session.completedAt = new Date();
        }
        await session.save();

        // Notificar mentee
        await NotificationManager.send(
            session.mentee._id,
            'Sessão Atualizada',
            `Sua sessão de mentoria foi ${req.body.status === 'completed' ? 'concluída' : 'atualizada'}`,
            'info',
            '/mentoring',
            req.company._id
        );

        res.json({ 
            success: true,
            message: 'Status atualizado com sucesso',
            session: {
                id: session._id,
                status: session.status,
                completedAt: session.completedAt
            }
        });

    } catch (error) {
        console.error('=== ERRO AO ATUALIZAR STATUS ===');
        console.error('Detalhes:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Erro ao atualizar sessão',
            details: error.message 
        });
    }
});

// Rota para concluir sessão de mentoria
router.post('/mentor/sessions/:sessionId/complete', auth, async (req, res) => {
    try {
        console.log('=== CONCLUINDO SESSÃO DE MENTORIA ===');
        
        const session = await MentorSession.findById(req.params.sessionId)
            .populate('mentor');
        
        if (!session) {
            return res.status(404).json({ error: 'Sessão não encontrada' });
        }

        // Verificar se o usuário é o mentor desta sessão
        const mentor = await Mentor.findOne({ user: req.user._id });
        if (!mentor || session.mentor._id.toString() !== mentor._id.toString()) {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        session.status = 'completed';
        session.completedAt = new Date();
        await session.save();

        // Processar recompensa
        await MentoringRewardService.rewardMentorSession(session, req.company);

        // Notificar mentee
        await NotificationManager.send(
            session.mentee,
            'Sessão Concluída',
            'Sua sessão de mentoria foi concluída. Por favor, avalie a sessão.',
            'info',
            '/mentoring'
        );

        res.json({ success: true, session });
    } catch (error) {
        console.error('Erro ao concluir sessão:', error);
        res.status(500).json({ error: 'Erro ao concluir sessão' });
    }
});

// Adicionar rota de debug
router.get('/debug', auth, async (req, res) => {
    try {
        const mentors = await Mentor.find({ company: req.company._id });
        res.json({
            total: mentors.length,
            ativos: mentors.filter(m => m.active).length,
            verificados: mentors.filter(m => m.verified).length,
            mentores: mentors.map(m => ({
                id: m._id,
                active: m.active,
                verified: m.verified,
                user: m.user
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para área do mentor
router.get('/mentor-area', auth, async (req, res) => {
    try {
        if (!req.user.isMentor) {
            req.flash('error', 'Acesso permitido apenas para mentores');
            return res.redirect('/mentoring');
        }

        const mentor = await Mentor.findOne({ 
            user: req.user._id,
            company: req.company._id
        });

        if (!mentor) {
            req.flash('error', 'Mentor não encontrado');
            return res.redirect('/mentoring');
        }

        // Buscar todas as sessões e métricas
        const [upcomingSessions, pastSessions] = await Promise.all([
            MentorSession.find({
                mentor: mentor._id,
                status: 'scheduled',
                dateTime: { $gte: new Date() }
            })
            .populate('mentee', 'name email profilePicture')
            .sort({ dateTime: 1 }),

            MentorSession.find({
                mentor: mentor._id,
                $or: [
                    { status: { $in: ['completed', 'cancelled'] } },
                    { dateTime: { $lt: new Date() } }
                ]
            })
            .populate('mentee', 'name email profilePicture')
            .sort({ dateTime: -1 })
        ]);

        // Calcular métricas
        const metrics = {
            totalSessions: upcomingSessions.length + pastSessions.length,
            completedSessions: pastSessions.filter(s => s.status === 'completed').length,
            cancelledSessions: pastSessions.filter(s => s.status === 'cancelled').length
        };

        res.render('mentoring/mentor-area', {
            mentor,
            metrics,
            upcomingSessions,
            pastSessions,
            rating: mentor.rating || 0,
            user: req.user,
            formatDateTime: (date) => {
                return new Date(date).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                });
            }
        });

    } catch (error) {
        console.error('Erro ao carregar área do mentor:', error);
        req.flash('error', 'Erro ao carregar área do mentor');
        res.redirect('/mentoring');
    }
});

// Buscar disponibilidade do mentor
router.get('/availability', auth, async (req, res) => {
    try {
        const mentor = await Mentor.findOne({ 
            user: req.user._id,
            company: req.company._id
        });

        if (!mentor) {
            return res.status(404).json({ error: 'Mentor não encontrado' });
        }

        res.json({ 
            success: true, 
            availability: mentor.availability 
        });

    } catch (error) {
        console.error('Erro ao buscar disponibilidade:', error);
        res.status(500).json({ error: 'Erro ao buscar disponibilidade' });
    }
});

// Atualizar disponibilidade do mentor
router.post('/availability', auth, async (req, res) => {
    try {
        const mentor = await Mentor.findOne({ 
            user: req.user._id,
            company: req.company._id
        });

        if (!mentor) {
            return res.status(404).json({ error: 'Mentor não encontrado' });
        }

        // Validar disponibilidade
        const { availability } = req.body;
        if (!Array.isArray(availability)) {
            return res.status(400).json({ error: 'Formato de disponibilidade inválido' });
        }

        // Atualizar disponibilidade
        mentor.availability = availability;
        await mentor.save();

        res.json({ 
            success: true, 
            message: 'Disponibilidade atualizada com sucesso' 
        });

    } catch (error) {
        console.error('Erro ao atualizar disponibilidade:', error);
        res.status(500).json({ error: 'Erro ao atualizar disponibilidade' });
    }
});

export default router; 