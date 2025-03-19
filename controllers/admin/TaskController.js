import Task from '../../models/Task.js';
import User from '../../models/User.js';
import path from 'path';
import fs from 'fs';

class TaskController {
    async index(req, res) {
        try {
            const tasks = await Task.find({ 
                company: req.company._id,
                isDeleted: false 
            })
            .populate('assignedTo', 'name email profilePicture')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

            res.render('admin/tasks/index', {
                tasks,
                user: req.user,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Erro ao listar tasks:', error);
            req.flash('error', 'Erro ao carregar tasks');
            res.redirect('/admin');
        }
    }

    async toggleStatus(req, res) {
        try {
            const task = await Task.findOne({ 
                _id: req.params.id,
                company: req.company._id 
            });

            if (!task) {
                req.flash('error', 'Task não encontrada');
                return res.redirect('/admin/tasks');
            }

            // Atualiza o status da task
            if (task.status === 'concluida') {
                task.status = 'pendente';
                task.completedAt = null;
            } else {
                task.status = 'concluida';
                task.completedAt = new Date();
            }

            await task.save();
            
            req.flash('success', `Task marcada como ${task.status}`);
            res.redirect('/admin/tasks');
        } catch (error) {
            console.error('Erro ao alterar status da task:', error);
            req.flash('error', 'Erro ao alterar status da task');
            res.redirect('/admin/tasks');
        }
    }

    async updatePriority(req, res) {
        try {
            const { priority } = req.body;
            const task = await Task.findOne({
                _id: req.params.id,
                company: req.company._id
            });

            if (!task) {
                req.flash('error', 'Task não encontrada');
                return res.redirect('/admin/tasks');
            }

            task.priority = priority;
            await task.save();
            
            req.flash('success', 'Prioridade atualizada com sucesso');
            res.redirect('/admin/tasks');
        } catch (error) {
            console.error('Erro ao atualizar prioridade:', error);
            req.flash('error', 'Erro ao atualizar prioridade');
            res.redirect('/admin/tasks');
        }
    }

    async create(req, res) {
        try {
            const users = await User.find({ company: req.company._id })
                .select('name email')
                .sort('name');

            res.render('admin/tasks/form', {
                task: {},
                users,
                user: req.user,
                error: req.flash('error')
            });
        } catch (error) {
            console.error('Erro ao carregar formulário:', error);
            req.flash('error', 'Erro ao carregar formulário');
            res.redirect('/admin/tasks');
        }
    }

    async store(req, res) {
        try {
            // Remove campos vazios
            const taskData = {
                ...req.body,
                company: req.company._id,
                createdBy: req.user._id
            };

            // Remove assignedTo se estiver vazio
            if (!taskData.assignedTo) {
                delete taskData.assignedTo;
            }

            // Processar tags se existirem
            if (taskData.tags) {
                taskData.tags = taskData.tags.split(',').map(tag => tag.trim());
            }

            // Adicionar anexos se houver
            if (req.files && req.files.length > 0) {
                taskData.attachments = req.files.map(file => ({
                    name: file.originalname,
                    url: file.path.replace('public', '').replace(/\\/g, '/'),
                    type: file.mimetype
                }));
            }

            const task = new Task(taskData);
            await task.save();

            req.flash('success', 'Task criada com sucesso');
            res.redirect('/admin/tasks');
        } catch (error) {
            console.error('Erro ao criar task:', error);
            
            // Remover arquivos enviados em caso de erro
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlink(file.path, err => {
                        if (err) console.error('Erro ao remover arquivo:', err);
                    });
                });
            }

            req.flash('error', 'Erro ao criar task: ' + error.message);
            res.redirect('/admin/tasks/new');
        }
    }

    async edit(req, res) {
        try {
            const [task, users] = await Promise.all([
                Task.findOne({ 
                    _id: req.params.id,
                    company: req.company._id 
                }),
                User.find({ company: req.company._id })
                    .select('name email')
                    .sort('name')
            ]);

            if (!task) {
                req.flash('error', 'Task não encontrada');
                return res.redirect('/admin/tasks');
            }

            res.render('admin/tasks/form', {
                task,
                users,
                user: req.user,
                error: req.flash('error')
            });
        } catch (error) {
            console.error('Erro ao carregar task:', error);
            req.flash('error', 'Erro ao carregar task');
            res.redirect('/admin/tasks');
        }
    }

    async update(req, res) {
        try {
            const task = await Task.findOne({
                _id: req.params.id,
                company: req.company._id
            });

            if (!task) {
                req.flash('error', 'Task não encontrada');
                return res.redirect('/admin/tasks');
            }

            // Remove campos vazios
            const updateData = { ...req.body };
            
            // Remove assignedTo se estiver vazio
            if (!updateData.assignedTo) {
                delete updateData.assignedTo;
                task.assignedTo = undefined;
            }

            // Processar tags
            if (updateData.tags) {
                updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
            }

            // Adicionar novos anexos se houver
            if (req.files && req.files.length > 0) {
                const newAttachments = req.files.map(file => ({
                    name: file.originalname,
                    url: file.path.replace('public', '').replace(/\\/g, '/'),
                    type: file.mimetype
                }));

                task.attachments = [...(task.attachments || []), ...newAttachments];
            }

            // Atualizar campos
            Object.assign(task, updateData);
            await task.save();

            req.flash('success', 'Task atualizada com sucesso');
            res.redirect('/admin/tasks');
        } catch (error) {
            console.error('Erro ao atualizar task:', error);
            
            // Remover arquivos enviados em caso de erro
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlink(file.path, err => {
                        if (err) console.error('Erro ao remover arquivo:', err);
                    });
                });
            }

            req.flash('error', 'Erro ao atualizar task: ' + error.message);
            res.redirect(`/admin/tasks/${req.params.id}/edit`);
        }
    }

    async delete(req, res) {
        try {
            const task = await Task.findOne({
                _id: req.params.id,
                company: req.company._id
            });

            if (!task) {
                return res.status(404).json({ error: 'Task não encontrada' });
            }

            // Soft delete
            task.isDeleted = true;
            await task.save();

            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao excluir task:', error);
            res.status(500).json({ error: 'Erro ao excluir task' });
        }
    }

    async addComment(req, res) {
        try {
            const task = await Task.findOne({
                _id: req.params.id,
                company: req.company._id
            });

            if (!task) {
                return res.status(404).json({ error: 'Task não encontrada' });
            }

            task.comments.push({
                text: req.body.text,
                user: req.user._id
            });

            await task.save();

            res.json({ success: true, comment: task.comments[task.comments.length - 1] });
        } catch (error) {
            console.error('Erro ao adicionar comentário:', error);
            res.status(500).json({ error: 'Erro ao adicionar comentário' });
        }
    }

    async updateStatus(req, res) {
        try {
            const task = await Task.findOne({
                _id: req.params.id,
                company: req.company._id
            });

            if (!task) {
                return res.status(404).json({ error: 'Task não encontrada' });
            }

            task.status = req.body.status;
            if (task.status === 'concluida') {
                task.completedAt = new Date();
            } else {
                task.completedAt = null;
            }

            await task.save();
            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            res.status(500).json({ error: 'Erro ao atualizar status' });
        }
    }

    async deleteAttachment(req, res) {
        try {
            const task = await Task.findOne({
                _id: req.params.taskId,
                company: req.company._id
            });

            if (!task) {
                return res.status(404).json({ error: 'Task não encontrada' });
            }

            const attachment = task.attachments.id(req.params.attachmentId);
            if (!attachment) {
                return res.status(404).json({ error: 'Anexo não encontrado' });
            }

            // Remover arquivo físico
            const filePath = path.join('public', attachment.url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Remover do banco de dados
            task.attachments.pull(req.params.attachmentId);
            await task.save();

            res.json({ success: true });
        } catch (error) {
            console.error('Erro ao excluir anexo:', error);
            res.status(500).json({ error: 'Erro ao excluir anexo' });
        }
    }

    async kanban(req, res) {
        try {
            const tasks = await Task.find({ isDeleted: false })
                .populate('assignedTo', 'name')
                .sort({ updatedAt: -1 });

            res.render('admin/tasks/kanban', {
                tasks,
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (error) {
            console.error('Erro ao carregar kanban:', error);
            req.flash('error', 'Erro ao carregar o quadro kanban');
            res.redirect('/admin/tasks');
        }
    }
}

export default new TaskController(); 