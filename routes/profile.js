import express from 'express';
import bcrypt from 'bcryptjs';
import auth from '../middlewares/auth.js';
import { checkPlanAccess } from '../middlewares/planAccess.js';
import upload from '../middlewares/upload.js';
import User from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import History from '../models/History.js';
import Achievement from '../models/Achievement.js';
import { Exam } from '../models/Exam.js';

const router = express.Router();

// Exportar a função getUserCategory
export const getUserCategory = async (userId) => {
    try {
        console.log('=== DETERMINANDO CATEGORIA DO USUÁRIO ===');
        console.log('ID do usuário:', userId);

        const examAttempts = await Exam.aggregate([
            {
                $lookup: {
                    from: 'examattempts',
                    let: { examId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$exam', '$$examId'] },
                                        { $eq: ['$user', userId] },
                                        { $eq: ['$passed', true] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'attempts'
                }
            },
            {
                $match: {
                    'isCategoryExam': true,
                    'attempts.0': { $exists: true }
                }
            }
        ]);

        console.log('Tentativas de exames encontradas:', examAttempts.length);
        console.log('Detalhes das tentativas:', examAttempts);

        const passedPleno = examAttempts.some(exam => exam.targetCategory === 'Pleno');
        const passedSenior = examAttempts.some(exam => exam.targetCategory === 'Senior');

        console.log('Análise de categoria:', {
            passedPleno,
            passedSenior
        });

        if (passedSenior) return 'Senior';
        if (passedPleno) return 'Pleno';
        return 'Junior';
    } catch (error) {
        console.error('Erro ao determinar categoria:', error);
        console.error('Stack trace:', error.stack);
        return 'Junior';
    }
};

// Rota para perfil próprio
router.get('/', auth, checkPlanAccess('profile'), async (req, res) => {
    try {
        console.log('=== INICIANDO CARREGAMENTO DO PERFIL ===');
        console.log('ID do usuário:', req.user._id);

        const user = await User.findById(req.user._id)
            .populate({
                path: 'completedCourses',
                populate: {
                    path: 'course',
                    select: 'title company modules coverImage'
                }
            })
            .populate('achievements.achievement')
            .populate('company');

        console.log('Dados do usuário:', {
            id: user._id,
            name: user.name,
            completedCoursesCount: user.completedCourses?.length || 0,
            company: user.company?._id
        });

        // Filtrar cursos concluídos pela empresa do usuário
        const completedCourses = (user.completedCourses || []).filter(completion => {
            // Verificar se todos os objetos necessários existem
            const courseExists = completion && completion.course;
            const companyMatches = courseExists && 
                                 completion.course.company && 
                                 user.company && 
                                 completion.course.company.toString() === user.company._id.toString();

            console.log('Verificando curso:', {
                courseId: courseExists ? completion.course._id : 'N/A',
                courseTitle: courseExists ? completion.course.title : 'N/A',
                hasCourseCompany: courseExists && !!completion.course.company,
                hasUserCompany: !!user.company,
                isValid: companyMatches
            });

            return companyMatches;
        });

        console.log('Cursos filtrados:', completedCourses.length);

        const category = await getUserCategory(req.user._id);
        const level = Math.floor(user.experience / 1000) + 1;

        console.log('Renderizando perfil com dados:', {
            hasUser: !!user,
            completedCoursesCount: completedCourses.length,
            category,
            level
        });

        res.render('profile/index', { 
            user,
            level,
            category,
            completedCourses,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('=== ERRO AO CARREGAR PERFIL ===');
        console.error('Detalhes do erro:', error);
        console.error('Stack trace:', error.stack);
        req.flash('error', 'Error loading profile');
        res.redirect('/dashboard');
    }
});

router.post('/update', auth, checkPlanAccess('profile'), upload.single('profilePicture'), async (req, res) => {
    // Declarar isAjax no escopo mais alto da função
    const isAjax = req.headers.accept && req.headers.accept.includes('application/json');

    try {
        console.log('=== INICIANDO ATUALIZAÇÃO DE PERFIL ===');
        console.log('Dados recebidos:', {
            body: req.body,
            file: req.file
        });

        const updates = {
            name: req.body.name,
            phone: req.body.phone
        };

        // Não atualizar company se for uma requisição AJAX (upload de foto)
        if (!isAjax && req.body.company) {
            updates.company = req.user.company._id; // Manter o mesmo ID da empresa
        }

        if (req.file) {
            console.log('Arquivo recebido:', {
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                size: req.file.size
            });

            // Deletar foto antiga se existir
            if (req.user.profilePicture) {
                const oldPicturePath = path.join(path.resolve(), 'public', req.user.profilePicture);
                try {
                    await fs.unlink(oldPicturePath);
                    console.log('Foto antiga deletada:', oldPicturePath);
                } catch (error) {
                    console.error('Erro ao deletar foto antiga:', error);
                }
            }
            updates.profilePicture = `/uploads/${req.file.filename}`;
        }

        console.log('Atualizações a serem aplicadas:', updates);

        await User.findByIdAndUpdate(req.user._id, updates);
        console.log('Perfil atualizado com sucesso');

        if (isAjax) {
            res.json({ success: true, message: 'Perfil atualizado com sucesso' });
        } else {
            req.flash('success', 'Profile updated successfully');
            res.redirect('/profile');
        }
    } catch (error) {
        console.error('=== ERRO AO ATUALIZAR PERFIL ===');
        console.error('Detalhes do erro:', error);
        console.error('Stack trace:', error.stack);

        if (isAjax) {
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao atualizar perfil',
                error: error.message 
            });
        } else {
            req.flash('error', 'Error updating profile');
            res.redirect('/profile');
        }
    }
});

router.post('/update-cover', auth, checkPlanAccess('profile'), upload.single('coverPicture'), async (req, res) => {
    console.log('Rota de atualização de capa acionada');
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo foi enviado'
            });
        }

        const coverPath = `/uploads/${req.file.filename}`;
        await User.findByIdAndUpdate(req.user._id, {
            coverPicture: coverPath
        });

        res.json({
            success: true,
            message: 'Foto de capa atualizada com sucesso',
            coverPath: coverPath
        });

    } catch (error) {
        console.error('Error updating cover picture:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar foto de capa'
        });
    }
});

