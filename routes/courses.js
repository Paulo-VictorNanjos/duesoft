import express from 'express';
import auth from '../middlewares/auth.js';
import Course from '../models/Course.js';
import History from '../models/History.js';
import AchievementChecker from '../utils/achievementChecker.js';
import NotificationManager from '../utils/notificationManager.js';
import CertificateGenerator from '../utils/certificateGenerator.js';
import RewardService from '../services/RewardService.js';

const router = express.Router();

// Listar todos os cursos da empresa do usuário
router.get('/', auth, async (req, res) => {
    try {
        const courses = await Course.find({ company: req.user.company });
        const userHistory = await History.find({ user: req.user._id });

        res.render('courses/index', {
            courses,
            userHistory,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Error loading courses:', error);
        req.flash('error', 'Error loading courses');
        res.redirect('/dashboard');
    }
});

// courses.js
router.get('/:id', auth, async (req, res) => {
    try {
        const course = await Course.findOne({ _id: req.params.id, company: req.user.company });
        if (!course) {
            req.flash('error', 'Curso não encontrado.');
            return res.redirect('/courses');
        }

        // Buscar ou criar o histórico do usuário
        let history = await History.findOne({
            user: req.user._id,
            course: course._id
        });

        // Se não existir histórico, criar um novo usando o método estático
        if (!history) {
            history = History.initializeForCourse(req.user._id, course);
            await history.save();
        }

        // Verificar se todos os módulos e aulas estão sincronizados
        const needsUpdate = history.modules.length !== course.modules.length ||
            history.modules.some((module, moduleIndex) => 
                module.lessons.length !== course.modules[moduleIndex]?.lessons.length
            );

        if (needsUpdate) {
            // Atualizar a estrutura mantendo o progresso existente
            history.modules = course.modules.map((module, moduleIndex) => ({
                moduleId: module._id.toString(),
                completed: history.modules[moduleIndex]?.completed || false,
                lastAccessed: history.modules[moduleIndex]?.lastAccessed || null,
                lessons: module.lessons.map((lesson, lessonIndex) => ({
                    lessonId: lesson._id.toString(),
                    completed: history.modules[moduleIndex]?.lessons[lessonIndex]?.completed || false,
                    lastWatched: history.modules[moduleIndex]?.lessons[lessonIndex]?.lastWatched || null,
                    watchTime: history.modules[moduleIndex]?.lessons[lessonIndex]?.watchTime || 0
                }))
            }));

            await history.save();
        }

        // Calcular progresso atual
        history.calculateProgress();
        await history.save();

        // Renderizar a view com todos os dados necessários
        res.render('courses/view', {
            course,
            history,
            progress: history.progress,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error('Erro ao carregar curso:', error);
        req.flash('error', 'Erro ao carregar curso.');
        res.redirect('/courses');
    }
});

// Matricular em um curso
router.post('/:id/enroll', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/courses');
        }

        let history = await History.findOne({
            user: req.user._id,
            course: course._id
        });

        if (!history) {
            history = new History({
                user: req.user._id,
                course: course._id,
                modules: course.modules.map(module => ({
                    moduleId: module._id.toString(),
                    lessons: module.lessons.map(lesson => ({
                        lessonId: lesson._id.toString(),
                        completed: false
                    }))
                })),
                progress: 0
            });
            await history.save();
            req.flash('success', 'Successfully enrolled in course');
        } else {
            req.flash('info', 'Already enrolled in this course');
        }

        res.redirect(`/courses/${course._id}`);
    } catch (error) {
        console.error('Error enrolling in course:', error);
        req.flash('error', 'Error enrolling in course');
        res.redirect('/courses');
    }
});

// Atualizar progresso da aula
router.post('/:id/progress', auth, async (req, res) => {
    try {
        const { moduleIndex, lessonIndex, completed } = req.body;
        let unlockedAchievements = [];
        
        // Validar os índices
        if (moduleIndex === undefined || lessonIndex === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'Índices inválidos' 
            });
        }

        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ 
                success: false, 
                error: 'Curso não encontrado' 
            });
        }

        let history = await History.findOne({
            user: req.user._id,
            course: course._id
        });

        if (!history) {
            history = await History.initializeForCourse(req.user._id, course);
            await history.save();
        }

        // Atualizar progresso da aula
        history.modules[moduleIndex].lessons[lessonIndex].completed = completed;
        history.modules[moduleIndex].lessons[lessonIndex].lastWatched = new Date();

        // Verificar conclusão do módulo
        const allLessonsComplete = history.modules[moduleIndex].lessons
            .every(l => l.completed);
            
        if (allLessonsComplete) {
            history.modules[moduleIndex].completed = true;
            history.modules[moduleIndex].lastAccessed = new Date();
        }

        // Calcular e atualizar o progresso geral
        const totalLessons = history.modules.reduce((total, module) => total + module.lessons.length, 0);
        const completedLessons = history.modules.reduce((total, module) => 
            total + module.lessons.filter(lesson => lesson.completed).length, 0);
        
        history.progress = Math.round((completedLessons / totalLessons) * 100);
        
        // Verificar conclusão do curso e atualizar XP
        if (history.progress === 100 && !history.completedAt) {
            console.log('Curso concluído! Atualizando dados...');
            
            history.completedAt = new Date();
            
            // Adicionar curso à lista de cursos concluídos do usuário
            if (!req.user.completedCourses.includes(course._id)) {
                console.log('Adicionando curso aos concluídos...');
                req.user.completedCourses.push(course._id);
                await req.user.save(); // Salvar primeiro para atualizar a lista de cursos

                // Processar recompensa de moeda virtual
                console.log('Processando recompensa de moeda virtual...');
                try {
                    const isFirstCourse = req.user.completedCourses.length === 1;
                    const rewardType = isFirstCourse ? 'FIRST_COURSE' : 'COURSE_COMPLETION';
                    
                    console.log('Dados da recompensa:', {
                        isFirstCourse,
                        rewardType,
                        userId: req.user._id,
                        companyId: req.user.company._id,
                        courseId: course._id,
                        progress: history.progress
                    });

                    const rewardResult = await RewardService.processReward(
                        req.user,
                        req.user.company,
                        rewardType,
                        {
                            courseId: course._id,
                            progress: 100,
                            relatedModel: 'Course'
                        }
                    );

                    if (rewardResult && rewardResult.success) {
                        console.log('Recompensa processada com sucesso:', rewardResult);
                    } else {
                        console.error('Falha ao processar recompensa:', rewardResult);
                    }
                } catch (error) {
                    console.error('Erro ao processar recompensa:', error);
                }
            }
            
            // Atualizar XP e nível
            req.user.experience += course.experiencePoints;
            req.user.calculateLevel();
            
            console.log('Verificando conquistas...');
            const unlockedAchievements = await AchievementChecker.checkAchievements(req.user._id);
            
            if (unlockedAchievements && unlockedAchievements.length > 0) {
                console.log('Conquistas desbloqueadas:', unlockedAchievements.length);
                const io = req.app.get('io');
                io.to(req.user._id.toString()).emit('achievements:unlocked', unlockedAchievements);
            }

            await NotificationManager.send(
                req.user._id,
                'Curso Concluído!',
                `Parabéns! Você concluiu o curso "${course.title}"`,
                'success',
                `/courses/${course._id}`
            );

            await req.user.save();
            await history.save();
        }

        await history.save();

        // Calcular XP restante para próximo nível
        const nextLevel = req.user.category === 'Junior' ? 1000 : 
                         req.user.category === 'Pleno' ? 2000 : null;
        const remaining = nextLevel ? nextLevel - req.user.experience : 0;

        // Enviar uma única resposta com todas as informações necessárias
        return res.json({
            success: true,
            progress: history.progress,
            moduleProgress: Math.round(
                (history.modules[moduleIndex].lessons.filter(l => l.completed).length / 
                history.modules[moduleIndex].lessons.length) * 100
            ),
            completed: history.progress === 100,
            userExperience: req.user.experience,
            userLevel: req.user.level,
            userCategory: req.user.category,
            remaining: remaining,
            unlockedAchievements: unlockedAchievements
        });

    } catch (error) {
        console.error('Erro ao atualizar progresso:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar progresso' 
        });
    }
});

