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
        if (!userId) return;
        
        socket.join(userId.toString());
        this.onlineUsers.set(userId.toString(), socket.id);
        this.io.emit('userStatus', { 
            userId: userId.toString(), 
            status: 'online' 
        });
        
        console.log(`User ${userId} joined`);
    }

    handleMessage(socket, data) {
        if (!data.receiverId || !data.content) return;

        const receiverSocketId = this.onlineUsers.get(data.receiverId.toString());
        if (receiverSocketId) {
            this.io.to(receiverSocketId).emit('message', {
                content: data.content,
                sender: data.senderId,
                receiver: data.receiverId,
                createdAt: new Date()
            });
        }
    }

    handleTyping(socket, data) {
        if (!data.receiverId) return;

        const receiverSocketId = this.onlineUsers.get(data.receiverId.toString());
        if (receiverSocketId) {
            this.io.to(receiverSocketId).emit('typing', {
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
        return this.onlineUsers.has(userId.toString());
    }

    getUserSocket(userId) {
        return this.onlineUsers.get(userId.toString());
    }

    broadcastMessage(message) {
        const receiverSocketId = this.onlineUsers.get(message.receiver.toString());
        if (receiverSocketId) {
            this.io.to(receiverSocketId).emit('newMessage', message);
        }
    }
}

export default SocketManager;