import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

class NotificationManager {
    static async send(userId, title, message, type = 'info', link = null, company = null) {
        try {
            if (!company) {
                const User = mongoose.model('User');
                const user = await User.findById(userId);
                company = user.company;
            }

            const notification = new Notification({
                user: userId,
                company: company,
                title,
                message,
                type,
                link
            });

            await notification.save();
            return notification;
        } catch (error) {
            console.error('Erro ao criar notificação:', error);
            throw error;
        }
    }

    static async markAsRead(notificationId) {
        try {
            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { read: true },
                { new: true }
            );
            return notification;
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
            throw error;
        }
    }

    static async getUserNotifications(userId) {
        try {
            return await Notification.find({ user: userId })
                .sort('-createdAt')
                .limit(50);
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
            throw error;
        }
    }

    static async getUnreadCount(userId) {
        try {
            return await Notification.countDocuments({
                user: userId,
                read: false
            });
        } catch (error) {
            console.error('Erro ao contar notificações não lidas:', error);
            throw error;
        }
    }
}

export default NotificationManager;