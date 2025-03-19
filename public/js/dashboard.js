class ChatManager {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.selectedUserId = null;
        this.isTyping = false;
        this.typingTimeout = null;
        this.init();
    }

    init() {
        // Get current user from script tag
        const userScript = document.getElementById('userScript');
        if (userScript) {
            this.currentUser = JSON.parse(userScript.textContent);
            this.socket.emit('join', this.currentUser._id);
        }

        this.initializeEventListeners();
        this.initializeSocketEvents();
    }

    initializeEventListeners() {
        // Message Form
        const messageForm = document.getElementById('messageForm');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => this.handleMessageSubmit(e));
        }

        // Message Input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => this.handleTyping());
        }

        // Contact List
        const contactsList = document.querySelector('.contacts-list');
        if (contactsList) {
            contactsList.addEventListener('click', (e) => this.handleContactClick(e));
        }
    }

    initializeSocketEvents() {
        this.socket.on('message', (message) => this.handleIncomingMessage(message));
        this.socket.on('typing', (data) => this.handleTypingIndicator(data));
        this.socket.on('userStatus', (data) => this.updateUserStatus(data));
    }

    async handleMessageSubmit(e) {
        e.preventDefault();
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();

        if (!content || !this.selectedUserId) return;

        try {
            const response = await fetch('/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: this.selectedUserId,
                    content: content
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.appendMessage(result.message, true);
                messageInput.value = '';
                
                this.socket.emit('message', {
                    receiverId: this.selectedUserId,
                    content: result.message.content,
                    senderId: this.currentUser._id
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', {
                receiverId: this.selectedUserId,
                isTyping: true
            });
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            this.socket.emit('typing', {
                receiverId: this.selectedUserId,
                isTyping: false
            });
        }, 2000);
    }

    async handleContactClick(e) {
        const contactItem = e.target.closest('.contact-item');
        if (!contactItem) return;

        // Update UI
        document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.remove('active');
        });
        contactItem.classList.add('active');

        // Show chat content
        const chatWelcome = document.getElementById('chatWelcome');
        const chatContent = document.getElementById('chatContent');
        if (chatWelcome) chatWelcome.style.display = 'none';
        if (chatContent) chatContent.style.display = 'flex';

        // Update selected user
        this.selectedUserId = contactItem.dataset.userId;
        await this.loadMessages(this.selectedUserId);

        // Update chat header
        this.updateChatHeader(contactItem);
    }

    async loadMessages(userId) {
        try {
            const response = await fetch(`/chat/messages/${userId}`);
            const messages = await response.json();
            
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
                messages.forEach(message => {
                    this.appendMessage(message, message.sender === this.currentUser._id);
                });
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    appendMessage(message, isOutgoing) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message.content}</p>
                <div class="message-time">
                    ${new Date(message.createdAt).toLocaleTimeString()}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    updateChatHeader(contactItem) {
        const userName = contactItem.querySelector('.contact-name').textContent;
        const userAvatar = contactItem.querySelector('img')?.src || '';

        const chatUserName = document.getElementById('chatUserName');
        const chatUserAvatar = document.getElementById('chatUserAvatar');

        if (chatUserName) chatUserName.textContent = userName;
        if (chatUserAvatar) {
            if (userAvatar) {
                chatUserAvatar.src = userAvatar;
                chatUserAvatar.style.display = 'block';
            } else {
                chatUserAvatar.style.display = 'none';
            }
        }
    }

    handleIncomingMessage(message) {
        if (message.sender === this.selectedUserId) {
            this.appendMessage(message, false);
        }
        this.updateLastMessage(message.sender, message.content);
    }

    handleTypingIndicator(data) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator && data.userId === this.selectedUserId) {
            typingIndicator.style.display = data.isTyping ? 'block' : 'none';
        }
    }

    updateUserStatus(data) {
        const contact = document.querySelector(`.contact-item[data-user-id="${data.userId}"]`);
        if (contact) {
            const statusDot = contact.querySelector('.status-indicator');
            if (statusDot) {
                statusDot.classList.toggle('online', data.status === 'online');
            }
        }
    }

    updateLastMessage(userId, content) {
        const contact = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
        if (contact) {
            const lastMessage = contact.querySelector('.last-message');
            const messageTime = contact.querySelector('.message-time');
            
            if (lastMessage) lastMessage.textContent = content;
            if (messageTime) messageTime.textContent = new Date().toLocaleTimeString();
            
            // Move contact to top
            const parent = contact.parentNode;
            if (parent) {
                parent.prepend(contact);
            }
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}

// Initialize chat when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
});