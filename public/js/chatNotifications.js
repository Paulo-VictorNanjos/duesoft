class ChatNotifications {
    constructor() {
        this.unreadCount = 0;
        this.notifications = [];
        this.init();
    }

    init() {
        this.updateUnreadCount();
        this.initializeSocket();
        this.initializeEventListeners();
    }

    initializeSocket() {
        const socket = io();
        
        socket.on('message', (message) => {
            if (message.receiver === currentUser._id) {
                this.showNotification(message);
                this.updateUnreadCount(this.unreadCount + 1);
            }
        });
    }

    initializeEventListeners() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.markAllAsRead();
            }
        });
    }

    async updateUnreadCount() {
        try {
            const response = await fetch('/chat/unread-count');
            const data = await response.json();
            this.unreadCount = data.count;
            this.updateBadge();
        } catch (error) {
            console.error('Error updating unread count:', error);
        }
    }

    updateBadge() {
        const badge = document.querySelector('.chat-badge');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }
    }

    showNotification(message) {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            this.createNotification(message);
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    this.createNotification(message);
                }
            });
        }
    }

    createNotification(message) {
        const notification = new Notification("Nova Mensagem", {
            body: message.content,
            icon: "/images/chat-icon.png",
            badge: "/images/chat-badge.png"
        });

        notification.onclick = () => {
            window.focus();
            this.openChat(message.sender);
        };
    }

    async markAllAsRead() {
        try {
            await fetch('/chat/mark-all-read', { method: 'POST' });
            this.unreadCount = 0;
            this.updateBadge();
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    openChat(userId) {
        // Implementation depends on your chat UI
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.style.display = 'block';
            // Trigger click on user in contact list
            const userElement = document.querySelector(`[data-user-id="${userId}"]`);
            if (userElement) {
                userElement.click();
            }
        }
    }
}

// Initialize notifications when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatNotifications = new ChatNotifications();
});