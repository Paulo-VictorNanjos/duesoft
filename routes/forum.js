import express from 'express';
import auth from '../middlewares/auth.js';
import ForumCategory from '../models/ForumCategory.js';
import ForumTopic from '../models/ForumTopic.js';
import ForumReply from '../models/ForumReply.js';
import ForumTag from '../models/ForumTag.js';
import ForumSettings from '../models/ForumSettings.js';

const router = express.Router();

// Listar categorias do fórum
router.get('/', auth, async (req, res) => {
    try {
        const categories = await ForumCategory.find({ 
            company: req.user.company,
            isActive: true 
        }).sort('displayOrder');

        res.render('forum/index', {
            categories,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Erro ao carregar categorias do fórum:', error);
        req.flash('error', 'Erro ao carregar categorias do fórum');
        res.redirect('/dashboard');
    }
});

// Criar novo tópico
router.post('/topic', auth, async (req, res) => {
    try {
        const { category, title, content, tags, notifyReplies } = req.body;
        
        // Validação básica
        if (!category || !title || !content) {
            req.flash('error', 'Todos os campos obrigatórios devem ser preenchidos');
            return res.redirect('/forum');
        }
        
        // Verificar se a categoria existe
        const categoryDoc = await ForumCategory.findById(category);
        if (!categoryDoc) {
            req.flash('error', 'Categoria não encontrada');
            return res.redirect('/forum');
        }
        
        // Criar slug a partir do título
        const slug = title
            .toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
        
        // Processar tags
        let tagDocs = [];
        if (tags) {
            const tagNames = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            
            // Limitar a 5 tags
            const limitedTags = tagNames.slice(0, 5);
            
            // Criar ou encontrar tags
            for (const tagName of limitedTags) {
                let tagDoc = await ForumTag.findOne({ 
                    name: { $regex: new RegExp(`^${tagName}$`, 'i') },
                    company: req.user.company
                });
                
                if (!tagDoc) {
                    tagDoc = new ForumTag({
                        name: tagName,
                        slug: tagName.toLowerCase().replace(/[^\w]+/g, '-'),
                        company: req.user.company
                    });
                    await tagDoc.save();
                }
                
                tagDocs.push(tagDoc._id);
            }
        }
        
        // Criar o tópico
        const topic = new ForumTopic({
            title,
            content,
            slug,
            author: req.user._id,
            category: categoryDoc._id,
            tags: tagDocs,
            notifyReplies: notifyReplies === 'on',
            company: req.user.company
        });
        
        await topic.save();
        
        // Atualizar contagem de tópicos na categoria
        categoryDoc.topicsCount = (categoryDoc.topicsCount || 0) + 1;
        categoryDoc.lastTopic = topic._id;
        await categoryDoc.save();
        
        req.flash('success', 'Tópico criado com sucesso!');
        res.redirect(`/forum/topic/${topic.slug}`);
    } catch (error) {
        console.error('Erro ao criar tópico:', error);
        req.flash('error', 'Erro ao criar tópico. Por favor, tente novamente.');
        res.redirect('/forum');
    }
});

// Visualizar tópico
router.get('/topic/:slug', auth, async (req, res) => {
    try {
        const topic = await ForumTopic.findOne({ 
            slug: req.params.slug,
            company: req.user.company
        })
        .populate('author')
        .populate('category')
        .populate('tags');
        
        if (!topic) {
            req.flash('error', 'Tópico não encontrado');
            return res.redirect('/forum');
        }
        
        // Incrementar visualizações
        topic.viewsCount = (topic.viewsCount || 0) + 1;
        await topic.save();
        
        // Buscar respostas
        const replies = await ForumReply.find({
            topic: topic._id
        })
        .populate('author')
        .sort('createdAt');
        
        // Verificar se o usuário é o autor do tópico
        const isAuthor = topic.author._id.toString() === req.user._id.toString();
        
        // Verificar se o usuário é administrador
        const isAdmin = req.user.isAdmin || false;
        
        // Buscar tópicos relacionados (mesma categoria, excluindo o atual)
        const relatedTopics = await ForumTopic.find({
            category: topic.category._id,
            _id: { $ne: topic._id },
            company: req.user.company
        })
        .limit(5)
        .sort('-createdAt')
        .populate('author');
        
        res.render('forum/topic', {
            topic,
            replies,
            user: req.user,
            isAuthor,
            isAdmin,
            relatedTopics,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Erro ao carregar tópico:', error);
        req.flash('error', 'Erro ao carregar tópico');
        res.redirect('/forum');
    }
});

// Visualizar categoria
router.get('/category/:slug', auth, async (req, res) => {
    try {
        const category = await ForumCategory.findOne({ 
            slug: req.params.slug,
            company: req.user.company,
            isActive: true
        });
        
        if (!category) {
            req.flash('error', 'Categoria não encontrada');
            return res.redirect('/forum');
        }
        
        // Buscar tópicos da categoria
        const topics = await ForumTopic.find({
            category: category._id,
            company: req.user.company
        })
        .populate('author')
        .populate('category')
        .sort('-isPinned -updatedAt');
        
        res.render('forum/category', {
            category,
            topics,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Erro ao carregar categoria:', error);
        req.flash('error', 'Erro ao carregar categoria');
        res.redirect('/forum');
    }
});

// Responder a um tópico
router.post('/topic/:id/reply', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const topicId = req.params.id;
        
        // Validação básica
        if (!content) {
            req.flash('error', 'O conteúdo da resposta não pode estar vazio');
            return res.redirect(`/forum/topic/${req.params.id}`);
        }
        
        // Verificar se o tópico existe
        const topic = await ForumTopic.findOne({
            _id: topicId,
            company: req.user.company
        });
        
        if (!topic) {
            req.flash('error', 'Tópico não encontrado');
            return res.redirect('/forum');
        }
        
        // Criar a resposta
        const reply = new ForumReply({
            content,
            author: req.user._id,
            topic: topic._id,
            company: req.user.company
        });
        
        await reply.save();
        
        // Atualizar o tópico
        topic.repliesCount = (topic.repliesCount || 0) + 1;
        topic.lastReplyAt = new Date();
        topic.lastReplyBy = req.user._id;
        await topic.save();
        
        // Atualizar a categoria
        const category = await ForumCategory.findById(topic.category);
        if (category) {
            category.repliesCount = (category.repliesCount || 0) + 1;
            await category.save();
        }
        
        // Enviar notificações se necessário
        if (topic.notifyReplies && topic.author.toString() !== req.user._id.toString()) {
            // Aqui você pode implementar o envio de notificações
            // Exemplo: enviar e-mail ou notificação no sistema
        }
        
        req.flash('success', 'Resposta enviada com sucesso!');
        res.redirect(`/forum/topic/${topic.slug}`);
    } catch (error) {
        console.error('Erro ao responder tópico:', error);
        req.flash('error', 'Erro ao enviar resposta. Por favor, tente novamente.');
        res.redirect(`/forum/topic/${req.params.id}`);
    }
});

export default router; 