router.post('/change-password', auth, checkPlanAccess('profile'), async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/profile');
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/profile');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        req.flash('success', 'Password updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Error changing password:', error);
        req.flash('error', 'Error updating password');
        res.redirect('/profile');
    }
});

// Primeiro as rotas específicas
router.get('/view/:id', auth, checkPlanAccess('profile'), async (req, res) => {
    try {
        const profileUser = await User.findById(req.params.id);
        if (!profileUser) {
            req.flash('error', 'Usuário não encontrado');
            return res.redirect('/dashboard');
        }

        const category = await getUserCategory(profileUser._id);
        const level = Math.floor(profileUser.experience / 1000) + 1;

        const userHistory = await History.find({ user: profileUser._id })
            .populate('course')
            .sort({ createdAt: -1 });

        res.render('profile/view', {
            profileUser,
            userHistory,
            category,
            level,
            user: req.user
        });

    } catch (error) {
        console.error('Error viewing profile:', error);
        req.flash('error', 'Erro ao visualizar perfil');
        res.redirect('/dashboard');
    }
});

// Depois a rota genérica
router.get('/:userId', auth, checkPlanAccess('profile'), async (req, res) => {
    // Redirecionar para a rota view
    res.redirect(`/profile/view/${req.params.userId}`);
});

// Adicione esta rota em routes/profile.js
router.get('/:id/data', auth, checkPlanAccess('profile'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('name email profilePicture experience category completedCourses');
        
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
});

export default router;