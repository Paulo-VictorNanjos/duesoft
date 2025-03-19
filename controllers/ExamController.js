import Course from '../models/Course.js';
import ExamService from '../services/ExamService.js';
import { Exam, ExamAttempt } from '../models/Exam.js';

class ExamController {
    async index(req, res) {
        try {
            console.log('Fetching exams...');
            const exams = await ExamService.findExamsByCompany(req.user.company);
            console.log('Found exams:', JSON.stringify(exams, null, 2));
            
            res.render('admin/exams/index', {
                exams,
                user: req.user,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Erro ao listar provas:', error);
            req.flash('error', 'Erro ao carregar provas');
            res.redirect('/admin');
        }
    }

    async showResults(req, res) {
        try {
            const { exam, attempts, stats } = await ExamService.findExamWithResults(req.params.id);
            res.render('admin/exams/results', { 
                exam, 
                attempts, 
                stats,
                user: req.user,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Erro ao mostrar resultados:', error);
            req.flash('error', error.message);
            res.redirect('/admin/exams');
        }
    }

    async create(req, res) {
        try {
            const { allowed, upgradeData } = await ExamService.checkExamCreationLimit(req.user.company);
            if (!allowed) {
                return res.render('admin/upgrade', upgradeData);
            }

            const courses = await Course.find({ company: req.user.company });
            res.render('admin/exams/form', { 
                exam: null,
                courses,
                user: req.user,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Erro ao carregar página de criação:', error);
            req.flash('error', 'Erro ao carregar página de criação de prova');
            res.redirect('/admin/exams');
        }
    }

    async store(req, res) {
        try {
            console.log('Iniciando criação de prova:', req.body);
            const examData = ExamService.prepareExamData(req.body, req.files, req.user.company);
            console.log('Dados da prova preparados:', examData);
            
            const exam = new Exam(examData);
            await exam.save();
            
            console.log('Prova criada com sucesso:', exam);
            req.flash('success', 'Prova criada com sucesso!');
            res.redirect('/admin/exams');
        } catch (error) {
            console.error('Erro ao criar prova:', error);
            req.flash('error', 'Erro ao criar prova: ' + error.message);
            res.redirect('/admin/exams/new');
        }
    }

    async edit(req, res) {
        try {
            const exam = await Exam.findById(req.params.id).populate('course');
            if (!exam) {
                req.flash('error', 'Prova não encontrada');
                return res.redirect('/admin/exams');
            }

            const courses = await Course.find({ company: req.user.company });
            res.render('admin/exams/form', { 
                exam,
                courses,
                user: req.user,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Erro ao carregar página de edição:', error);
            req.flash('error', 'Erro ao carregar página de edição');
            res.redirect('/admin/exams');
        }
    }

    async update(req, res) {
        try {
            const examData = ExamService.prepareExamData(req.body, req.files, req.user.company);
            await Exam.findByIdAndUpdate(req.params.id, examData);
            
            req.flash('success', 'Prova atualizada com sucesso!');
            res.redirect('/admin/exams');
        } catch (error) {
            console.error('Erro ao atualizar prova:', error);
            req.flash('error', 'Erro ao atualizar prova: ' + error.message);
            res.redirect(`/admin/exams/${req.params.id}/edit`);
        }
    }

    async toggleStatus(req, res) {
        try {
            const exam = await Exam.findById(req.params.id);
            exam.active = !exam.active;
            await exam.save();
            
            req.flash('success', `Prova ${exam.active ? 'ativada' : 'desativada'} com sucesso!`);
            res.redirect('/admin/exams');
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            req.flash('error', 'Erro ao alterar status da prova');
            res.redirect('/admin/exams');
        }
    }

    async destroy(req, res) {
        try {
            await Exam.findByIdAndDelete(req.params.id);
            req.flash('success', 'Prova excluída com sucesso!');
            res.redirect('/admin/exams');
        } catch (error) {
            console.error('Erro ao excluir prova:', error);
            req.flash('error', 'Erro ao excluir prova');
            res.redirect('/admin/exams');
        }
    }

    async showGradeEssay(req, res) {
        try {
            const attempt = await ExamAttempt.findById(req.params.attemptId)
                .populate('exam')
                .populate('user', 'name email profilePicture');
                
            if (!attempt) {
                req.flash('error', 'Tentativa não encontrada');
                return res.redirect('/admin/exams');
            }

            res.render('admin/exams/grade-essay', { 
                attempt,
                user: req.user,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Erro ao carregar página de correção:', error);
            req.flash('error', 'Erro ao carregar página de correção');
            res.redirect('/admin/exams');
        }
    }

    async saveGrade(req, res) {
        try {
            const { grades, feedback } = req.body;
            await ExamService.gradeExamAttempt(req.params.attemptId, grades, feedback);
            
            req.flash('success', 'Prova corrigida com sucesso!');
            res.redirect('/admin/exams');
        } catch (error) {
            console.error('Erro ao salvar correção:', error);
            req.flash('error', 'Erro ao salvar correção: ' + error.message);
            res.redirect(`/admin/exams/${req.params.examId}/attempts/${req.params.attemptId}/grade`);
        }
    }

    async submit(req, res) {
        try {
            const { answers, timeSpent } = req.body;
            const { hasEssay, attempt } = await ExamService.processExamSubmission(
                req.params.id,
                req.user._id,
                req.user.company,
                answers,
                timeSpent
            );

            if (hasEssay) {
                req.flash('info', 'Sua prova foi enviada e será corrigida em breve.');
            } else {
                req.flash('success', `Prova concluída! Sua nota foi ${attempt.score.toFixed(1)}%`);
            }
            
            res.redirect('/exams');
        } catch (error) {
            console.error('Erro ao submeter prova:', error);
            req.flash('error', 'Erro ao submeter prova: ' + error.message);
            res.redirect(`/exams/${req.params.id}`);
        }
    }

    async showPendingReview(req, res) {
        try {
            const attempts = await ExamAttempt.find({
                exam: req.params.id,
                status: 'pending_review'
            }).populate('user', 'name email profilePicture');

            res.render('admin/exams/pending-review', { 
                attempts,
                user: req.user,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Erro ao listar provas pendentes:', error);
            req.flash('error', 'Erro ao carregar provas pendentes');
            res.redirect('/admin/exams');
        }
    }
}

export default new ExamController(); 