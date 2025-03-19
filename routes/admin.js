import express from 'express';
import auth from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/auth.js';
import { checkCurrencySetup } from '../middlewares/virtualCurrency.js';
import VirtualCurrency from '../models/VirtualCurrency.js';
import Course from '../models/Course.js';
import { Exam, ExamAttempt } from '../models/Exam.js';
import User from '../models/User.js';
import upload from '../middlewares/upload.js';
import Achievement from '../models/Achievement.js';
import Notification from '../models/Notification.js';
import NotificationManager from '../utils/notificationManager.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import License from '../models/License.js';
import LicenseRequest from '../models/LicenseRequest.js';
import LandingPage from '../models/LandingPage.js';
import { planLimits } from '../middlewares/planAccess.js';
import Mentor from '../models/Mentor.js';
import MentorSession from '../models/MentorSession.js';
import * as storeController from '../controllers/storeController.js';
import Company from '../models/Company.js';
import cloudinary from '../config/cloudinary.js';
import CertificateGenerator from '../utils/certificateGenerator.js';
import History from '../models/History.js';
import BannerController from '../controllers/BannerController.js';
import NewsController from '../controllers/NewsController.js';
import AiKnowledge from '../models/AiKnowledge.js';
import tasksRouter from './admin/tasks.js';

const router = express.Router();

router.use(express.urlencoded({ extended: true }));

// Rota de tasks
router.use('/tasks', tasksRouter);

// Rota da loja admin
router.get('/store', [auth, isAdmin, checkCurrencySetup], storeController.admin);

// Lista de cursos
router.get('/courses', auth, isAdmin, async (req, res) => {
    try {
        console.log('=== TENTATIVA DE ACESSO AO PAINEL ADMIN ===');
        console.log('Usuário:', {
            id: req.user?._id,
            email: req.user?.email,
            isAdmin: req.user?.isAdmin,
            company: req.user?.company
        });
        console.log('Empresa:', {
            id: req.company?._id,
            name: req.company?.name,
            plan: req.company?.plan
        });
        
        // Verificar se o usuário tem permissão
        if (!req.user?.isAdmin) {
            console.log('Acesso negado: Usuário não é admin');
            return res.redirect('/dashboard');
        }

        if (!req.company) {
            console.log('Acesso negado: Empresa não encontrada');
            return res.redirect('/dashboard');
        }

        // Buscar cursos com todos os campos necessários
        const courses = await Course.find({ company: req.company._id })
            .select('title description coverImage modules experiencePoints createdAt')
            .sort({ createdAt: -1 });

        console.log('Cursos encontrados:', courses.length);

        // Calcular estatísticas para cada curso
        const coursesWithStats = courses.map(course => {
            const modulesCount = course.modules?.length || 0;
            const lessonsCount = course.modules?.reduce((sum, module) => 
                sum + (module.lessons?.length || 0), 0) || 0;
            const xp = course.experiencePoints || 0;

            return {
                ...course.toObject(),
                modulesCount,
                lessonsCount,
                xp
            };
        });

        // Calcular totais
        const totalStats = coursesWithStats.reduce((stats, course) => {
            stats.totalModules += course.modulesCount;
            stats.totalLessons += course.lessonsCount;
            return stats;
        }, { totalModules: 0, totalLessons: 0 });

        console.log('=== RENDERIZANDO PAINEL ADMIN ===');
        res.render('admin/courses/index', {
            courses: coursesWithStats,
            totalStats,
            user: req.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar painel admin:', error);
        req.flash('error', 'Erro ao carregar painel administrativo');
        res.redirect('/dashboard');
    }
});

// Formulário de novo curso
router.get('/courses/new', auth, isAdmin, (req, res) => {
    res.render('admin/courses/form', {
        course: {},
        user: req.user,
        error: req.flash('error')
    });
});

// Criar novo curso
router.post('/courses', auth, isAdmin, upload.single('coverImage'), async (req, res) => {
    try {
        console.log('=== INICIANDO CRIAÇÃO DE CURSO ===');
        
        const company = req.user.company;
        const currentPlan = company.plan || 'basic';
        const currentCourses = await Course.countDocuments({ company: company._id });
        const planLimit = planLimits[currentPlan] ? planLimits[currentPlan].maxCourses : 5;
        
        console.log('Verificação de limite:', {
            currentCourses,
            planLimit,
            currentPlan
        });

        if (currentCourses >= planLimit) {
            console.log('Limite de cursos atingido - Redirecionando para upgrade');
            return res.render('upgrade-plan', {
                user: req.user,
                feature: 'criação de cursos',
                currentPlan: currentPlan,
                currentUsage: currentCourses,
                planLimit: planLimit,
                planLimits: planLimits,
                message: `Seu plano atual (${currentPlan}) permite apenas ${planLimit} cursos. Você já possui ${currentCourses} cursos.`,
                upgradeReason: 'aumentar o limite de cursos',
                nextPlan: currentPlan === 'basic' ? 'pro' : 'enterprise'
            });
        }

        const { title, description, modules, experiencePoints } = req.body;

        console.log('Processando módulos:', modules);

        // Garantir que modules seja um array
        const processedModules = Array.isArray(modules) ? modules.map(module => ({
            title: module.title || 'Módulo sem título',
            lessons: Array.isArray(module.lessons) ? module.lessons.map(lesson => ({
                title: lesson.title || 'Aula sem título',
                videoUrl: lesson.videoUrl || '',
                duration: parseInt(lesson.duration) || 0
            })) : []
        })) : [];

        console.log('Módulos processados:', processedModules);

        const courseData = {
            title,
            description,
            coverImage: req.file ? `/uploads/${req.file.filename}` : '/images/default-course-cover.jpg',
            modules: processedModules,
            experiencePoints: parseInt(experiencePoints) || 0,
            company: req.company._id
        };

        console.log('Dados do curso a serem salvos:', courseData);

        const course = new Course(courseData);
        await course.save();
        
        console.log('Curso criado com sucesso:', {
            courseId: course._id,
            title: course.title
        });

        req.flash('success', 'Curso criado com sucesso');
        res.redirect('/admin/courses');
    } catch (error) {
        console.error('ERRO AO CRIAR CURSO:', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        req.flash('error', 'Erro ao criar curso');
        res.redirect('/admin/courses/new');
    }
});

// Formulário para editar curso
router.get('/courses/:id/edit', auth, isAdmin, async (req, res) => {
    try {
        const course = await Course.findOne({ _id: req.params.id, company: req.company._id });
        if (!course) {
            req.flash('error', 'Course not found');
            return res.redirect('/admin/courses');
        }
        res.render('admin/courses/form', {
            course,
            user: req.user,
            error: req.flash('error')
        });
    } catch (error) {
        req.flash('error', 'Error loading course');
        res.redirect('/admin/courses');
    }
});

// Atualizar curso
router.post('/courses/:id', auth, isAdmin, upload.single('coverImage'), async (req, res) => {
    try {
        const { title, description, modules, experiencePoints } = req.body;

        const processedModules = modules.map(module => ({
            title: module.title,
            lessons: module.lessons.map(lesson => ({
                title: lesson.title,
                videoUrl: lesson.videoUrl,
                duration: parseInt(lesson.duration)
            }))
        }));

        const updateData = {
            title,
            description,
            modules: processedModules,
            experiencePoints: parseInt(experiencePoints)
        };

        // Adicionar nova imagem apenas se foi enviada
        if (req.file) {
            updateData.coverImage = `/uploads/${req.file.filename}`;

            // Deletar imagem antiga se existir
            const oldCourse = await Course.findById(req.params.id);
            if (oldCourse.coverImage && oldCourse.coverImage !== '/images/default-course-cover.jpg') {
                const oldImagePath = path.join('public', oldCourse.coverImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        await Course.findByIdAndUpdate(req.params.id, updateData);

        req.flash('success', 'Curso atualizado com sucesso');
        res.redirect('/admin/courses');
    } catch (error) {
        req.flash('error', 'Erro ao atualizar curso');
        res.redirect(`/admin/courses/${req.params.id}/edit`);
    }
});

// Rota para tornar um usuário como administrador
router.post('/users/:id/make-admin', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        user.isAdmin = true;
        await user.save();
        req.flash('success', 'User has been made an admin.');
        res.redirect('/admin/users');
    } catch (error) {
        req.flash('error', 'Error making user an admin.');
        res.redirect('/admin/users');
    }
});

// Deletar curso
router.post('/courses/:id/delete', auth, isAdmin, async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        req.flash('success', 'Course deleted successfully');
    } catch (error) {
        req.flash('error', 'Error deleting course');
    }
    res.redirect('/admin/courses');
});

// Lista de usuários
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const users = await User.find({ company: req.company._id }).sort({ createdAt: -1 });
        res.render('admin/users/index', {
            users,
            user: req.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error loading users:', error);
        req.flash('error', 'Erro ao carregar usuários');
        res.redirect('/dashboard');
    }
});

// Editar usuário
router.get('/users/:id/edit', auth, isAdmin, async (req, res) => {
    try {
        const editUser = await User.findById(req.params.id)
            .populate({
                path: 'completedCourses',
                populate: {
                    path: 'course',
                    select: 'title coverImage modules'
                }
            });

        if (!editUser) {
            req.flash('error', 'Usuário não encontrado');
            return res.redirect('/admin/users');
        }

        res.render('admin/users/edit', {
            editUser,
            user: req.user,
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        req.flash('error', 'Erro ao carregar usuário');
        res.redirect('/admin/users');
    }
});

// Atualizar usuário
router.post('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const { name, email } = req.body;
        await User.findByIdAndUpdate(req.params.id, {
            name,
            email
        });
        req.flash('success', 'Usuário atualizado com sucesso');
        res.redirect('/admin/users');
    } catch (error) {
        req.flash('error', 'Erro ao atualizar usuário');
        res.redirect(`/admin/users/${req.params.id}/edit`);
    }
});

// Deletar usuário
router.post('/users/:id/delete', auth, isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        req.flash('success', 'Usuário deletado com sucesso');
    } catch (error) {
        req.flash('error', 'Erro ao deletar usuário');
    }
    res.redirect('/admin/users');
});