router.post('/api/lessons/:lessonId/progress', async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { moduleIndex, lessonIndex } = req.body;
        
        // Atualize o documento do curso para marcar a lição como concluída
        const result = await Course.findOneAndUpdate(
            {
                '_id': courseId,
                'modules.lessons._id': lessonId
            },
            {
                $set: {
                    'modules.$[module].lessons.$[lesson].completed': true
                }
            },
            {
                arrayFilters: [
                    { 'module._id': moduleId },
                    { 'lesson._id': lessonId }
                ],
                new: true
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
        res.status(500).json({ success: false, error: 'Erro ao salvar progresso' });
    }
});

// Na rota que marca a conclusão do curso
router.post('/:courseId/complete', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        
        // Adicionar verificação de conquistas
        const unlockedAchievements = await AchievementChecker.checkAchievements(req.user._id);
        
        // Se houver conquistas desbloqueadas, enviar via websocket
        if (unlockedAchievements.length > 0) {
            const io = req.app.get('io');
            io.to(req.user._id.toString()).emit('achievements:unlocked', unlockedAchievements);
        }

        await NotificationManager.send(
            req.user._id,
            'Curso Concluído!',
            `Parabéns! Você concluiu o curso "${course.title}"`,
            'success',
            `/courses/${course._id}`
        );

        res.json({ success: true, unlockedAchievements });
    } catch (error) {
        console.error('Erro ao completar curso:', error);
        res.status(500).json({ success: false });
    }
});

