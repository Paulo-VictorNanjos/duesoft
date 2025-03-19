import Notification from '../models/Notification.js';

class NotificationManager {
    static async send(userId, title, message, type = 'info', link = null, companyId) {
        try {
            if (!userId || !title || !message || !companyId) {
                console.warn('Dados inválidos para notificação:', { 
                    userId, title, message, companyId 
                });
                return;
            }

            const notification = new Notification({
                user: userId,
                company: companyId,
                title,
                message,
                type,
                link
            });

            await notification.save();
            console.log('Notificação criada:', notification._id);

            return notification;
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            throw error;
        }
    }

    static async markAsRead(notificationId, userId) {
        try {
            return await Notification.findOneAndUpdate(
                { _id: notificationId, user: userId },
                { read: true },
                { new: true }
            );
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
            return null;
        }
    }

    static async markAllAsRead(userId) {
        try {
            return await Notification.updateMany(
                { user: userId, read: false },
                { read: true }
            );
        } catch (error) {
            console.error('Erro ao marcar todas notificações como lidas:', error);
            return null;
        }
    }
}

export default NotificationManager; 