// Alternar status de admin
router.post('/users/:id/toggle-admin', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'Usuário não encontrado');
            return res.redirect('/admin/users');
        }
        
        // Não permitir que um admin remova seus próprios privilégios
        if (user._id.toString() === req.user._id.toString()) {
            req.flash('error', 'Você não pode remover seus próprios privilégios de admin');
            return res.redirect('/admin/users');
        }
        
        user.isAdmin = !user.isAdmin;
        await user.save();
        req.flash('success', `Privilégios de admin ${user.isAdmin ? 'concedidos' : 'removidos'} com sucesso`);
    } catch (error) {
        req.flash('error', 'Erro ao alterar privilégios de admin');
    }
    res.redirect('/admin/users');
});

// Lista de usuários com informações detalhadas
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        // Busca os usuários com cursos concluídos populados
        const users = await User.find({ company: req.company._id })
            .populate('completedCourses')
            .sort({ createdAt: -1 });

        // Processa informações adicionais para cada usuário
        const enhancedUsers = users.map(user => {
            // Nível é baseado na experiência (100 XP por nível)
            // Começa no nível 1 e aumenta a cada 100 XP
            const level = Math.floor(user.experience / 100) + 1;
            
            // Conta os cursos concluídos do array completedCourses
            const completedCoursesCount = user.completedCourses ? 
                user.completedCourses.length : 0;

            return {
                ...user.toObject(),
                level,
                completedCoursesCount,
                // Adiciona a categoria do usuário
                category: user.category || 'Iniciante'
            };
        });

        res.render('admin/users/index', {
            users: enhancedUsers,
            user: req.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error loading users:', error);
        req.flash('error', 'Erro ao carregar usuários');
        res.redirect('/dashboard');
    }
});

// Rota de edição com informações detalhadas
router.get('/users/:id/edit', auth, isAdmin, async (req, res) => {
    try {
        const editUser = await User.findById(req.params.id)
            .populate('completedCourses');
            
        if (!editUser) {
            req.flash('error', 'Usuário não encontrado');
            return res.redirect('/admin/users');
        }

        // Calcula informações adicionais
        const level = Math.floor(editUser.experience / 100) + 1;
        const completedCoursesCount = editUser.completedCourses ? 
            editUser.completedCourses.length : 0;

        // Próximo nível
        const nextLevelXP = level * 100;
        const xpToNextLevel = nextLevelXP - editUser.experience;

        res.render('admin/users/edit', {
            editUser: {
                ...editUser.toObject(),
                level,
                completedCoursesCount,
                nextLevelXP,
                xpToNextLevel,
                category: editUser.category || 'Iniciante'
            },
            user: req.user,
            error: req.flash('error')
        });
    } catch (error) {
        req.flash('error', 'Erro ao carregar usuário');
        res.redirect('/admin/users');
    }
});

// Adicionar estatísticas do ranking
router.get('/admin/statistics', auth, isAdmin, async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $lookup: {
                    from: 'histories',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'courseHistories'
                }
            },
            {
                $group: {
                    _id: '$category',
                    userCount: { $sum: 1 },
                    avgXP: { $avg: '$experience' },
                    totalCompletedCourses: {
                        $sum: {
                            $size: {
                                $filter: {
                                    input: '$courseHistories',
                                    as: 'history',
                                    cond: { $eq: ['$$history.progress', 100] }
                                }
                            }
                        }
                    }
                }
            }
        ]);

        res.render('admin/statistics', { stats });
    } catch (error) {
        req.flash('error', 'Error loading statistics');
        res.redirect('/admin/dashboard');
    }
});

// Add this route after your existing exam routes
router.get('/exams/:id/results', auth, isAdmin, async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            req.flash('error', 'Prova não encontrada');
            return res.redirect('/admin/exams');
        }

        const attempts = await ExamAttempt.find({ exam: req.params.id })
            .populate('user', 'name email profilePicture')
            .sort('-createdAt');

        // Calculate statistics only from completed attempts
        const completedAttempts = attempts.filter(a => a.score !== undefined);
        
        const stats = {
            totalAttempts: attempts.length,
            passedAttempts: completedAttempts.filter(a => a.passed).length,
            averageScore: completedAttempts.length > 0 
                ? (completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length).toFixed(1)
                : 0,
            averageTime: completedAttempts.length > 0
                ? (completedAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / completedAttempts.length / 60).toFixed(1)
                : 0
        };

        res.render('admin/exams/results', {
            exam,
            attempts,
            stats,
            user: req.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error loading exam results:', error);
        req.flash('error', 'Erro ao carregar resultados da prova');
        res.redirect('/admin/exams');
    }
});

// A rota POST existente permanece igual
router.post('/achievements', auth, isAdmin, async (req, res) => {
    try {
        console.log('Dados recebidos:', req.body); // Log dos dados recebidos

        // Verifique se todos os campos obrigatórios estão presentes
        if (!req.body.title || !req.body.description || !req.body.icon || !req.body.category || !req.body.conditionType || !req.body.conditionValue || !req.body.xpReward || !req.body.rarity) {
            console.error('Campos obrigatórios não preenchidos');
            req.flash('error', 'Todos os campos obrigatórios devem ser preenchidos.');
            return res.redirect('/admin/achievements/new');
        }

        // Verifique se req.company está definido
        if (!req.company || !req.company._id) {
            console.error('Company não está definida');
            req.flash('error', 'A empresa não está definida.');
            return res.redirect('/admin/achievements/new');
        }

        const achievement = new Achievement({
            title: req.body.title,
            description: req.body.description,
            icon: req.body.icon,
            category: req.body.category,
            condition: {
                type: req.body.conditionType,
                value: parseInt(req.body.conditionValue),
                days: req.body.conditionDays ? parseInt(req.body.conditionDays) : undefined
            },
            xpReward: parseInt(req.body.xpReward),
            rarity: req.body.rarity,
            company: req.company._id // Vincula a conquista à empresa
        });

        await achievement.save();
        console.log('Conquista criada:', achievement);
        
        req.flash('success', 'Conquista criada com sucesso!');
        res.redirect('/admin/achievements');
    } catch (error) {
        console.error('Erro ao criar conquista:', error);
        req.flash('error', 'Erro ao criar conquista: ' + error.message);
        res.redirect('/admin/achievements/new');
    }
});

