document.addEventListener('DOMContentLoaded', () => {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationCount = document.getElementById('notificationCount');
    let notificationDropdown = document.getElementById('notificationDropdown');

    // Criar o dropdown se ele não existir
    if (!notificationDropdown) {
        // Criar wrapper para o dropdown
        const dropdownWrapper = document.createElement('div');
        dropdownWrapper.className = 'notifications-wrapper';
        
        notificationDropdown = document.createElement('div');
        notificationDropdown.id = 'notificationDropdown';
        notificationDropdown.className = 'notification-dropdown';
        notificationDropdown.style.display = 'none';
        
        notificationDropdown.innerHTML = `
            <div class="notification-header">
                <h6>Notificações</h6>
                <button id="markAllRead" class="mark-all-read">Marcar todas como lidas</button>
            </div>
            <div id="notificationList" class="notification-list"></div>
        `;
        
        dropdownWrapper.appendChild(notificationDropdown);
        notificationBtn.parentNode.appendChild(dropdownWrapper);
    }

    const notificationList = document.getElementById('notificationList');
    const markAllRead = document.getElementById('markAllRead');
    let notifications = [];

    // Toggle dropdown
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = notificationDropdown.style.display === 'block';
        notificationDropdown.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            loadNotifications();
        }
    });

    // Função para formatar a data
    function formatDate(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `${minutes}m atrás`;
        if (hours < 24) return `${hours}h atrás`;
        return `${days}d atrás`;
    }

    // Carregar notificações
    async function loadNotifications() {
        try {
            const response = await fetch('/notifications');
            notifications = await response.json();
            updateNotificationCount();
            renderNotifications();
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
        }
    }

    // Atualizar contador
    function updateNotificationCount() {
        const unreadCount = notifications.filter(n => !n.read).length;
        notificationCount.textContent = unreadCount;
        notificationCount.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    // Renderizar notificações
    function renderNotifications() {
        notificationList.innerHTML = notifications.length ? notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification._id}">
                <div class="notification-content">${notification.message}</div>
                <div class="notification-time">${formatDate(notification.createdAt)}</div>
            </div>
        `).join('') : '<div class="p-3 text-center">Nenhuma notificação</div>';
    }

    // Marcar como lida ao clicar
    notificationList.addEventListener('click', async (e) => {
        const item = e.target.closest('.notification-item');
        if (item && !item.classList.contains('read')) {
            try {
                await fetch(`/notifications/${item.dataset.id}/read`, {
                    method: 'PUT'
                });
                item.classList.remove('unread');
                loadNotifications();
            } catch (error) {
                console.error('Erro ao marcar notificação como lida:', error);
            }
        }
    });

    // Marcar todas como lidas
    markAllRead.addEventListener('click', async () => {
        try {
            await fetch('/notifications/read-all', {
                method: 'PUT'
            });
            loadNotifications();
        } catch (error) {
            console.error('Erro ao marcar todas como lidas:', error);
        }
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.style.display = 'none';
        }
    });

    // Carregar notificações inicialmente
    loadNotifications();

    // Atualizar notificações a cada minuto
    setInterval(loadNotifications, 60000);
}); 