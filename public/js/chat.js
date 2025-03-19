// Verificar se já existe uma instância do ChatManager
if (typeof window.chatManager === 'undefined') {
    class ChatManager {
        constructor() {
            this.socket = window.socket;
            this.currentUser = this.getCurrentUser();
            this.selectedUserId = null;
            this.initializeElements();
            
            if (this.currentUser) {
                this.initializeSocketEvents();
                this.initializeUIEvents();
                this.initializeContactsEvents();
            } else {
                console.error('Usuário não encontrado');
            }
        }

        initializeElements() {
            // Inicializar todos os elementos necessários
            this.elements = {
                chatWelcome: document.querySelector('.chat-welcome'),
                chatContent: document.querySelector('.chat-content'),
                messagesContainer: document.getElementById('messagesContainer'),
                messageForm: document.getElementById('messageForm'),
                messageInput: document.getElementById('messageInput'),
                chatContainer: document.querySelector('.chat-container')
            };

            // Verificar elementos críticos
            if (!this.elements.messagesContainer) {
                console.error('Container de mensagens não encontrado');
            }
            if (!this.elements.chatContent) {
                console.error('Chat content não encontrado');
            }
        }

        getCurrentUser() {
            const userScript = document.getElementById('userScript');
            return userScript ? JSON.parse(userScript.textContent) : null;
        }

        initializeSocketEvents() {
            this.socket.on('connect', () => {
                console.log('Socket connected');
                if (this.currentUser) {
                    this.socket.emit('join', this.currentUser._id);
                }
            });

            this.socket.on('newMessage', (message) => {
                if (message.sender === this.selectedUserId || message.receiver === this.selectedUserId) {
                    this.appendMessage(message, message.sender === this.currentUser._id);
                    this.scrollToBottom();
                }
                this.updateUnreadCount();
            });

            this.socket.on('typing', (data) => {
                if (data.userId === this.selectedUserId) {
                    this.showTypingIndicator(data.isTyping);
                }
            });

            this.socket.on('userStatus', (data) => {
                this.updateUserStatus(data.userId, data.status);
            });
        }

        initializeUIEvents() {
            if (this.elements.messageForm) {
                this.elements.messageForm.addEventListener('submit', (e) => this.handleMessageSubmit(e));
            } else {
                console.error('Formulário de mensagem não encontrado');
            }

            if (this.elements.messageInput) {
                this.elements.messageInput.addEventListener('input', () => this.handleTyping());
            } else {
                console.error('Input de mensagem não encontrado');
            }
        }

        initializeContactsEvents() {
            const contacts = document.querySelectorAll('.contact-item');
            contacts.forEach(contact => {
                contact.addEventListener('click', () => {
                    const userId = contact.dataset.userId;
                    this.handleContactClick(userId);
                });
            });
        }

        async handleContactClick(userId) {
            try {
                this.selectedUserId = userId;
                
                // Usar os elementos armazenados
                const { chatWelcome, chatContent, messagesContainer } = this.elements;

                // Verificar se os elementos existem antes de manipulá-los
                if (chatWelcome) {
                    chatWelcome.style.display = 'none';
                }

                if (chatContent) {
                    chatContent.style.display = 'flex';
                    chatContent.style.flexDirection = 'column';
                    chatContent.style.height = '100%';
                } else {
                    console.error('Chat content não encontrado ao clicar no contato');
                    return;
                }

                if (messagesContainer) {
                    // Limpar mensagens anteriores
                    messagesContainer.innerHTML = '';
                    // Carregar novas mensagens
                    await this.loadMessages(userId);
                } else {
                    console.error('Container de mensagens não encontrado ao clicar no contato');
                }

            } catch (error) {
                console.error('Erro ao manipular clique do contato:', error);
            }
        }

        async loadMessages(userId) {
            try {
                const messagesContainer = document.getElementById('messagesContainer');
                if (!messagesContainer) {
                    console.error('Container de mensagens não encontrado em loadMessages');
                    return;
                }
        
                // Limpar mensagens anteriores
                messagesContainer.innerHTML = '';
        
                const response = await fetch(`/chat/messages/${userId}`);
                const messages = await response.json();
        
                if (messages && messages.length > 0) {
                    messages.forEach(message => {
                        this.appendMessage(message, message.sender === this.currentUser._id);
                    });
                    this.scrollToBottom();
                }
            } catch (error) {
                console.error('Erro ao carregar mensagens:', error);
            }
        }

        appendMessage(message, isOwn) {
            const messagesContainer = document.getElementById('messagesContainer');
            if (!messagesContainer) {
                console.error('Container de mensagens não encontrado em appendMessage');
                return;
            }
        
            try {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${isOwn ? 'message-own' : 'message-other'}`;
                
                messageDiv.innerHTML = `
                    <div class="message-content">
                        <p class="mb-0">${message.content}</p>
                        <div class="message-time">
                            ${new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                    </div>
                `;
                
                messagesContainer.appendChild(messageDiv);
                this.scrollToBottom();
            } catch (error) {
                console.error('Erro ao adicionar mensagem:', error);
            }
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
                    this.scrollToBottom();
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }

        handleTyping() {
            this.socket.emit('typing', {
                receiverId: this.selectedUserId,
                isTyping: true
            });

            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.socket.emit('typing', {
                    receiverId: this.selectedUserId,
                    isTyping: false
                });
            }, 1000);
        }

        showTypingIndicator(isTyping) {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) {
                indicator.style.display = isTyping ? 'block' : 'none';
            }
        }

        updateUserStatus(userId, status) {
            const contactElement = document.querySelector(`[data-user-id="${userId}"]`);
            if (contactElement) {
                const statusIndicator = contactElement.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.className = `status-indicator ${status}`;
                }
            }
        }

        scrollToBottom() {
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    } // 


    // Initialize chat when document is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Verificar se estamos na página de chat
        if (window.location.pathname === '/chat') {
            console.log('Inicializando ChatManager na página de chat');
            window.chatManager = new ChatManager();
        }
    });

} // 