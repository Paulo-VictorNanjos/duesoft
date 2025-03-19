import express from 'express';
import auth from '../../middlewares/auth.js';
import adminAuth from '../../middlewares/admin.js';
import ForumCategory from '../../models/ForumCategory.js';
import ForumTopic from '../../models/ForumTopic.js';
import ForumReply from '../../models/ForumReply.js';
import ForumTag from '../../models/ForumTag.js';
import ForumSettings from '../../models/ForumSettings.js';
import ForumReport from '../../models/ForumReport.js';
import ForumStats from '../../models/ForumStats.js';

const router = express.Router();

// Listar categorias
router.get('/', auth, adminAuth, async (req, res) => {
    try {
        const categories = await ForumCategory.find({ company: req.user.company })
            .sort('displayOrder');

        res.render('admin/forum/index', {
            categories,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        req.flash('error', 'Erro ao carregar categorias');
        res.redirect('/admin');
    }
});

// Formulário para criar categoria
router.get('/create', auth, adminAuth, (req, res) => {
    res.render('admin/forum/create');
});

// Criar categoria
router.post('/', auth, adminAuth, async (req, res) => {
    try {
        const { name, description, icon, displayOrder } = req.body;

        const category = new ForumCategory({
            name,
            description,
            icon: icon || 'fas fa-comments',
            displayOrder: displayOrder || 0,
            company: req.user.company
        });

        await category.save();
        req.flash('success', 'Categoria criada com sucesso!');
        res.redirect('/admin/forum');
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        req.flash('error', 'Erro ao criar categoria');
        res.redirect('/admin/forum/create');
    }
});

// Formulário para editar categoria
router.get('/edit/:id', auth, adminAuth, async (req, res) => {
    try {
        const category = await ForumCategory.findOne({
            _id: req.params.id,
            company: req.user.company
        });

        if (!category) {
            req.flash('error', 'Categoria não encontrada');
            return res.redirect('/admin/forum');
        }

        res.render('admin/forum/edit', { category });
    } catch (error) {
        console.error('Erro ao carregar categoria:', error);
        req.flash('error', 'Erro ao carregar categoria');
        res.redirect('/admin/forum');
    }
});

// Atualizar categoria
router.put('/:id', auth, adminAuth, async (req, res) => {
    try {
        const { name, description, icon, displayOrder, isActive } = req.body;

        await ForumCategory.findOneAndUpdate(
            { _id: req.params.id, company: req.user.company },
            {
                name,
                description,
                icon: icon || 'fas fa-comments',
                displayOrder: displayOrder || 0,
                isActive: isActive === 'true'
            }
        );

        req.flash('success', 'Categoria atualizada com sucesso!');
        res.redirect('/admin/forum');
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        req.flash('error', 'Erro ao atualizar categoria');
        res.redirect(`/admin/forum/edit/${req.params.id}`);
    }
});

// Excluir categoria
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        await ForumCategory.findOneAndDelete({
            _id: req.params.id,
            company: req.user.company
        });

        req.flash('success', 'Categoria excluída com sucesso!');
        res.redirect('/admin/forum');
    } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        req.flash('error', 'Erro ao excluir categoria');
        res.redirect('/admin/forum');
    }
});

export default router; 