// Listar conquistas
router.get('/achievements', auth, isAdmin, async (req, res) => {
    try {
        const achievements = await Achievement.find({ company: req.company._id }).sort('category');
        res.render('admin/achievements/index', { 
            achievements,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao listar conquistas:', error);
        req.flash('error', 'Erro ao carregar conquistas');
        res.redirect('/admin');
    }
});

// Formulário de nova conquista
router.get('/achievements/new', auth, isAdmin, async (req, res) => {
    try {
        const conditionTypes = [
            'coursesCompleted',
            'coursesCompletedInPeriod',
            'perfectExamScore',
            'quickExamWithHighScore',
            'reachCategory',
            'loginStreak'
        ];
        
        res.render('admin/achievements/form', {
            achievement: {},
            conditionTypes,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar formulário:', error);
        req.flash('error', 'Erro ao carregar formulário');
        res.redirect('/admin/achievements');
    }
});

// Criar conquista
router.post('/achievements', auth, isAdmin, async (req, res) => {
    try {
        console.log('Dados recebidos:', req.body); // Log dos dados recebidos

        // Verifique se todos os campos obrigatórios estão presentes
        if (!req.body.title || !req.body.description || !req.body.icon || !req.body.category || !req.body.conditionType || !req.body.conditionValue || !req.body.xpReward || !req.body.rarity) {
            console.error('Campos obrigatórios não preenchidos');
            req.flash('error', 'Todos os campos obrigatórios devem ser preenchidos.');
            return res.redirect('/admin/achievements/new');
        }

        // Verifique se req.company está definido
        if (!req.company || !req.company._id) {
            console.error('Company não está definida');
            req.flash('error', 'A empresa não está definida.');
            return res.redirect('/admin/achievements/new');
        }

        const achievement = new Achievement({
            title: req.body.title,
            description: req.body.description,
            icon: req.body.icon,
            category: req.body.category,
            condition: {
                type: req.body.conditionType,
                value: parseInt(req.body.conditionValue),
                days: req.body.conditionDays ? parseInt(req.body.conditionDays) : undefined
            },
            xpReward: parseInt(req.body.xpReward),
            rarity: req.body.rarity,
            company: req.company._id // Vincula a conquista à empresa
        });

        await achievement.save();
        console.log('Conquista criada:', achievement);
        
        req.flash('success', 'Conquista criada com sucesso!');
        res.redirect('/admin/achievements');
    } catch (error) {
        console.error('Erro ao criar conquista:', error);
        req.flash('error', 'Erro ao criar conquista: ' + error.message);
        res.redirect('/admin/achievements/new');
    }
});

// Rota para contar conquistas
router.get('/achievements/count', auth, isAdmin, async (req, res) => {
    try {
        const count = await Achievement.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao contar conquistas' });
    }
});

// Gerenciamento de Notificações
router.get('/notifications', auth, isAdmin, async (req, res) => {
    try {
        const notifications = await Notification.find({ company: req.company._id })
            .populate('user', 'name email')
            .sort('-createdAt');
            
        res.render('admin/notifications/index', { 
            notifications,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao listar notificações:', error);
        req.flash('error', 'Erro ao carregar notificações');
        res.redirect('/admin');
    }
});

// Criar nova notificação em massa
router.post('/notifications', auth, isAdmin, async (req, res) => {
    try {
        console.log('Dados recebidos para criação de notificações:', req.body); // Log dos dados recebidos

        const { title, message, type, userGroup } = req.body;

        // Verifique se todos os campos obrigatórios estão presentes
        if (!title || !message || !type || !userGroup) {
            console.error('Campos obrigatórios não preenchidos:', { title, message, type, userGroup });
            req.flash('error', 'Todos os campos são obrigatórios.');
            return res.redirect('/admin/notifications');
        }

        let users;
        if (userGroup === 'all') {
            users = await User.find({ company: req.company._id });
        } else if (userGroup === 'admin') {
            users = await User.find({ isAdmin: true, company: req.company._id });
        } else {
            users = await User.find({ category: userGroup, company: req.company._id });
        }

        console.log('Usuários selecionados:', users); // Log dos usuários selecionados

        const notifications = await Promise.all(
            users.map(user => {
                console.log(`Enviando notificação para o usuário: ${user._id}`); // Log do usuário
                return NotificationManager.send(user._id, title, message, type, null, req.company._id);
            })
        );

        console.log('Notificações enviadas:', notifications); // Log das notificações enviadas

        req.flash('success', 'Notificações enviadas com sucesso!');
        res.redirect('/admin/notifications');
    } catch (error) {
        console.error('Erro ao criar notificações:', error);
        req.flash('error', 'Erro ao enviar notificações');
        res.redirect('/admin/notifications');
    }
});

// Rota para gerenciar licenças
router.get('/licenses', auth, isAdmin, async (req, res) => {
    try {
        const licenses = await License.find({ company: req.company._id })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.render('admin/licenses/index', {
            licenses,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Erro ao listar licenças:', error);
        req.flash('error', 'Erro ao carregar licenças');
        res.redirect('/admin');
    }
});

// Rota para visualizar solicitações
router.get('/license-requests', auth, isAdmin, async (req, res) => {
    try {
        const newRequests = await LicenseRequest.find({ status: 'pending', company: req.company._id })
            .populate('user')
            .sort('-createdAt');

        const approvedRequests = await LicenseRequest.find({ status: 'approved', company: req.company._id })
            .populate('user')
            .sort('-createdAt');

        const rejectedRequests = await LicenseRequest.find({ status: 'rejected', company: req.company._id })
            .populate('user')
            .sort('-createdAt');

        res.render('admin/licenses/requests', {
            newRequests,
            approvedRequests,
            rejectedRequests,
            user: req.user
        });
    } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
        res.redirect('/admin/dashboard');
    }
});

// Processar solicitações de licença
router.post('/license-requests/:id/process', auth, isAdmin, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const request = await LicenseRequest.findById(req.params.id)
            .populate('user');

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitação não encontrada' 
            });
        }

        if (status === 'approved') {
            const license = new License({
                user: request.user._id,
                type: request.type,
                status: 'active',
                expiryDate: calculateExpiryDate(request.type),
                createdBy: req.user._id,
                company: req.company._id // Vincula a licença à empresa
            });
            await license.save();
        }

        request.status = status;
        request.notes = notes;
        await request.save();

        // Notificar usuário
        await NotificationManager.send(
            request.user._id,
            'Atualização da Solicitação de Licença',
            `Sua solicitação foi ${status === 'approved' ? 'aprovada' : 'rejeitada'}`,
            status === 'approved' ? 'success' : 'warning'
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao processar solicitação:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao processar solicitação' 
        });
    }
});

// Função auxiliar para calcular data de expiração
function calculateExpiryDate(type) {
    const date = new Date();
    switch (type) {
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
    }
    return date;
}

// Rota para revogar licença
router.post('/licenses/:id/revoke', auth, isAdmin, async (req, res) => {
    try {
        const license = await License.findById(req.params.id)
            .populate('user');

        if (!license) {
            return res.status(404).json({ 
                success: false, 
                message: 'Licença não encontrada' 
            });
        }

        // Atualiza o status da licença para inativo
        license.status = 'inactive';
        await license.save();

        // Cancela qualquer solicitação pendente do usuário
        await LicenseRequest.updateMany(
            { user: license.user._id, status: 'pending' },
            { status: 'rejected', notes: 'Licença revogada pelo administrador' }
        );

        // Notifica o usuário
        await NotificationManager.send(
            license.user._id,
            'Licença Revogada',
            'Sua licença foi revogada pelo administrador. Entre em contato para mais informações.',
            'warning',
            '/license/request'
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao revogar licença:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao revogar licença' 
        });
    }
});

// Rota para exibir a página de configurações da landing page
router.get('/landing', auth, isAdmin, async (req, res) => {
    try {
        console.log('Loading landing page admin');
        let landing = await LandingPage.findOne() || new LandingPage();
        console.log('Landing page data:', landing);
        
        res.render('admin/landing/index', {
            layout: 'layouts/admin',
            landing,
            user: req.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar landing page:', error);
        req.flash('error', 'Erro ao carregar configurações da landing page');
        res.redirect('/admin');
    }
});

// Landing Page - Hero Section
router.post('/landing/hero', auth, isAdmin, upload.fields([
    { name: 'heroBackground', maxCount: 1 }
]), async (req, res) => {
    try {
        let landingPage = await LandingPage.findOne() || new LandingPage();
        
        // Atualizar textos
        landingPage.hero = {
            ...landingPage.hero,
            title: req.body.title,
            subtitle: req.body.subtitle
        };

        // Atualizar imagem de fundo se enviada
        if (req.files.heroBackground?.[0]) {
            landingPage.hero.backgroundImage = `/uploads/landing/${req.files.heroBackground[0].filename}`;
        }

        await landingPage.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar hero:', error);
        res.status(500).json({ success: false });
    }
});

// Landing Page - Configurações Gerais
router.post('/landing/general', auth, isAdmin, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'logoWhite', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
]), async (req, res) => {
    try {
        let landingPage = await LandingPage.findOne() || new LandingPage();
        
        // Atualizar logos se enviados
        if (req.files.logo?.[0]) {
            landingPage.general.logo = `/uploads/landing/${req.files.logo[0].filename}`;
        }
        if (req.files.logoWhite?.[0]) {
            landingPage.general.logoWhite = `/uploads/landing/${req.files.logoWhite[0].filename}`;
        }
        if (req.files.favicon?.[0]) {
            landingPage.general.favicon = `/uploads/landing/${req.files.favicon[0].filename}`;
        }

        // Atualizar cores e texto do rodapé
        landingPage.general = {
            ...landingPage.general,
            primaryColor: req.body.primaryColor,
            secondaryColor: req.body.secondaryColor,
            footerText: req.body.footerText
        };

        await landingPage.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar configurações gerais:', error);
        res.status(500).json({ success: false });
    }
});

// Landing Page - SEO
router.post('/landing/seo', auth, isAdmin, upload.fields([
    { name: 'ogImage', maxCount: 1 }
]), async (req, res) => {
    try {
        let landingPage = await LandingPage.findOne() || new LandingPage();
        
        // Atualizar imagem OG se enviada
        if (req.files.ogImage?.[0]) {
            landingPage.seo.ogImage = `/uploads/landing/${req.files.ogImage[0].filename}`;
        }

        // Atualizar meta tags
        landingPage.seo = {
            ...landingPage.seo,
            title: req.body.title,
            description: req.body.description,
            keywords: req.body.keywords
        };

        await landingPage.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar SEO:', error);
        res.status(500).json({ success: false });
    }
});

// Landing Page - Seções
router.post('/landing/sections', auth, isAdmin, async (req, res) => {
    try {
        let landingPage = await LandingPage.findOne() || new LandingPage();
        
        const newSection = {
            type: req.body.type,
            title: req.body.title,
            subtitle: '',
            order: landingPage.sections?.length || 0,
            active: true,
            content: {},
            style: {
                backgroundColor: '#ffffff',
                textColor: '#000000',
                padding: '4rem 0'
            }
        };

        if (!landingPage.sections) landingPage.sections = [];
        landingPage.sections.push(newSection);

        await landingPage.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao adicionar seção:', error);
        res.status(500).json({ success: false });
    }
});

