class SocketManager {
    constructor(io) {
        this.io = io;
        this.onlineUsers = new Map();
        this.initializeHandlers();
    }

    initializeHandlers() {
        this.io.on('connection', (socket) => {
            console.log('New connection:', socket.id);

            socket.on('join', (userId) => this.handleJoin(socket, userId));
            socket.on('message', (data) => this.handleMessage(socket, data));
            socket.on('typing', (data) => this.handleTyping(socket, data));
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }

    handleJoin(socket, userId) {
        socket.join(userId);
        this.onlineUsers.set(userId, socket.id);
        this.io.emit('userStatus', { userId, status: 'online' });
        console.log(`User ${userId} joined`);
    }

    handleMessage(socket, data) {
        const receiverSocket = this.onlineUsers.get(data.receiverId);
        if (receiverSocket) {
            this.io.to(receiverSocket).emit('message', {
                content: data.content,
                sender: data.senderId,
                receiver: data.receiverId,
                createdAt: new Date()
            });
        }
    }

    handleTyping(socket, data) {
        const receiverSocket = this.onlineUsers.get(data.receiverId);
        if (receiverSocket) {
            this.io.to(receiverSocket).emit('typing', {
                userId: data.senderId,
                isTyping: data.isTyping
            });
        }
    }

    handleDisconnect(socket) {
        let disconnectedUserId;
        this.onlineUsers.forEach((socketId, userId) => {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                this.onlineUsers.delete(userId);
            }
        });

        if (disconnectedUserId) {
            this.io.emit('userStatus', {
                userId: disconnectedUserId,
                status: 'offline'
            });
        }
        console.log('User disconnected:', socket.id);
    }

    isUserOnline(userId) {
        return this.onlineUsers.has(userId);
    }

    getUserSocket(userId) {
        return this.onlineUsers.get(userId);
    }
}

export default SocketManager;