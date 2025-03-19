// routes/ranking.js
import express from 'express';
import auth from '../middlewares/auth.js';
import { checkPlanAccess } from '../middlewares/planAccess.js';
import User from '../models/User.js';
import History from '../models/History.js';
import NodeCache from 'node-cache';
import Course from '../models/Course.js';
const rankingCache = new NodeCache({ stdTTL: 300 }); // 5 minutos de cache

const router = express.Router();

router.get('/', auth, checkPlanAccess('ranking'), async (req, res) => {
    try {
        console.log('ID da empresa do usuário autenticado:', req.user.company._id);

        // Estatísticas gerais
        const stats = {
            totalUsers: await User.countDocuments({ company: req.user.company._id }),
            totalCourses: await Course.countDocuments({ company: req.user.company._id }),
            totalCertificates: await History.countDocuments({ 
                company: req.user.company._id,
                'modules': { 
                    $elemMatch: { 
                        'progress': 100 
                    } 
                } 
            }),
            totalXP: (await User.aggregate([
                { $match: { company: req.user.company._id } },
                { $group: { _id: null, total: { $sum: "$experience" } } }
            ]))[0]?.total || 0
        };

        console.log('Total de usuários:', stats.totalUsers);

        console.log('Estatísticas:', stats); // Log das estatísticas

        // Buscar usuários com suas estatísticas
        const usersBase = await User.aggregate([
            { $match: { company: req.user.company._id } },
            {
                $lookup: {
                    from: 'histories',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'courseHistories'
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    profilePicture: 1,
                    experience: 1,
                    completedCoursesCount: {
                        $size: {
                            $filter: {
                                input: "$courseHistories",
                                as: "history",
                                cond: { $eq: ["$$history.progress", 100] }
                            }
                        }
                    },
                    totalXP: "$experience"
                }
            }
        ]);

        console.log('Usuários Base:', usersBase); // Log dos usuários base

        // Formatar dados finais
        const users = usersBase.map(user => ({
            ...user,
            level: Math.floor(user.experience / 1000) + 1
        }));

        console.log('Usuários Formatados:', users); // Log dos usuários formatados

        // Passar os três melhores usuários para o pódio
        const podiumUsers = users.slice(0, 3); // Os três primeiros
        console.log('Usuários do Pódio:', podiumUsers); // Log dos usuários do pódio

        res.render('ranking/index', {
            users,
            stats,
            podiumUsers, // Passar os usuários do pódio
            user: req.user
        });

    } catch (error) {
        console.error('Error loading ranking:', error);
        req.flash('error', 'Erro ao carregar ranking');
        res.redirect('/dashboard');
    }
});

export default router;