// Reordenar seções
router.post('/landing/sections/reorder', auth, isAdmin, async (req, res) => {
    try {
        const landingPage = await LandingPage.findOne();
        if (!landingPage) {
            return res.status(404).json({ error: 'Landing page não encontrada' });
        }

        const { sections } = req.body;
        const reorderedSections = sections.map(({ id }, index) => {
            const section = landingPage.sections.find(s => s._id.toString() === id);
            if (section) {
                section.order = index;
                return section;
            }
        }).filter(Boolean);

        landingPage.sections = reorderedSections;
        await landingPage.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao reordenar seções:', error);
        res.status(500).json({ error: 'Erro ao reordenar seções' });
    }
});

// Excluir uma seção
router.delete('/landing/sections/:index', auth, isAdmin, async (req, res) => {
    try {
        const landingPage = await LandingPage.findOne();
        if (!landingPage || !landingPage.sections[req.params.index]) {
            return res.status(404).json({ error: 'Seção não encontrada' });
        }

        // Remover a seção
        landingPage.sections.splice(req.params.index, 1);

        // Reordenar as seções restantes
        landingPage.sections = landingPage.sections.map((section, index) => {
            section.order = index;
            return section;
        });

        await landingPage.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir seção:', error);
        res.status(500).json({ error: 'Erro ao excluir seção' });
    }
});

// Buscar dados de uma seção específica
router.get('/landing/sections/:index', auth, isAdmin, async (req, res) => {
    try {
        const landingPage = await LandingPage.findOne();
        if (!landingPage || !landingPage.sections[req.params.index]) {
            return res.status(404).json({ error: 'Seção não encontrada' });
        }

        res.json(landingPage.sections[req.params.index]);
    } catch (error) {
        console.error('Erro ao buscar seção:', error);
        res.status(500).json({ error: 'Erro ao buscar seção' });
    }
});

// Atualizar uma seção específica
router.put('/landing/sections/:index', auth, isAdmin, upload.any(), async (req, res) => {
    try {
        const landingPage = await LandingPage.findOne();
        if (!landingPage || !landingPage.sections[req.params.index]) {
            return res.status(404).json({ error: 'Seção não encontrada' });
        }

        const sectionIndex = parseInt(req.params.index);
        const updatedSection = req.body;

        // Processar uploads de imagem
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                // Verificar se é uma imagem de testimonial
                if (file.fieldname.startsWith('testimonial_image_')) {
                    const testimonialIndex = parseInt(file.fieldname.split('_')[2]);
                    if (updatedSection.content?.testimonials?.[testimonialIndex]) {
                        updatedSection.content.testimonials[testimonialIndex].image = `/uploads/landing/${file.filename}`;
                    }
                }
            });
        }

        // Manter os campos existentes e atualizar apenas os enviados
        landingPage.sections[sectionIndex] = {
            ...landingPage.sections[sectionIndex].toObject(),
            ...updatedSection,
            content: {
                ...landingPage.sections[sectionIndex].content,
                ...updatedSection.content
            },
            style: {
                ...landingPage.sections[sectionIndex].style,
                ...updatedSection.style
            }
        };

        await landingPage.save();
        console.log('Seção atualizada com sucesso:', landingPage.sections[sectionIndex]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar seção:', error);
        res.status(500).json({ error: 'Erro ao atualizar seção' });
    }
});

// Rota para exibir a página de configurações da landing page
router.get('/landing/settings', auth, isAdmin, async (req, res) => {
    try {
        const landing = await LandingPage.findOne();
        res.render('admin/landing/index', {
            landing,
            user: req.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        req.flash('error', 'Erro ao carregar configurações');
        res.redirect('/admin');
    }
});

// Rota para salvar as configurações
router.post('/landing/settings', auth, isAdmin, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'logoWhite', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'heroBackground', maxCount: 1 },
    { name: 'heroVideo', maxCount: 1 },
    // Adicionar campos para imagens de testimonials
    { name: 'testimonialImage', maxCount: 10 }, // Permite até 10 imagens de testimonials
    // Adicionar qualquer campo de imagem que possa vir dos testimonials dinâmicos
    ...Array.from({ length: 10 }, (_, i) => ({ 
        name: `testimonials[${i}][image]`, 
        maxCount: 1 
    }))
]), async (req, res) => {
    try {
        console.log('Dados recebidos:', req.body); // Log para debug

        let landing = await LandingPage.findOne() || new LandingPage();

        // Processar configurações gerais
        landing.general = {
            ...landing.general,
            primaryColor: req.body.primaryColor,
            secondaryColor: req.body.secondaryColor,
            contactEmail: req.body.contactEmail,
            contactPhone: req.body.contactPhone
        };

        // Processar hero section
        landing.hero = {
            ...landing.hero,
            title: req.body.heroTitle,
            subtitle: req.body.heroSubtitle
        };

        // Processar uploads
        if (req.files) {
            Object.entries(req.files).forEach(([fieldName, files]) => {
                if (files && files[0]) {
                    const filePath = `/uploads/landing/${files[0].filename}`;
                    
                    // Processar campos de testimonials
                    if (fieldName.startsWith('testimonials[')) {
                        const match = fieldName.match(/testimonials\[(\d+)\]/);
                        if (match) {
                            const index = parseInt(match[1]);
                            if (testimonials[index]) {
                                testimonials[index].image = filePath;
                            }
                        }
                    } else {
                        // Processar outros campos normalmente
                        switch(fieldName) {
                            case 'logo':
                                landing.general.logo = filePath;
                                break;
                            case 'logoWhite':
                                landing.general.logoWhite = filePath;
                                break;
                            case 'favicon':
                                landing.general.favicon = filePath;
                                break;
                            case 'heroBackground':
                                landing.hero.backgroundImage = filePath;
                                break;
                            case 'heroVideo':
                                landing.hero.backgroundVideo = filePath;
                                break;
                        }
                    }
                }
            });
        }

        // Processar seções
        const features = req.body.featuresData ? JSON.parse(req.body.featuresData) : [];
        const testimonials = req.body.testimonialsData ? JSON.parse(req.body.testimonialsData) : [];

        // Atualizar as seções mantendo a estrutura existente
        landing.sections = landing.sections || [];
        
        // Atualizar ou adicionar seção de features
        const featuresIndex = landing.sections.findIndex(s => s.type === 'features');
        const featuresSection = {
            type: 'features',
            title: req.body.featuresTitle,
            subtitle: req.body.featuresSubtitle,
            style: {
                backgroundColor: req.body.featuresBgColor,
                textColor: req.body.featuresTextColor,
                padding: req.body.featuresPadding
            },
            content: { features }
        };

        if (featuresIndex >= 0) {
            landing.sections[featuresIndex] = featuresSection;
        } else {
            landing.sections.push(featuresSection);
        }

        // Atualizar ou adicionar seção de testimonials
        const testimonialsIndex = landing.sections.findIndex(s => s.type === 'testimonials');
        const testimonialsSection = {
            type: 'testimonials',
            title: req.body.testimonialsTitle,
            subtitle: req.body.testimonialsSubtitle,
            style: {
                backgroundColor: req.body.testimonialsBgColor,
                textColor: req.body.testimonialsTextColor,
                padding: req.body.testimonialsPadding
            },
            content: { testimonials }
        };

        if (testimonialsIndex >= 0) {
            landing.sections[testimonialsIndex] = testimonialsSection;
        } else {
            landing.sections.push(testimonialsSection);
        }

        await landing.save();
        console.log('Landing page salva com sucesso'); // Log para debug
        
        res.json({ success: true });

    } catch (error) {
        console.error('Erro ao salvar landing page:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao salvar configurações'
        });
    }
});

