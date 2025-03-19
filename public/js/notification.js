// Sistema de Notificações
let notifications = [];

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'warning': return 'exclamation-triangle';
        case 'error': return 'times-circle';
        default: return 'info-circle';
    }
}

async function loadNotifications() {
    try {
        const response = await fetch('/notifications');
        notifications = await response.json();
        updateNotificationsUI();
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
    }
}

function updateNotificationsUI() {
    const list = document.querySelector('.notifications-list');
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Atualizar badge
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Atualizar lista
    if (list) {
        if (notifications.length === 0) {
            list.innerHTML = '<div class="p-3 text-center text-muted">Nenhuma notificação</div>';
        } else {
            list.innerHTML = notifications.map(notification => `
                <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification._id}">
                    <div class="d-flex align-items-center p-3">
                        <i class="fas fa-${getNotificationIcon(notification.type)} me-2"></i>
                        <div>
                            <strong>${notification.title}</strong>
                            <p class="mb-0 text-muted">${notification.message}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Inicialização do sistema de notificações
document.addEventListener('DOMContentLoaded', () => {
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationsDropdown = document.getElementById('notificationsDropdown');

    if (notificationIcon && notificationsDropdown) {
        // Toggle dropdown ao clicar no ícone
        notificationIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = notificationsDropdown.style.display === 'block';
            notificationsDropdown.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                loadNotifications();
            }
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!notificationIcon.contains(e.target)) {
                notificationsDropdown.style.display = 'none';
            }
        });

        // Marcar todas como lidas
        const markAllReadBtn = notificationsDropdown.querySelector('.mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await fetch('/notifications/read-all', { 
                        method: 'PUT',  // Mudando para PUT conforme definido na rota
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    loadNotifications();
                } catch (error) {
                    console.error('Erro ao marcar notificações como lidas:', error);
                }
            });
        }

        // Carregar notificações iniciais
        loadNotifications();
        
        // Atualizar a cada minuto
        setInterval(loadNotifications, 60000);
    }
});

// Socket.io para notificações em tempo real
socket.on('notification:new', (data) => {
    if (data.notification) {
        showToast(data.notification);
        loadNotifications();
    }
});
</script>

<script>        
    // Marcar todas como lidas
    document.querySelector('.mark-all-read').addEventListener('click', async () => {
        try {
            await fetch('/notifications/read-all', { 
                method: 'PUT',  // Mudando para PUT conforme definido na rota
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            loadNotifications();
        } catch (error) {
            console.error('Erro ao marcar notificações como lidas:', error);
        }
    });