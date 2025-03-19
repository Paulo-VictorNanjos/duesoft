import Message from '../models/Message.js';
import User from '../models/User.js';
import NotificationManager from './notificationManager.js';

class ChatManager {
    static async saveMessage(senderId, receiverId, content) {
        try {
            const message = new Message({
                sender: senderId,
                receiver: receiverId,
                content: content.trim(),
                contentType: 'text',
                read: false
            });

            await message.save();

            // Send notification to receiver
            await NotificationManager.send(
                receiverId,
                'Nova Mensagem',
                `Você recebeu uma nova mensagem`,
                'info',
                '/chat'
            );

            return message;
        } catch (error) {
            console.error('Error saving message:', error);
            throw error;
        }
    }

    static async getMessagesBetweenUsers(userId, otherId, limit = 50) {
        try {
            const messages = await Message.find({
                $or: [
                    { sender: userId, receiver: otherId },
                    { sender: otherId, receiver: userId }
                ],
                deletedFor: { $ne: userId }
            })
            .sort('-createdAt')
            .limit(limit)
            .populate('sender receiver', 'name profilePicture');

            // Mark messages as read
            await Message.updateMany(
                {
                    sender: otherId,
                    receiver: userId,
                    read: false
                },
                { read: true }
            );

            return messages.reverse();
        } catch (error) {
            console.error('Error getting messages:', error);
            throw error;
        }
    }

    static async getConversations(userId) {
        try {
            const messages = await Message.aggregate([
                {
                    $match: {
                        $or: [{ sender: userId }, { receiver: userId }],
                        deletedFor: { $ne: userId }
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ['$sender', userId] },
                                '$receiver',
                                '$sender'
                            ]
                        },
                        lastMessage: { $first: '$$ROOT' },
                        unreadCount: {
                            $sum: {
                                $cond: [
                                    { 
                                        $and: [
                                            { $eq: ['$receiver', userId] },
                                            { $eq: ['$read', false] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: '$user'
                },
                {
                    $project: {
                        user: {
                            _id: 1,
                            name: 1,
                            profilePicture: 1,
                            isAdmin: 1
                        },
                        lastMessage: 1,
                        unreadCount: 1
                    }
                },
                {
                    $sort: { 'lastMessage.createdAt': -1 }
                }
            ]);

            return messages;
        } catch (error) {
            console.error('Error getting conversations:', error);
            throw error;
        }
    }

    static async getUnreadCount(userId) {
        try {
            return await Message.countDocuments({
                receiver: userId,
                read: false,
                deletedFor: { $ne: userId }
            });
        } catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }

    static async markAsRead(messageIds, userId) {
        try {
            await Message.updateMany(
                {
                    _id: { $in: messageIds },
                    receiver: userId
                },
                { read: true }
            );
        } catch (error) {
            console.error('Error marking messages as read:', error);
            throw error;
        }
    }
}

export default ChatManager;