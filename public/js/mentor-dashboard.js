// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadMentorData();
    initializeAvailabilityForm();
});

// Carregar dados do mentor
async function loadMentorData() {
    try {
        const response = await fetch('/mentoring/mentor/metrics');
        const data = await response.json();
        updateMetricsDisplay(data);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showMessage('error', 'Erro ao carregar dados do mentor');
    }
}

// Gerenciar disponibilidade
function updateAvailability() {
    const modal = new bootstrap.Modal(document.getElementById('availabilityModal'));
    modal.show();
}

async function saveAvailability() {
    try {
        const form = document.getElementById('availabilityForm');
        const availability = [];

        // Coletar dados do formulário
        for (let i = 0; i < 7; i++) {
            const dayCheckbox = document.getElementById(`day${i}`);
            if (dayCheckbox.checked) {
                availability.push({
                    dayOfWeek: i,
                    startTime: form[`startTime${i}`].value,
                    endTime: form[`endTime${i}`].value
                });
            }
        }

        const response = await fetch('/mentoring/mentor/availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ availability })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('success', 'Disponibilidade atualizada com sucesso');
            bootstrap.Modal.getInstance(document.getElementById('availabilityModal')).hide();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erro ao salvar disponibilidade:', error);
        showMessage('error', 'Erro ao salvar disponibilidade');
    }
}

// Iniciar sessão
async function startSession(sessionId) {
    try {
        const response = await fetch(`/mentoring/sessions/${sessionId}/start`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.meetingLink) {
            window.open(data.meetingLink, '_blank');
        } else {
            throw new Error('Link da reunião não disponível');
        }
    } catch (error) {
        console.error('Erro ao iniciar sessão:', error);
        showMessage('error', 'Erro ao iniciar sessão');
    }
}

// Funções auxiliares
function updateMetricsDisplay(data) {
    // Atualizar cards de métricas
    document.querySelector('.total-sessions').textContent = data.totalSessions;
    document.querySelector('.completed-sessions').textContent = data.completedSessions;
    document.querySelector('.average-rating').textContent = data.rating.toFixed(1);
}

function showMessage(type, message) {
    if (typeof toastr !== 'undefined') {
        toastr[type](message);
    } else {
        alert(message);
    }
} 