// Rota para gerar certificado
router.get('/:id/certificate', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const history = await History.findOne({
      user: req.user._id,
      course: req.params.id
    });

    if (!course || !history) {
      req.flash('error', 'Curso não encontrado');
      return res.redirect('/courses');
    }

    // Verificar se o curso foi concluído
    if (history.progress !== 100) {
      req.flash('error', 'Complete o curso para gerar o certificado');
      return res.redirect(`/courses/${course._id}`);
    }

    // Gerar certificado
    const generator = new CertificateGenerator(req.user, course);
    const fileName = await generator.generate();

    // Atualizar histórico com o certificado
    history.certificateUrl = `/certificates/${fileName}`;
    history.completedAt = history.completedAt || new Date();
    await history.save();

    // Renderizar página do certificado
    res.render('courses/certificate', {
      course,
      certificateFileName: fileName,
      certificateUrl: `${process.env.BASE_URL}/certificates/${fileName}`,
      duration: Math.ceil(course.modules.reduce((total, module) => 
        total + module.lessons.reduce((sum, lesson) => 
          sum + (lesson.duration || 0), 0), 0) / 60),
      user: req.user
    });

  } catch (error) {
    console.error('Erro ao gerar certificado:', error);
    req.flash('error', 'Erro ao gerar certificado');
    res.redirect(`/courses/${req.params.id}`);
  }
});

// Adicionar esta rota para download de anexos
router.get('/:courseId/attachments/:attachmentId/download', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            req.flash('error', 'Curso não encontrado');
            return res.redirect('/courses');
        }

        const attachment = course.attachments.id(req.params.attachmentId);
        if (!attachment) {
            req.flash('error', 'Anexo não encontrado');
            return res.redirect(`/courses/${req.params.courseId}`);
        }

        // Incrementar contador de downloads
        attachment.downloadCount += 1;
        await course.save();

        res.download(attachment.fileUrl);
    } catch (error) {
        console.error('Erro ao baixar anexo:', error);
        req.flash('error', 'Erro ao baixar anexo');
        res.redirect(`/courses/${req.params.courseId}`);
    }
});

export default router;
