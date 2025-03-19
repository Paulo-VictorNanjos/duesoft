import express from 'express';
import auth from '../middlewares/auth.js';
import { Exam, ExamAttempt } from '../models/Exam.js';
import User from '../models/User.js';
import AchievementChecker from '../utils/achievementChecker.js';
import NotificationManager from '../utils/notificationManager.js';

const router = express.Router();

// Listar provas disponíveis
router.get('/', auth, async (req, res) => {
    try {
        // Buscar todas as provas ativas da empresa do usuário
        const allExams = await Exam.find({ active: true, company: req.user.company })
            .populate('course questions')
            .sort('-createdAt');
        
        // Buscar tentativas do usuário
        const attempts = await ExamAttempt.find({ 
            user: req.user._id 
        }).populate('exam');

        // Preparar dados das provas com informações de tentativas
        const processedExams = allExams.map(exam => {
            const examAttempts = attempts.filter(a => 
                a.exam && a.exam._id.toString() === exam._id.toString()
            );

            // Verificar número de tentativas usadas
            const attemptsUsed = examAttempts.length;
            const attemptsRemaining = exam.attempts - attemptsUsed;
            const hasPassed = examAttempts.some(a => a.passed);

            return {
                ...exam.toObject(),
                examAttempts,
                attemptsUsed,
                attemptsRemaining,
                hasPassed
            };
        });

        res.render('exams/index', { 
            exams: processedExams,
            attempts,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success'),
            activeTab: req.query.tab || 'pending',
            pendingCount: processedExams.filter(exam => exam.attemptsRemaining > 0).length,
            completedCount: processedExams.filter(exam => exam.attemptsRemaining === 0 || exam.hasPassed).length
        });
    } catch (error) {
        console.error('Erro ao carregar provas:', error);
        req.flash('error', 'Erro ao carregar provas');
        res.redirect('/dashboard');
    }
});