// Deletar conquista
router.delete('/achievements/:id', auth, isAdmin, async (req, res) => {
    try {
        const achievementId = req.params.id;
        await Achievement.findByIdAndDelete(achievementId);
        req.flash('success', 'Conquista deletada com sucesso!');
        res.status(200).json({ message: 'Conquista deletada com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar conquista:', error);
        req.flash('error', 'Erro ao deletar conquista: ' + error.message);
        res.status(500).json({ error: 'Erro ao deletar conquista' });
    }
});

// Rota para exibir o formulário de edição de conquista
router.get('/achievements/:id/edit', auth, isAdmin, async (req, res) => {
    try {
        const achievement = await Achievement.findById(req.params.id);
        if (!achievement) {
            req.flash('error', 'Conquista não encontrada');
            return res.redirect('/admin/achievements');
        }

        const conditionTypes = [
            'coursesCompleted',
            'examsPassed',
            'experienceReached',
            'messagesExchanged'
        ];

        res.render('admin/achievements/form', {
            achievement,
            conditionTypes,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar conquista para edição:', error);
        req.flash('error', 'Erro ao carregar conquista para edição');
        res.redirect('/admin/achievements');
    }
});

// Atualizar conquista
router.post('/achievements/:id', auth, isAdmin, async (req, res) => {
    try {
        const achievementId = req.params.id;
        const updatedAchievement = await Achievement.findByIdAndUpdate(achievementId, req.body, { new: true });
        req.flash('success', 'Conquista atualizada com sucesso!');
        res.redirect('/admin/achievements');
    } catch (error) {
        console.error('Erro ao atualizar conquista:', error);
        req.flash('error', 'Erro ao atualizar conquista: ' + error.message);
        res.redirect(`/admin/achievements/${req.params.id}/edit`);
    }
});

// Rota do Dashboard Admin
router.get('/dashboard', auth, isAdmin, async (req, res) => {
    try {
        const company = req.company;
        
        // Buscar estatísticas gerais
        const stats = await Promise.all([
            // Contagem de usuários ativos
            User.countDocuments({ 
                company: company._id, 
                isActive: true 
            }),

            // Contagem de cursos
            Course.countDocuments({ company: company._id }),

            // Contagem de provas realizadas
            ExamAttempt.countDocuments({ 
                company: company._id,
                completed: true
            }),

            // Cursos concluídos (últimos 30 dias)
            Course.aggregate([
                {
                    $match: { 
                        company: company._id,
                        completedAt: { 
                            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
                        }
                    }
                },
                { $count: "total" }
            ]),

            // Taxa média de aprovação em provas
            ExamAttempt.aggregate([
                {
                    $match: { 
                        company: company._id,
                        completed: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgGrade: { $avg: "$grade" }
                    }
                }
            ])
        ]);

        // Processar dados para o dashboard
        const dashboardData = {
            activeUsers: stats[0],
            totalCourses: stats[1],
            completedExams: stats[2],
            recentCompletions: stats[3][0]?.total || 0,
            averageGrade: Math.round(stats[4][0]?.avgGrade || 0),
            
            // Calcular taxa de crescimento (exemplo)
            userGrowth: await calculateUserGrowth(company._id),
            
            // Dados para gráficos
            chartData: await generateChartData(company._id)
        };

        res.render('admin/dashboard', {
            user: req.user,
            stats: dashboardData,
            path: '/admin/dashboard'
        });

    } catch (error) {
        console.error('Erro no dashboard:', error);
        req.flash('error', 'Erro ao carregar dashboard');
        res.redirect('/admin');
    }
});

// Função auxiliar para calcular crescimento de usuários
async function calculateUserGrowth(companyId) {
    const now = new Date();
    const lastMonth = new Date(now.setMonth(now.getMonth() - 1));

    const [currentUsers, previousUsers] = await Promise.all([
        User.countDocuments({ 
            company: companyId,
            createdAt: { $gte: lastMonth }
        }),
        User.countDocuments({ 
            company: companyId,
            createdAt: { 
                $lt: lastMonth,
                $gte: new Date(now.setMonth(now.getMonth() - 1))
            }
        })
    ]);

    if (previousUsers === 0) return 100;
    return Math.round(((currentUsers - previousUsers) / previousUsers) * 100);
}

// Função para gerar dados dos gráficos
async function generateChartData(companyId) {
    // Últimos 6 meses
}

// Rota para listar mentores
router.get('/mentoring', auth, isAdmin, async (req, res) => {
    try {
        const mentors = await Mentor.find({ company: req.company._id })
            .populate('user', 'name email profilePicture')
            .sort('-createdAt');
        
        const pendingSessions = await MentorSession.countDocuments({
            company: req.company._id,
            status: 'pending'
        });

        res.render('admin/mentoring/index', {
            mentors,
            pendingSessions,
            path: '/admin/mentoring',
            user: req.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar página de mentoria:', error);
        req.flash('error', 'Erro ao carregar mentores');
        res.redirect('/admin/dashboard');
    }
});

// Aprovar/Rejeitar mentor
router.post('/mentoring/mentors/:id/status', auth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const mentor = await Mentor.findById(id);
        if (!mentor) {
            return res.status(404).json({ error: 'Mentor não encontrado' });
        }

        mentor.active = status === 'approve';
        await mentor.save();

        // Notificar o usuário
        await NotificationManager.send(
            mentor.user,
            'Status de Mentor Atualizado',
            `Seu cadastro como mentor foi ${status === 'approve' ? 'aprovado' : 'rejeitado'}`,
            status === 'approve' ? 'success' : 'warning'
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar status do mentor:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});

// Relatórios de mentoria
router.get('/mentoring/reports', auth, isAdmin, async (req, res) => {
    try {
        const sessions = await MentorSession.find({ company: req.company._id })
            .populate('mentor', 'user')
            .populate('mentee', 'name email')
            .sort('-dateTime');

        const stats = {
            totalSessions: sessions.length,
            completedSessions: sessions.filter(s => s.status === 'completed').length,
            averageRating: calculateAverageRating(sessions),
            totalHours: calculateTotalHours(sessions)
        };

        res.render('admin/mentoring/reports', {
            sessions,
            stats,
            path: '/admin/mentoring/reports',
            user: req.user
        });
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        req.flash('error', 'Erro ao carregar relatórios');
        res.redirect('/admin/mentoring');
    }
});

// Funções auxiliares
function calculateAverageRating(sessions) {
    const ratedSessions = sessions.filter(s => s.rating);
    if (ratedSessions.length === 0) return 0;
    return (ratedSessions.reduce((sum, s) => sum + s.rating, 0) / ratedSessions.length).toFixed(1);
}

function calculateTotalHours(sessions) {
    return sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
}

// Lista de mentores no painel admin
router.get('/mentors', auth, isAdmin, async (req, res) => {
    try {
        const mentors = await Mentor.find({ company: req.company._id })
            .populate('user', 'name email profilePicture')
            .sort('-createdAt');

        res.render('admin/mentors/index', {
            mentors,
            user: req.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao listar mentores:', error);
        req.flash('error', 'Erro ao carregar lista de mentores');
        res.redirect('/admin/dashboard');
    }
});

// Formulário de novo mentor
router.get('/mentors/new', auth, isAdmin, async (req, res) => {
    try {
        // Buscar usuários que não são mentores ainda
        const existingMentorUserIds = await Mentor.distinct('user');
        const availableUsers = await User.find({
            company: req.company._id,
            _id: { $nin: existingMentorUserIds }
        });

        res.render('admin/mentors/form', {
            mentor: {},
            availableUsers,
            user: req.user,
            error: req.flash('error')
        });
    } catch (error) {
        req.flash('error', 'Erro ao carregar formulário');
        res.redirect('/admin/mentors');
    }
});

// Criar novo mentor
router.post('/mentors', auth, isAdmin, async (req, res) => {
    try {
        const {
            userId,
            specialties,
            biography,
            experience,
            hourlyRate,
            availability
        } = req.body;

        // Processar disponibilidade
        const processedAvailability = Array.isArray(availability) ? availability : [];
        if (typeof availability === 'object') {
            Object.keys(availability).forEach(day => {
                if (availability[day].enabled) {
                    processedAvailability.push({
                        dayOfWeek: parseInt(day),
                        startTime: availability[day].startTime,
                        endTime: availability[day].endTime
                    });
                }
            });
        }

        // Buscar usuário para enviar email
        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', 'Usuário não encontrado');
            return res.redirect('/admin/mentors');
        }

        const mentor = await Mentor.create({
            user: userId,
            company: req.company._id,
            specialties: Array.isArray(specialties) ? specialties : [specialties],
            biography,
            experience,
            hourlyRate: parseFloat(hourlyRate),
            availability: processedAvailability,
            active: true,
            verified: true
        });

        // Atualizar o usuário para ser um mentor
        await User.findByIdAndUpdate(userId, { isMentor: true });

        // Notificar usuário que foi designado como mentor
        await NotificationManager.send(
            userId,
            'Você agora é um mentor!',
            'Você foi designado como mentor na plataforma.',
            'success',
            '/mentor/dashboard',
            req.company._id
        );

        // Enviar email de boas-vindas
        await sendMentorWelcomeEmail(user.email, {
            name: user.name,
            company: req.company.name
        });

        // Flash message de sucesso
        req.flash('success', 'Mentor cadastrado com sucesso!');
        
        // Redirecionar para a página de gestão de mentoria
        res.redirect('/admin/mentoring');

    } catch (error) {
        console.error('Erro ao criar mentor:', error);
        req.flash('error', 'Erro ao cadastrar mentor');
        res.redirect('/admin/mentors/new');
    }
});

// Editar mentor
router.get('/mentors/:id/edit', auth, isAdmin, async (req, res) => {
    try {
        const mentor = await Mentor.findById(req.params.id)
            .populate('user', 'name email profilePicture');

        if (!mentor) {
            req.flash('error', 'Mentor não encontrado');
            return res.redirect('/admin/mentors');
        }

        res.render('admin/mentors/form', {
            mentor,
            user: req.user,
            error: req.flash('error')
        });
    } catch (error) {
        req.flash('error', 'Erro ao carregar mentor');
        res.redirect('/admin/mentors');
    }
});

// Atualizar mentor
router.post('/mentors/:id', auth, isAdmin, async (req, res) => {
    try {
        const {
            specialties,
            biography,
            hourlyRate,
            availability,
            active
        } = req.body;

        const processedAvailability = Array.isArray(availability) ? availability : [];
        if (typeof availability === 'object') {
            Object.keys(availability).forEach(day => {
                if (availability[day].enabled) {
                    processedAvailability.push({
                        dayOfWeek: parseInt(day),
                        startTime: availability[day].startTime,
                        endTime: availability[day].endTime
                    });
                }
            });
        }

        await Mentor.findByIdAndUpdate(req.params.id, {
            specialties: Array.isArray(specialties) ? specialties : [specialties],
            biography,
            hourlyRate: parseFloat(hourlyRate),
            availability: processedAvailability,
            active: !!active
        });

        req.flash('success', 'Mentor atualizado com sucesso');
        res.redirect('/admin/mentors');
    } catch (error) {
        console.error('Erro ao atualizar mentor:', error);
        req.flash('error', 'Erro ao atualizar mentor');
        res.redirect(`/admin/mentors/${req.params.id}/edit`);
    }
});

// Alternar status do mentor
router.post('/mentors/:id/toggle-status', auth, isAdmin, async (req, res) => {
    try {
        const mentor = await Mentor.findById(req.params.id);
        mentor.active = !mentor.active;
        await mentor.save();

        res.json({ success: true, active: mentor.active });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao alterar status' });
    }
});

// Rota para página de crédito de moedas
router.get('/virtual-currency/credit', auth, isAdmin, async (req, res) => {
    try {
        const [users, currency] = await Promise.all([
            User.find({ company: req.company._id }).sort('name'),
            VirtualCurrency.findOne({ company: req.company._id })
        ]);

        res.render('admin/virtualCurrency/credit', {
            users,
            currency
        });
    } catch (error) {
        console.error('Erro ao carregar página de crédito:', error);
        res.status(500).send('Erro ao carregar página');
    }
});

// Rota para adicionar anexo ao curso
router.post('/courses/:courseId/attachments', auth, isAdmin, upload.single('file'), async (req, res) => {
    try {
        const course = await Course.findOne({ 
            _id: req.params.courseId,
            company: req.company._id
        });

        if (!course) {
            return res.status(404).json({ 
                success: false, 
                message: 'Curso não encontrado' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nenhum arquivo enviado' 
            });
        }

        const attachment = {
            title: req.body.title,
            description: req.body.description || '',
            fileUrl: `/uploads/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: req.user._id
        };

        course.attachments.push(attachment);
        await course.save();

        res.json({ 
            success: true, 
            attachment 
        });
    } catch (error) {
        console.error('Erro ao adicionar anexo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao adicionar anexo' 
        });
    }
});

// Rota para remover anexo do curso (mantendo a rota antiga para compatibilidade)
router.delete('/api/courses/:courseId/attachments/:attachmentId', auth, isAdmin, async (req, res) => {
    try {
        const course = await Course.findOne({ 
            _id: req.params.courseId,
            company: req.company._id
        });

        if (!course) {
            return res.status(404).json({ 
                success: false, 
                message: 'Curso não encontrado' 
            });
        }

        const attachment = course.attachments.id(req.params.attachmentId);
        if (!attachment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Anexo não encontrado' 
            });
        }

        // Remover arquivo físico
        const filePath = path.join('public', attachment.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remover do banco de dados
        await Course.updateOne(
            { _id: course._id },
            { $pull: { attachments: { _id: req.params.attachmentId } } }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao remover anexo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao remover anexo' 
        });
    }
});

router.get('/certificate-settings', auth, isAdmin, async (req, res) => {
    try {
        const company = await Company.findById(req.user.company);
        res.render('admin/certificate-settings', { company });
    } catch (error) {
        console.error('Erro ao carregar configurações do certificado:', error);
        req.flash('error', 'Erro ao carregar configurações');
        res.redirect('/admin');
    }
});

router.post('/certificate-settings', auth, isAdmin, 
    upload.fields([
        { name: 'certificateLogo', maxCount: 1 },
        { name: 'certificateBackground', maxCount: 1 },
        { name: 'signatureImage', maxCount: 1 }
    ]), 
    async (req, res) => {
        try {
            const company = await Company.findById(req.user.company);
            const updates = {
                'certificate.title': req.body.certificateTitle,
                'certificate.subtitle': req.body.certificateSubtitle,
                'certificate.description': req.body.certificateDescription,
                'certificate.signature.name': req.body.signatureName,
                'certificate.signature.role': req.body.signatureRole
            };

            // Upload das imagens para o Cloudinary
            if (req.files) {
                console.log('Arquivos recebidos:', req.files);
                for (const [fieldName, files] of Object.entries(req.files)) {
                    if (files && files[0]) {
                        console.log('Tentando fazer upload do arquivo:', fieldName);
                        const result = await cloudinary.uploader.upload(
                            files[0].path,
                            {
                                folder: `companies/${company._id}/certificates`
                            }
                        );
                        console.log('Resultado do upload:', result);

                        switch (fieldName) {
                            case 'certificateLogo':
                                updates['certificate.logo'] = result.secure_url;
                                break;
                            case 'certificateBackground':
                                updates['certificate.background'] = result.secure_url;
                                break;
                            case 'signatureImage':
                                updates['certificate.signature.image'] = result.secure_url;
                                break;
                        }
                    }
                }
            }

            await Company.findByIdAndUpdate(req.user.company, { $set: updates });
            req.flash('success', 'Configurações do certificado atualizadas com sucesso');
            res.redirect('/admin/certificate-settings');
        } catch (error) {
            console.error('Erro detalhado:', error);
            console.error('Erro ao salvar configurações do certificado:', error);
            req.flash('error', 'Erro ao salvar configurações');
            res.redirect('/admin/certificate-settings');
        }
    }
);

// Rota para buscar estatísticas em tempo real
router.get('/api/dashboard-stats', auth, isAdmin, async (req, res) => {
    try {
        console.log('=== INICIANDO BUSCA DE ESTATÍSTICAS ===');
        const company = req.company;
        console.log('Company ID:', company._id);
        
        const period = req.query.period || 'month';
        console.log('Período selecionado:', period);
        
        // Configuração de datas e filtros
        const currentDate = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);

        // Cálculo do período anterior para comparação
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        twoMonthsAgo.setHours(0, 0, 0, 0);

        // Crescimento de usuários
        const previousUsersCount = await User.countDocuments({
            company: company._id,
            createdAt: {
                $gte: twoMonthsAgo,
                $lt: monthAgo
            },
            isDeleted: { $ne: true }
        });

        const currentUsersCount = await User.countDocuments({
            company: company._id,
            createdAt: {
                $gte: monthAgo,
                $lt: currentDate
            },
            isDeleted: { $ne: true }
        });

        const userGrowth = previousUsersCount === 0 ? 
            (currentUsersCount > 0 ? 100 : 0) : 
            ((currentUsersCount - previousUsersCount) / previousUsersCount) * 100;

        console.log('Crescimento de usuários:', {
            periodoAnterior: `${twoMonthsAgo.toLocaleDateString()} até ${monthAgo.toLocaleDateString()}`,
            periodoAtual: `${monthAgo.toLocaleDateString()} até ${currentDate.toLocaleDateString()}`,
            usuariosAnteriores: previousUsersCount,
            usuariosAtuais: currentUsersCount,
            crescimento: userGrowth.toFixed(1) + '%'
        });

        // Filtro de data para outras consultas
        const dateFilter = {
            $gte: monthAgo,
            $lt: currentDate
        };
        console.log('Filtro de data:', {
            de: monthAgo.toLocaleDateString(),
            ate: currentDate.toLocaleDateString()
        });

        // Usuários ativos (com licença válida ou acesso recente)
        const activeUsers = await User.countDocuments({
            company: company._id,
            $or: [
                { licenseExpiresAt: { $gt: currentDate } },
                { lastAccess: { $gt: monthAgo } },
                { updatedAt: { $gt: monthAgo } }
            ],
            isDeleted: { $ne: true }
        });
        console.log('Usuários ativos:', activeUsers);

        // Total de cursos ativos
        const totalCourses = await Course.countDocuments({ 
            company: company._id,
            isDeleted: { $ne: true }
        });
        console.log('Total de cursos:', totalCourses);

        // Exames completados (total histórico)
        const completedExams = await ExamAttempt.countDocuments({
            company: company._id,
            status: 'completed',
            isDeleted: { $ne: true }
        });
        console.log('Total de exames completados:', completedExams);

        // Estatísticas detalhadas de exames
        const examStats = await ExamAttempt.aggregate([
            {
                $match: {
                    company: company._id,
                    status: { $in: ['completed', 'graded'] },
                    isDeleted: { $ne: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAttempts: { $sum: 1 },
                    passedAttempts: {
                        $sum: { $cond: [{ $eq: ["$passed", true] }, 1, 0] }
                    },
                    averageScore: { $avg: "$score" }
                }
            }
        ]);
        console.log('Estatísticas de exames:', examStats[0] || 'Nenhum exame encontrado');

        // Estatísticas de cursos e usuários
        const userStats = await User.aggregate([
            {
                $match: {
                    company: company._id,
                    isDeleted: { $ne: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    totalCompletedCourses: { 
                        $sum: { 
                            $cond: [
                                { $isArray: "$completedCourses" },
                                { $size: "$completedCourses" },
                                0
                            ]
                        }
                    }
                }
            }
        ]);
        
        const stats = userStats[0] || { totalUsers: 0, totalCompletedCourses: 0 };
        console.log('Estatísticas de usuários:', stats);

        // Usuários ativos hoje
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const activeToday = await User.countDocuments({
            company: company._id,
            $or: [
                { lastAccess: { $gte: todayStart } },
                { updatedAt: { $gte: todayStart } }
            ],
            isDeleted: { $ne: true }
        });
        console.log('Usuários ativos hoje:', activeToday);
        
        const engagementRate = stats.totalUsers > 0 ? (activeToday / stats.totalUsers) * 100 : 0;
        console.log('Taxa de engajamento:', engagementRate.toFixed(1) + '%');

        // Progresso dos alunos
        console.log('Buscando progresso dos alunos...');
        // Distribuição de progresso dos alunos
        const progressData = await User.aggregate([
            {
                $match: {
                    company: company._id,
                    isDeleted: { $ne: true }
                }
            },
            {
                $project: {
                    completedCoursesCount: {
                        $cond: [
                            { $isArray: "$completedCourses" },
                            { $size: "$completedCourses" },
                            0
                        ]
                    },
                    enrolledCoursesCount: {
                        $cond: [
                            { $isArray: "$enrolledCourses" },
                            { $size: "$enrolledCourses" },
                            0
                        ]
                    }
                }
            },
            {
                $project: {
                    progressPercentage: {
                        $multiply: [
                            {
                                $cond: [
                                    { $eq: ["$completedCoursesCount", 0] },
                                    0,
                                    {
                                        $divide: [
                                            "$completedCoursesCount",
                                            { $add: ["$enrolledCoursesCount", "$completedCoursesCount"] }
                                        ]
                                    }
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    "0-20": {
                        $sum: { $cond: [{ $and: [{ $gte: ["$progressPercentage", 0] }, { $lt: ["$progressPercentage", 21] }] }, 1, 0] }
                    },
                    "21-40": {
                        $sum: { $cond: [{ $and: [{ $gte: ["$progressPercentage", 21] }, { $lt: ["$progressPercentage", 41] }] }, 1, 0] }
                    },
                    "41-60": {
                        $sum: { $cond: [{ $and: [{ $gte: ["$progressPercentage", 41] }, { $lt: ["$progressPercentage", 61] }] }, 1, 0] }
                    },
                    "61-80": {
                        $sum: { $cond: [{ $and: [{ $gte: ["$progressPercentage", 61] }, { $lt: ["$progressPercentage", 81] }] }, 1, 0] }
                    },
                    "81-100": {
                        $sum: { $cond: [{ $gte: ["$progressPercentage", 81] }, 1, 0] }
                    }
                }
            }
        ]);
        console.log('Distribuição de progresso:', progressData[0] || 'Nenhum dado encontrado');

        // Distribuição de notas
        const gradeDistribution = await ExamAttempt.aggregate([
            {
                $match: {
                    company: company._id,
                    completed: true,
                    isDeleted: { $ne: true }
                }
            },
            {
                $group: {
                    _id: null,
                    "0-20": {
                        $sum: { $cond: [{ $and: [{ $gte: ["$score", 0] }, { $lt: ["$score", 21] }] }, 1, 0] }
                    },
                    "21-40": {
                        $sum: { $cond: [{ $and: [{ $gte: ["$score", 21] }, { $lt: ["$score", 41] }] }, 1, 0] }
                    },
                    "41-60": {
                        $sum: { $cond: [{ $and: [{ $gte: ["$score", 41] }, { $lt: ["$score", 61] }] }, 1, 0] }
                    },
                    "61-80": {
                        $sum: { $cond: [{ $and: [{ $gte: ["$score", 61] }, { $lt: ["$score", 81] }] }, 1, 0] }
                    },
                    "81-100": {
                        $sum: { $cond: [{ $gte: ["$score", 81] }, 1, 0] }
                    }
                }
            }
        ]);
        console.log('Distribuição de notas:', gradeDistribution[0] || 'Nenhum dado encontrado');

        // Cursos recentemente concluídos
        const recentCompletions = await User.aggregate([
            {
                $match: {
                    company: company._id,
                    completedCourses: { $exists: true, $ne: [] },
                    isDeleted: { $ne: true }
                }
            },
            { $unwind: "$completedCourses" },
            {
                $lookup: {
                    from: "courses",
                    let: { courseId: "$completedCourses" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$courseId"] },
                                company: company._id,
                                isDeleted: { $ne: true }
                            }
                        }
                    ],
                    as: "courseDetails"
                }
            },
            { $unwind: { 
                path: "$courseDetails",
                preserveNullAndEmptyArrays: true
            }},
            {
                $project: {
                    _id: 0,
                    userName: { $ifNull: ["$name", "Usuário"] },
                    courseName: { $ifNull: ["$courseDetails.title", "Curso não encontrado"] },
                    completedAt: { $ifNull: ["$updatedAt", new Date()] }
                }
            },
            { $match: { 
                courseName: { $ne: "Curso não encontrado" }
            }},
            { $sort: { completedAt: -1 } },
            { $limit: 5 }
        ]);
        console.log('Cursos recentemente concluídos:', JSON.stringify(recentCompletions, null, 2));

        const response = {
            activeUsers,
            userGrowth: userGrowth.toFixed(1),
            totalCourses,
            completedCourses: stats.totalCompletedCourses,
            completedExams,
            examPassRate: examStats[0] ? 
                ((examStats[0].passedAttempts / examStats[0].totalAttempts) * 100).toFixed(1) : '0',
            engagementRate: engagementRate.toFixed(1),
            activeToday,
            charts: {
                progress: progressData[0] || {
                    '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0
                },
                grades: gradeDistribution[0] || {
                    '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0
                }
            },
            recentCompletions
        };

        console.log('=== RESPOSTA FINAL ===');
        console.log(JSON.stringify(response, null, 2));

        res.json(response);

    } catch (error) {
        console.error('=== ERRO AO BUSCAR ESTATÍSTICAS ===');
        console.error('Detalhes do erro:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar estatísticas',
            message: error.message
        });
    }
});

function getDaysDifference(period) {
    switch(period) {
        case 'today': return 1;
        case 'week': return 7;
        case 'month': return 30;
        case 'year': return 365;
        default: return 30;
    }
}

// Rotas de Banners
router.get('/banners', auth, isAdmin, BannerController.listAdmin);
router.post('/banners', auth, isAdmin, upload.single('image'), BannerController.create);
router.get('/banners/:id', auth, isAdmin, BannerController.get);
router.put('/banners/:id', auth, isAdmin, upload.single('image'), BannerController.update);
router.delete('/banners/:id', auth, isAdmin, BannerController.delete);

// News routes
router.post('/news', upload.single('image'), NewsController.create);
router.get('/news', NewsController.listAdmin);
router.get('/news/:id', NewsController.get);
router.put('/news/:id', upload.single('image'), NewsController.update);
router.delete('/news/:id', NewsController.delete);

// Rota para obter detalhes do curso
router.get('/courses/:id/details', auth, isAdmin, async (req, res) => {
    try {
        const course = await Course.findOne({ 
            _id: req.params.id,
            company: req.company._id
        });
        
        if (!course) {
            return res.status(404).json({ 
                success: false, 
                message: 'Curso não encontrado' 
            });
        }

        res.json(course);
    } catch (error) {
        console.error('Erro ao buscar detalhes do curso:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao buscar detalhes do curso' 
        });
    }
});

// Rota para duplicar curso
router.post('/courses/:id/duplicate', auth, isAdmin, async (req, res) => {
    try {
        const originalCourse = await Course.findOne({ 
            _id: req.params.id,
            company: req.company._id
        });

        if (!originalCourse) {
            return res.status(404).json({ 
                success: false, 
                message: 'Curso não encontrado' 
            });
        }

        // Criar novo curso com os mesmos dados
        const courseData = {
            title: `${originalCourse.title} (Cópia)`,
            description: originalCourse.description,
            coverImage: originalCourse.coverImage,
            modules: originalCourse.modules,
            experiencePoints: originalCourse.experiencePoints,
            company: req.company._id
        };

        const newCourse = new Course(courseData);
        await newCourse.save();

        res.json({ 
            success: true, 
            message: 'Curso duplicado com sucesso',
            courseId: newCourse._id
        });
    } catch (error) {
        console.error('Erro ao duplicar curso:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao duplicar curso' 
        });
    }
});

// Rota para exportar curso individual
router.get('/courses/:id/export', auth, isAdmin, async (req, res) => {
    try {
        const course = await Course.findOne({ 
            _id: req.params.id,
            company: req.company._id
        });

        if (!course) {
            req.flash('error', 'Curso não encontrado');
            return res.redirect('/admin/courses');
        }

        // Preparar dados para exportação
        const courseData = {
            title: course.title,
            description: course.description,
            modules: course.modules.map(module => ({
                title: module.title,
                lessons: module.lessons.map(lesson => ({
                    title: lesson.title,
                    videoUrl: lesson.videoUrl,
                    duration: lesson.duration
                }))
            })),
            experiencePoints: course.experiencePoints,
            createdAt: course.createdAt
        };

        // Configurar cabeçalhos para download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${course.title.replace(/\s+/g, '_')}.json`);

        // Enviar dados
        res.json(courseData);
    } catch (error) {
        console.error('Erro ao exportar curso:', error);
        req.flash('error', 'Erro ao exportar curso');
        res.redirect('/admin/courses');
    }
});

// Rota para alternar status do curso
router.post('/courses/:id/toggle-status', auth, isAdmin, async (req, res) => {
    try {
        console.log('=== INICIANDO TOGGLE DE STATUS ===');
        console.log('ID do curso:', req.params.id);
        
        const course = await Course.findOne({ 
            _id: req.params.id,
            company: req.company._id
        });

        if (!course) {
            console.log('Curso não encontrado');
            return res.status(404).json({ 
                success: false, 
                message: 'Curso não encontrado' 
            });
        }

        console.log('Status atual do curso:', {
            id: course._id,
            title: course.title,
            isActive: course.isActive
        });

        // Alternar o status
        course.isActive = !course.isActive;
        await course.save();

        console.log('Novo status do curso após toggle:', {
            id: course._id,
            title: course.title,
            isActive: course.isActive
        });

        // Verificar se o status foi realmente salvo
        const updatedCourse = await Course.findById(course._id);
        console.log('Status do curso após salvar (verificação):', {
            id: updatedCourse._id,
            title: updatedCourse.title,
            isActive: updatedCourse.isActive
        });

        // Retornar o novo status
        res.json({ 
            success: true, 
            message: `Curso ${course.isActive ? 'ativado' : 'desativado'} com sucesso`,
            isActive: course.isActive
        });
    } catch (error) {
        console.error('Erro ao alterar status do curso:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao alterar status do curso' 
        });
    }
});

// Rota para gerenciamento de conhecimento AI
router.get('/ai/knowledge', async (req, res) => {
    try {
        const knowledge = await AiKnowledge.find({ company: req.company._id })
            .sort('-createdAt');
        
        res.render('admin/ai/knowledge', { 
            knowledge,
            title: 'Gerenciar Base de Conhecimento AI'
        });
    } catch (error) {
        console.error('Erro ao carregar conhecimento:', error);
        req.flash('error', 'Erro ao carregar base de conhecimento');
        res.redirect('/admin');
    }
});

// Rota para buscar o progresso dos alunos
router.get('/api/students/progress', [auth, isAdmin], async (req, res) => {
    try {
        console.log('=== BUSCANDO PROGRESSO DOS ALUNOS ===');
        console.log('Company ID:', req.company._id);
        
        // Buscar todos os alunos não-admin da empresa
        const students = await User.find({ 
            company: req.company._id,
            isAdmin: false,
            isDeleted: { $ne: true }
        })
        .select('name email profilePicture')
        .lean();

        console.log('Total de alunos encontrados:', students.length);

        // Buscar o histórico de progresso para cada aluno
        const studentsWithProgress = await Promise.all(students.map(async (student) => {
            const courseHistory = await History.find({ user: student._id })
                .populate('course', 'title')
                .lean();

            return {
                ...student,
                courses: courseHistory.map(history => ({
                    title: history.course?.title || 'Curso Removido',
                    progress: history.progress || 0,
                    startedAt: history.startedAt,
                    completedAt: history.completedAt
                }))
            };
        }));

        console.log('Dados formatados com sucesso');
        res.json(studentsWithProgress);
    } catch (error) {
        console.error('Erro ao buscar progresso dos alunos:', error);
        res.status(500).json({ error: 'Erro ao buscar dados dos alunos' });
    }
});

// Configuração do Cloudinary para slides
// Rotas para gerenciamento de slides
router.get('/courses/modules/:moduleId/slides', [auth, isAdmin], async (req, res) => {
    try {
        const course = await Course.findOne({ 'modules._id': req.params.moduleId });
        const module = course.modules.id(req.params.moduleId);
        res.json(module.slides || []);
    } catch (error) {
        console.error('Erro ao buscar slides:', error);
        res.status(500).json({ error: 'Erro ao buscar slides' });
    }
});

router.post('/courses/modules/:moduleId/slides', [auth, isAdmin], upload.array('images', 10), async (req, res) => {
    try {
        const { title, description, order } = req.body;
        const imageDescriptions = req.body.imageDescriptions ? JSON.parse(req.body.imageDescriptions) : [];
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Pelo menos uma imagem é obrigatória' 
            });
        }

        // Verificar se o curso e módulo existem
        const course = await Course.findOne({ 'modules._id': req.params.moduleId });
        if (!course) {
            // Remover arquivos temporários
            req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(404).json({ 
                success: false, 
                error: 'Curso não encontrado' 
            });
        }

        const module = course.modules.id(req.params.moduleId);
        if (!module) {
            // Remover arquivos temporários
            req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(404).json({ 
                success: false, 
                error: 'Módulo não encontrado' 
            });
        }
        
        // Upload das imagens para o Cloudinary
        const uploadedImages = await Promise.all(req.files.map(async (file, index) => {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'slides',
                resource_type: 'image',
                transformation: [
                    { width: 1920, height: 1080, crop: 'limit' }
                ]
            });
            
            // Remover arquivo temporário após upload
            fs.unlinkSync(file.path);
            
            return {
                url: result.secure_url,
                order: index + 1,
                description: imageDescriptions[index] || '',
                createdAt: new Date()
            };
        }));
        
        // Criar novo slide
        const newSlide = {
            title,
            description,
            images: uploadedImages,
            order: parseInt(order),
            createdAt: new Date()
        };

        // Adicionar slide ao módulo
        module.slides = module.slides || [];
        module.slides.push(newSlide);
        await course.save();
        
        res.json({ 
            success: true, 
            slide: newSlide,
            message: 'Slide adicionado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao adicionar slide:', error);
        // Remover os arquivos temporários em caso de erro
        if (req.files) {
            req.files.forEach(file => {
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Erro ao adicionar slide' 
        });
    }
});

router.delete('/courses/modules/:moduleId/slides/:slideId', [auth, isAdmin], async (req, res) => {
    try {
        const course = await Course.findOne({ 'modules._id': req.params.moduleId });
        if (!course) {
            return res.status(404).json({ error: 'Curso não encontrado' });
        }

        const module = course.modules.id(req.params.moduleId);
        if (!module) {
            return res.status(404).json({ error: 'Módulo não encontrado' });
        }
        
        // Encontrar o slide para deletar as imagens do Cloudinary
        const slide = module.slides.find(s => s._id.toString() === req.params.slideId);
        if (slide && slide.images && slide.images.length > 0) {
            // Deletar todas as imagens do Cloudinary
            await Promise.all(slide.images.map(async (image) => {
                if (image.url) {
                    // Extrair o public_id do Cloudinary da URL
                    const publicId = image.url.split('/').pop().split('.')[0];
                    try {
                        await cloudinary.uploader.destroy(`slides/${publicId}`);
                    } catch (error) {
                        console.error('Erro ao deletar imagem do Cloudinary:', error);
                    }
                }
            }));
        }
        
        module.slides = module.slides.filter(slide => slide._id.toString() !== req.params.slideId);
        await course.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir slide:', error);
        res.status(500).json({ error: 'Erro ao excluir slide' });
    }
});

// Rota para editar um slide
router.put('/courses/modules/:moduleId/slides/:slideId', [auth, isAdmin], upload.array('images', 10), async (req, res) => {
    try {
        const { title, description, order, deletedImages, imageDescriptions } = req.body;
        const deletedImageIds = deletedImages ? JSON.parse(deletedImages) : [];
        const imageDescs = imageDescriptions ? JSON.parse(imageDescriptions) : [];
        
        const course = await Course.findOne({ 'modules._id': req.params.moduleId });
        if (!course) {
            if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(404).json({ error: 'Curso não encontrado' });
        }

        const module = course.modules.id(req.params.moduleId);
        if (!module) {
            if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(404).json({ error: 'Módulo não encontrado' });
        }

        const slide = module.slides.find(s => s._id.toString() === req.params.slideId);
        if (!slide) {
            if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(404).json({ error: 'Slide não encontrado' });
        }

        // Atualizar os campos básicos
        slide.title = title;
        slide.description = description;
        slide.order = parseInt(order);

        // Deletar imagens removidas do Cloudinary
        if (deletedImageIds.length > 0) {
            await Promise.all(deletedImageIds.map(async (imageId) => {
                const image = slide.images.find(img => img._id.toString() === imageId);
                if (image && image.url) {
                    const publicId = image.url.split('/').pop().split('.')[0];
                    try {
                        await cloudinary.uploader.destroy(`slides/${publicId}`);
                    } catch (error) {
                        console.error('Erro ao deletar imagem do Cloudinary:', error);
                    }
                }
            }));

            // Remover imagens deletadas do array
            slide.images = slide.images.filter(img => !deletedImageIds.includes(img._id.toString()));
        }

        // Se novas imagens foram enviadas, fazer upload para o Cloudinary
        if (req.files && req.files.length > 0) {
            const newImages = await Promise.all(req.files.map(async (file, index) => {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: 'slides',
                    resource_type: 'image',
                    transformation: [
                        { width: 1920, height: 1080, crop: 'limit' }
                    ]
                });

                // Remover arquivo temporário após upload
                fs.unlinkSync(file.path);

                return {
                    url: result.secure_url,
                    order: (slide.images.length + index + 1),
                    description: imageDescs[index] || '',
                    createdAt: new Date()
                };
            }));

            // Adicionar novas imagens ao array existente
            slide.images = [...(slide.images || []), ...newImages];
        }

        // Reordenar imagens se necessário
        slide.images.sort((a, b) => a.order - b.order);

        await course.save();
        res.json({ success: true, slide });
    } catch (error) {
        console.error('Erro ao editar slide:', error);
        // Remover os arquivos temporários em caso de erro
        if (req.files) {
            req.files.forEach(file => {
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        res.status(500).json({ error: 'Erro ao editar slide' });
    }
});

export default router;
