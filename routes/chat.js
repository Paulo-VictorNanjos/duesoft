import express from 'express';
import auth from '../middlewares/auth.js';
import { checkPlanAccess } from '../middlewares/planAccess.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import upload from '../middlewares/upload.js';
import NotificationManager from '../utils/notificationManager.js';

const router = express.Router();

// Listar usuários para chat
router.get('/', auth, checkPlanAccess('chat'), async (req, res) => {
    try {
        console.log('=== CARREGANDO CHAT ===');
        console.log('Usuário atual:', {
            id: req.user._id,
            company: req.user.company?._id
        });

        // Buscar usuários da mesma empresa
        const users = await User.find({
            company: req.user.company._id,
            _id: { $ne: req.user._id } // Excluir o usuário atual
        }).select('name email profilePicture isAdmin');

        console.log('Usuários encontrados:', users.length);

        // Buscar mensagens não lidas para cada usuário
        const unreadCounts = await Promise.all(users.map(async (otherUser) => {
            const count = await Message.countDocuments({
                sender: otherUser._id,
                receiver: req.user._id,
                read: false,
                deletedFor: { $ne: req.user._id }
            });
            return { userId: otherUser._id, count };
        }));

        console.log('Contagem de mensagens não lidas:', unreadCounts);

        // Adicionar contagem de mensagens não lidas aos usuários
        const usersWithUnread = users.map(user => {
            const unreadInfo = unreadCounts.find(u => u.userId.toString() === user._id.toString());
            return {
                ...user.toObject(),
                unreadCount: unreadInfo ? unreadInfo.count : 0
            };
        });

        res.render('chat/index', {
            users: usersWithUnread,
            user: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error('=== ERRO AO CARREGAR CHAT ===');
        console.error('Detalhes do erro:', error);
        console.error('Stack trace:', error.stack);
        req.flash('error', 'Erro ao carregar chat');
        res.redirect('/dashboard');
    }
});

// Buscar mensagens
router.get('/messages/:userId', auth, async (req, res) => {
    try {
        console.log('=== BUSCANDO MENSAGENS ===');
        console.log('De/Para:', {
            user1: req.user._id,
            user2: req.params.userId
        });

        const messages = await Message.find({
            $or: [
                { sender: req.user._id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user._id }
            ],
            deletedFor: { $ne: req.user._id }
        })
        .sort('createdAt')
        .populate('sender', 'name profilePicture')
        .populate('receiver', 'name profilePicture');

        console.log('Mensagens encontradas:', messages.length);

        // Marcar mensagens como lidas
        await Message.updateMany(
            {
                sender: req.params.userId,
                receiver: req.user._id,
                read: false
            },
            { $set: { read: true } }
        );

        res.json(messages);
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        res.status(500).json({ error: 'Erro ao carregar mensagens' });
    }
});

// Enviar mensagem
router.post('/send', auth, async (req, res) => {
    try {
        console.log('=== ENVIANDO MENSAGEM ===');
        console.log('Dados:', {
            from: req.user._id,
            to: req.body.receiverId,
            content: req.body.content?.substring(0, 20) + '...'
        });

        const message = new Message({
            sender: req.user._id,
            receiver: req.body.receiverId,
            content: req.body.content,
            contentType: 'text',
            read: false
        });

        await message.save();
        console.log('Mensagem salva:', message._id);

        // Emitir evento via Socket.IO
        const io = req.app.get('io');
        io.to(req.body.receiverId).emit('newMessage', message);

        // Enviar notificação
        await NotificationManager.send(
            req.body.receiverId,
            'Nova Mensagem',
            `${req.user.name} enviou uma mensagem para você`,
            'info',
            '/chat'
        );

        res.json({ success: true, message });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo enviado'
            });
        }

        const fileUrl = `/uploads/chat/${req.file.filename}`;
        
        res.json({
            success: true,
            fileUrl,
            message: 'Arquivo enviado com sucesso'
        });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar arquivo'
        });
    }
});

// Rota para buscar contatos
router.get('/contacts', auth, async (req, res) => {
    try {
        const users = await User.find({ 
            _id: { $ne: req.user._id },
            company: req.user.company // Filtra pela empresa do usuário
        })
        .select('name profilePicture isAdmin');
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar contatos:', error);
        res.status(500).json({ error: 'Erro ao buscar contatos' });
    }
});

export default router; 