// Iniciar prova
router.get('/:id', auth, async (req, res) => {
    try {
        const exam = await Exam.findOne({ _id: req.params.id, company: req.user.company }).populate('course');
        
        if (!exam) {
            req.flash('error', 'Prova não encontrada');
            return res.redirect('/exams');
        }

        // Verificar tentativas existentes
        const attempts = await ExamAttempt.find({
            exam: exam._id,
            user: req.user._id
        });

        // Verificar se há uma tentativa em andamento
        const activeAttempt = attempts.find(a => !a.endTime);
        
        if (activeAttempt) {
            // Continuar tentativa existente
            return res.render('exams/take', { 
                exam,
                attempt: activeAttempt,
                user: req.user,
                error: req.flash('error')
            });
        }

        // Verificar número de tentativas completadas
        const completedAttempts = attempts.filter(a => a.endTime).length;
        
        if (completedAttempts >= exam.attempts) {
            req.flash('error', 'Você já utilizou todas as tentativas permitidas');
            return res.redirect('/exams');
        }

        // Criar nova tentativa
        const attempt = new ExamAttempt({
            exam: exam._id,
            user: req.user._id,
            startTime: new Date()
        });
        await attempt.save();

        res.render('exams/take', { 
            exam,
            attempt,
            user: req.user,
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar prova:', error);
        req.flash('error', 'Erro ao carregar prova');
        res.redirect('/exams');
    }
});

// Registrar tentativa de saída
router.post('/:examId/attempt-leave', auth, async (req, res) => {
    try {
        const { timeStamp, timeRemaining } = req.body;
        
        await ExamAttempt.findOneAndUpdate(
            { 
                exam: req.params.examId,
                user: req.user._id,
                endTime: null
            },
            {
                $push: {
                    leaveAttempts: {
                        timeStamp,
                        timeRemaining
                    }
                }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao registrar tentativa de saída:', error);
        res.status(500).json({ success: false });
    }
});

// Enviar prova
router.post('/:id/submit', auth, async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        const answers = req.body.answers;
        let user = await User.findById(req.user._id);
        let unlockedAchievements = [];
        
        // Processar cada resposta
        const processedAnswers = exam.questions.map((question, index) => {
            if (question.type === 'essay') {
                return {
                    type: 'essay',
                    text: answers[index],
                    score: 0,
                    status: 'pending'
                };
            }

            const selectedOption = Number(answers[index]);
            
            // Verificar se é um número válido
            if (isNaN(selectedOption) || selectedOption < 0) {
                return {
                    question: question._id,
                    selectedOption: 0,
                    isCorrect: false
                };
            }
            
            const correctOption = question.options.findIndex(opt => opt.isCorrect === true);
            
            // Adicione logs para debug
            console.log(`Questão ${index + 1}:`, {
                selectedOption,
                correctOption,
                isCorrect: selectedOption === correctOption
            });
            
            return {
                question: question._id,
                selectedOption: selectedOption,
                isCorrect: selectedOption === correctOption
            };
        });

        // Calcular pontuação
        const correctAnswers = processedAnswers.filter(a => a.isCorrect).length;
        const score = (correctAnswers / exam.questions.length) * 100;
        const passed = score >= exam.minimumScore;
        
        // Verificar se tem questões dissertativas
        const hasEssay = exam.questions.some(q => q.type === 'essay');
        const status = hasEssay ? 'pending_review' : 'completed';

        // Atualizar tentativa
        const attempt = await ExamAttempt.findOneAndUpdate(
            {
                exam: exam._id,
                user: req.user._id,
                endTime: null
            },
            {
                answers: processedAnswers,
                score: score,
                passed: passed,
                endTime: new Date(),
                timeSpent: req.body.timeSpent || 0,
                status: status
            },
            { new: true }
        );

        // Adicionar XP ao usuário se passou na prova
        if (passed) {
            const baseXP = 100; // XP base reduzido
            const bonusXP = Math.floor((score - exam.minimumScore) * 2); // Bônus reduzido
            const totalXP = Math.min(baseXP + bonusXP, 500); // Limite por prova

            // Usar o novo método addExperience
            user.addExperience(totalXP);
            await user.save();

            console.log(`XP adicionado ao usuário ${user.name}: ${totalXP}`);

            // Verificar conquistas
            unlockedAchievements = await AchievementChecker.checkAchievements(user._id);
            
            if (unlockedAchievements && unlockedAchievements.length > 0) {
                const io = req.app.get('io');
                io.to(user._id.toString()).emit('achievements:unlocked', unlockedAchievements);
            }

            // Enviar notificação
            await NotificationManager.send(
                user._id,
                'Prova Concluída!',
                `Parabéns! Você foi aprovado na prova "${exam.title}" com ${score}%!`,
                'success',
                `/exams/${exam._id}/result`
            );
        }

        res.json({ 
            success: true,
            score,
            passed,
            userExperience: user.experience,
            userLevel: user.level,
            userCategory: user.category,
            unlockedAchievements: unlockedAchievements
        });

    } catch (error) {
        console.error('Erro ao submeter prova:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao submeter prova: ' + error.message 
        });
    }
});

// Ver resultado
router.get('/:id/result', auth, async (req, res) => {
    try {
        const attempt = await ExamAttempt.findOne({
            exam: req.params.id,
            user: req.user._id,
            endTime: { $ne: null }
        }).populate('exam');

        if (!attempt) {
            req.flash('error', 'Resultado não encontrado');
            return res.redirect('/exams');
        }

        // Se a prova estiver em análise, redireciona para a página de pending
        if (attempt.status === 'pending_review') {
            return res.redirect(`/exams/${req.params.id}/pending-review`);
        }

        res.render('exams/result', { 
            attempt,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Erro ao carregar resultado:', error);
        req.flash('error', 'Erro ao carregar resultado');
        res.redirect('/exams');
    }
});

// Rota para verificar se pode iniciar a prova
router.get('/:id/check', auth, async (req, res) => {
    try {
        console.log('=== VERIFICANDO PERMISSÃO PARA PROVA ===');
        console.log('Dados da requisição:', {
            examId: req.params.id,
            userId: req.user._id,
            companyId: req.user.company._id
        });

        const exam = await Exam.findById(req.params.id);
        
        if (!exam) {
            console.log('Prova não encontrada');
            return res.status(404).json({ 
                success: false,
                message: 'Prova não encontrada.' 
            });
        }

        console.log('Comparação de empresas:', {
            provaEmpresa: exam.company,
            usuarioEmpresa: req.user.company._id,
            saoIguais: exam.company.equals(req.user.company._id)
        });

        // Verificar se a prova pertence  empresa do usuário
        if (!exam.company.equals(req.user.company._id)) {
            console.log('Prova não pertence à empresa do usuário');
            return res.status(403).json({ 
                success: false,
                message: 'Você não tem acesso a esta prova.' 
            });
        }

        // Verificar tentativas existentes
        const attempts = await ExamAttempt.find({
            exam: exam._id,
            user: req.user._id
        });

        console.log('Tentativas encontradas:', {
            total: attempts.length,
            limite: exam.attempts,
            ativas: attempts.filter(a => !a.endTime).length,
            concluídas: attempts.filter(a => a.endTime).length
        });

        // Se já existe uma tentativa ativa
        const activeAttempt = attempts.find(a => !a.endTime);
        if (activeAttempt) {
            console.log('Tentativa ativa encontrada:', activeAttempt._id);
            return res.json({ 
                success: true,
                message: 'Continuando tentativa existente'
            });
        }

        // Verificar limite de tentativas
        if (attempts.length >= exam.attempts) {
            console.log('Limite de tentativas excedido');
            return res.status(403).json({ 
                success: false,
                message: 'Você atingiu o limite de tentativas para esta prova.' 
            });
        }

        console.log('Verificação concluída com sucesso');
        res.json({ success: true });

    } catch (error) {
        console.error('=== ERRO NA VERIFICAÇÃO DA PROVA ===');
        console.error('Detalhes do erro:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao verificar prova.',
            error: error.message 
        });
    }
});

// Rota para iniciar a prova
router.get('/:id/take', auth, async (req, res) => {
    try {
        console.log('=== CARREGANDO PROVA ===');
        console.log('ID da prova:', req.params.id);
        console.log('ID do usuário:', req.user._id);
        console.log('Empresa do usuário:', req.user.company._id);

        // Primeiro, verificar se a prova existe
        const exam = await Exam.findById(req.params.id)
            .populate('course');

        if (!exam) {
            console.log('Prova não encontrada');
            req.flash('error', 'Prova não encontrada');
            return res.redirect('/dashboard');
        }

        console.log('Comparação de empresas:', {
            provaEmpresa: exam.company,
            usuarioEmpresa: req.user.company._id,
            saoIguais: exam.company.equals(req.user.company._id)
        });

        // Verificar se a prova pertence à empresa do usuário
        if (!exam.company.equals(req.user.company._id)) {
            console.log('Prova não pertence à empresa do usuário');
            req.flash('error', 'Você não tem acesso a esta prova');
            return res.redirect('/dashboard');
        }

        console.log('Dados da prova encontrada:', {
            id: exam._id,
            title: exam.title,
            company: exam.company,
            questionsCount: exam.questions?.length || 0
        });

        // Buscar ou criar tentativa
        let attempt = await ExamAttempt.findOne({
            exam: exam._id,
            user: req.user._id,
            endTime: null
        });

        console.log('Tentativa existente:', attempt ? 'Sim' : 'Não');

        if (!attempt) {
            console.log('Criando nova tentativa...');
            attempt = new ExamAttempt({
                exam: exam._id,
                user: req.user._id,
                company: req.user.company,
                startTime: new Date(),
                answers: exam.questions.map(question => ({
                    type: question.type || 'multiple_choice',
                    selectedOption: null,
                    text: null,
                    score: 0,
                    isCorrect: false
                })),
                status: 'in_progress'
            });

            try {
                await attempt.save();
                console.log('Nova tentativa criada com sucesso:', attempt._id);
            } catch (saveError) {
                console.error('Erro ao salvar tentativa:', saveError);
                throw saveError;
            }
        }

        console.log('Dados finais para renderização:', {
            examId: exam._id,
            examTitle: exam.title,
            attemptId: attempt._id,
            questionsCount: exam.questions.length,
            timeLimit: exam.timeLimit
        });

        res.render('exams/take', {
            layout: false,
            exam,
            attempt,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error('=== ERRO AO CARREGAR PROVA ===');
        console.error('Detalhes do erro:', error);
        console.error('Stack trace:', error.stack);
        console.error('Dados da requisição:', {
            examId: req.params.id,
            userId: req.user._id,
            company: req.user.company
        });
        req.flash('error', `Erro ao carregar prova: ${error.message}`);
        res.redirect('/dashboard');
    }
});

// Rota para provas de categoria
router.post('/:id/category-exam-submit', auth, async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        const answers = req.body.answers;
        let user = await User.findById(req.user._id);
        
        // Verifica se é uma prova de categoria
        if (!exam.isCategoryExam) {
            return res.status(400).json({ 
                success: false, 
                message: 'Esta não é uma prova de categoria' 
            });
        }

        // Processa as respostas e calcula a pontuação
        const processedAnswers = exam.questions.map((question, index) => ({
            question: question._id,
            selectedOption: Number(answers[index]),
            isCorrect: question.options[Number(answers[index])]?.isCorrect || false
        }));

        const correctAnswers = processedAnswers.filter(a => a.isCorrect).length;
        const score = (correctAnswers / exam.questions.length) * 100;
        const passed = score >= exam.minimumScore;

        // Atualiza a categoria do usuário apenas se passar na prova
        if (passed) {
            user.category = exam.targetCategory; // Nova categoria que a prova concede
            await user.save();

            // Notifica o usuário
            await NotificationManager.createNotification({
                user: user._id,
                title: 'Promoção de Categoria!',
                message: `Parabéns! Você foi promovido para ${exam.targetCategory}!`,
                type: 'achievement'
            });
        }

        // Salva a tentativa
        const attempt = await ExamAttempt.findOneAndUpdate(
            {
                exam: exam._id,
                user: req.user._id,
                endTime: null
            },
            {
                answers: processedAnswers,
                score: score,
                passed: passed,
                endTime: new Date(),
                timeSpent: req.body.timeSpent || 0
            },
            { new: true }
        );

        res.json({ 
            success: true,
            score,
            passed,
            newCategory: passed ? exam.targetCategory : user.category
        });

    } catch (error) {
        console.error('Erro ao submeter prova de categoria:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao submeter prova: ' + error.message 
        });
    }
});

// Nova rota para iniciar a prova
router.post('/:id/start', auth, async (req, res) => {
    try {
        const examId = req.params.id;
        const userId = req.user._id;
        const company = req.user.company;

        console.log('ID da prova:', examId);
        console.log('ID do usuário:', userId);
        console.log('Empresa do usuário:', company);

        // Verifica se a prova existe e pertence à mesma empresa
        const exam = await Exam.findOne({ 
            _id: examId,
            company: company._id 
        });

        if (!exam) {
            return res.status(404).json({ 
                success: false, 
                message: 'Prova não encontrada' 
            });
        }

        // Verifica se já existe uma tentativa em andamento
        const existingAttempt = await ExamAttempt.findOne({
            exam: examId,
            user: userId,
            status: 'in_progress'
        });

        if (existingAttempt) {
            return res.json({ 
                success: true, 
                attemptId: existingAttempt._id 
            });
        }

        // Cria uma nova tentativa
        const attempt = new ExamAttempt({
            exam: examId,
            user: userId,
            company: company._id,
            answers: exam.questions.map(question => ({
                type: question.type || 'multiple_choice',
                selectedOption: null,
                text: null,
                score: 0,
                isCorrect: false
            })),
            status: 'in_progress',
            startTime: new Date()
        });

        await attempt.save();

        res.json({ 
            success: true, 
            attemptId: attempt._id 
        });

    } catch (error) {
        console.error('=== ERRO AO CARREGAR PROVA ===');
        console.error('Detalhes do erro:', error);
        console.error('Stack trace:', error.stack);
        console.error('Dados da requisição:', {
            examId: req.params.id,
            userId: req.user._id,
            company: req.user.company
        });

        res.status(500).json({ 
            success: false, 
            message: 'Erro ao iniciar prova' 
        });
    }
});

// Rota para mostrar página de prova em análise
router.get('/:id/pending-review', auth, async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            req.flash('error', 'Prova não encontrada');
            return res.redirect('/exams');
        }

        res.render('exams/pending-review', {
            exam,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Erro:', error);
        req.flash('error', 'Erro ao carregar página');
        res.redirect('/exams');
    }
});

// Rota para ver feedback da prova dissertativa
router.get('/:id/feedback', auth, async (req, res) => {
    try {
        const attempt = await ExamAttempt.findOne({
            exam: req.params.id,
            user: req.user._id,
            endTime: { $ne: null }
        }).populate({
            path: 'exam',
            populate: {
                path: 'questions'
            }
        });

        if (!attempt) {
            req.flash('error', 'Prova não encontrada');
            return res.redirect('/exams');
        }

        // Verificar se é uma prova dissertativa
        const isEssayExam = attempt.exam.questions.some(q => q.type === 'essay');
        if (!isEssayExam) {
            return res.redirect(`/exams/${req.params.id}/result`);
        }

        res.render('exams/essay-feedback', {
            exam: attempt.exam,
            attempt,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Erro ao carregar feedback:', error);
        req.flash('error', 'Erro ao carregar feedback da prova');
        res.redirect('/exams');
    }
});

export default router;