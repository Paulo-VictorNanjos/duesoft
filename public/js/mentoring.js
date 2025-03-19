// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando scripts de mentoria');
    
    // Verificar se é mentor
    const isMentor = document.querySelector('#mentor-area') !== null;
    console.log('Usuário é mentor:', isMentor);

    // Inicializar filtros apenas se existirem
    const searchInput = document.getElementById('searchMentor');
    const specialtyFilter = document.getElementById('specialtyFilter');
    const ratingFilter = document.getElementById('ratingFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterMentors);
    }
    if (specialtyFilter) {
        specialtyFilter.addEventListener('change', filterMentors);
    }
    if (ratingFilter) {
        ratingFilter.addEventListener('change', filterMentors);
    }

    // Configurar toastr
    if (typeof toastr !== 'undefined') {
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 3000,
            preventDuplicates: true
        };
    }

    // Adicionar eventos para cada modal de avaliação
    document.querySelectorAll('[id^="avaliacaoModal-"]').forEach(modal => {
        const sessionId = modal.id.split('-')[1];
        console.log('Configurando modal de avaliação:', modal.id, 'Session ID:', sessionId);
        
        const stars = modal.querySelectorAll('.star-rating i');
        const inputs = modal.querySelectorAll(`input[name="rating-${sessionId}"]`);
        
        console.log('Estrelas encontradas:', stars.length);
        console.log('Inputs encontrados:', inputs.length);

        // Adicionar eventos para cada estrela
        stars.forEach((star, index) => {
            star.addEventListener('mouseover', function() {
                const rating = this.dataset.rating;
                console.log('Mouse sobre estrela:', rating);
                updateStars(modal.querySelectorAll('.star-rating i'), rating, sessionId);
            });

            star.addEventListener('mouseout', function() {
                const selectedRating = modal.querySelector(`input[name="rating-${sessionId}"]:checked`)?.value;
                console.log('Mouse fora, rating selecionado:', selectedRating);
                updateStars(modal.querySelectorAll('.star-rating i'), selectedRating || 0, sessionId);
            });

            // Novo evento de clique diretamente na estrela
            star.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const rating = this.dataset.rating;
                console.log('Clique na estrela:', rating, 'Session ID:', sessionId);
                
                // Encontrar e marcar o input correspondente
                const input = modal.querySelector(`input[name="rating-${sessionId}"][value="${rating}"]`);
                if (input) {
                    console.log('Marcando input com valor:', rating);
                    input.checked = true;
                    
                    // Atualizar todas as estrelas
                    updateStars(modal.querySelectorAll('.star-rating i'), rating, sessionId);
                    
                    // Verificar se o input foi realmente marcado
                    console.log('Input marcado:', input.checked);
                    console.log('Valor do input marcado:', input.value);
                } else {
                    console.log('Input não encontrado para valor:', rating);
                }
            });
        });

        // Adicionar evento de submit ao formulário
        const form = modal.querySelector(`#avaliacaoForm-${sessionId}`);
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                enviarAvaliacao(sessionId);
            });
        }
    });
});

// Função para filtrar mentores
function filterMentors() {
    const search = document.getElementById('searchMentor')?.value.toLowerCase() || '';
    const specialty = document.getElementById('specialtyFilter')?.value || '';
    const rating = document.getElementById('ratingFilter')?.value || '';

    document.querySelectorAll('.mentor-card').forEach(card => {
        const mentorName = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
        const mentorSpecialties = card.dataset.specialties?.toLowerCase() || '';
        const mentorRating = parseFloat(card.dataset.rating || '0');

        const matchesSearch = mentorName.includes(search) || mentorSpecialties.includes(search);
        const matchesSpecialty = !specialty || mentorSpecialties.includes(specialty.toLowerCase());
        const matchesRating = !rating || mentorRating >= parseFloat(rating);

        card.style.display = matchesSearch && matchesSpecialty && matchesRating ? 'block' : 'none';
    });
}

// Função para mostrar mensagens
function showMessage(type, message) {
    if (typeof toastr !== 'undefined') {
        switch(type) {
            case 'success':
                toastr.success(message);
                break;
            case 'error':
                toastr.error(message);
                break;
            case 'warning':
                toastr.warning(message);
                break;
            case 'info':
                toastr.info(message);
                break;
            default:
                toastr.info(message);
        }
    } else {
        alert(message);
    }
}

// Função auxiliar para obter o token CSRF
function getCsrfToken() {
    // Tentar pegar do formulário primeiro
    const csrfInput = document.querySelector('input[name="_csrf"]');
    if (csrfInput?.value) {
        return csrfInput.value;
    }
    
    // Se não encontrar no formulário, tentar pegar da meta tag
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta?.content) {
        return csrfMeta.content;
    }
    
    console.error('Token CSRF não encontrado');
    throw new Error('Token de segurança não encontrado');
}

// Função para completar sessão
async function completarSessao(sessionId) {
    try {
        console.log('Iniciando conclusão da sessão:', sessionId);
        
        if (!confirm('Tem certeza que deseja concluir esta sessão?')) {
            console.log('Usuário cancelou a conclusão');
            return;
        }

        const csrfToken = getCsrfToken();
        console.log('Token CSRF obtido:', csrfToken);

        console.log('Enviando requisição para:', `/mentoring/mentor/sessions/${sessionId}/complete`);
        const response = await fetch(`/mentoring/mentor/sessions/${sessionId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            }
        });

        console.log('Resposta recebida:', response.status);
        const data = await response.json();
        console.log('Dados da resposta:', data);

        if (data.success) {
            console.log('Sessão concluída com sucesso');
            showMessage('success', 'Sessão concluída com sucesso!');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            console.error('Erro nos dados:', data.error);
            throw new Error(data.error || 'Erro ao concluir sessão');
        }

    } catch (error) {
        console.error('Erro ao concluir sessão:', error);
        showMessage('error', error.message || 'Erro ao concluir sessão');
    }
}

// Atualizar a função de cancelar sessão
async function cancelarSessao(sessionId) {
    if (!confirm('Tem certeza que deseja cancelar esta sessão?')) return;

    try {
        const csrfToken = getCsrfToken();

        const response = await fetch(`/mentoring/sessions/${sessionId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            }
        });

        const data = await response.json();

        if (data.success) {
            showMessage('success', 'Sessão cancelada com sucesso!');
            location.reload();
        } else {
            showMessage('error', data.error || 'Erro ao cancelar sessão');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('error', 'Erro ao processar sua solicitação');
    }
}

// Função para agendar sessão
async function agendarMentoria(mentorId) {
    try {
        console.log('Iniciando agendamento com mentor:', mentorId);
        
        // Limpar e preparar modal
        document.getElementById('mentorId').value = mentorId;
        document.getElementById('sessionDate').value = '';
        document.getElementById('sessionTime').innerHTML = '<option value="">Selecione uma data primeiro</option>';
        document.getElementById('sessionTopics').value = '';
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('agendamentoModal'));
        modal.show();

    } catch (error) {
        console.error('Erro ao preparar agendamento:', error);
        showMessage('error', 'Erro ao preparar agendamento');
    }
}

// Função para confirmar agendamento
async function confirmarAgendamento() {
    try {
        console.log('Iniciando confirmação de agendamento');
        
        // Coletar dados do formulário
        const mentorId = document.getElementById('mentorId').value;
        const date = document.getElementById('sessionDate').value;
        const time = document.getElementById('sessionTime').value;
        const duration = document.getElementById('sessionDuration').value;
        const topics = document.getElementById('sessionTopics').value;
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

        // Validar dados
        if (!mentorId || !date || !time || !duration || !topics || !paymentMethod) {
            showMessage('error', 'Por favor, preencha todos os campos');
            return;
        }

        // Obter token CSRF
        const csrfToken = getCsrfToken();

        // Enviar requisição
        const response = await fetch('/mentoring/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                mentorId,
                date,
                time,
                duration,
                topics,
                paymentMethod
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('success', 'Mentoria agendada com sucesso!');
            // Fechar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('agendamentoModal'));
            modal.hide();
            // Recarregar página após 1.5 segundos
            setTimeout(() => location.reload(), 1500);
        } else {
            throw new Error(data.error || 'Erro ao agendar mentoria');
        }

    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error);
        showMessage('error', error.message || 'Erro ao agendar mentoria');
    }
}

// Se houver alguma referência ao dashboard, atualize para mentor-area
function goToMentorArea() {
    window.location.href = '/mentoring/mentor-area';
}

// Gerenciar disponibilidade do mentor
function gerenciarDisponibilidade() {
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('disponibilidadeModal'));
    
    // Carregar disponibilidade atual
    carregarDisponibilidade();
    
    modal.show();
}

// Carregar disponibilidade atual do mentor
async function carregarDisponibilidade() {
    try {
        console.log('Carregando disponibilidade...');
        const response = await fetch('/mentoring/availability');
        const data = await response.json();
        console.log('Disponibilidade recebida:', data);

        if (data.success && data.availability) {
            // Primeiro, limpar todos os campos
            for (let i = 0; i < 7; i++) {
                const dayCheckbox = document.getElementById(`day${i}`);
                if (dayCheckbox) {
                    dayCheckbox.checked = false;
                    document.querySelector(`[name="startTime${i}"]`).value = '';
                    document.querySelector(`[name="endTime${i}"]`).value = '';
                }
            }

            // Preencher com os dados do mentor
            data.availability.forEach(slot => {
                const dayCheckbox = document.getElementById(`day${slot.dayOfWeek}`);
                if (dayCheckbox) {
                    dayCheckbox.checked = true;
                    document.querySelector(`[name="startTime${slot.dayOfWeek}"]`).value = slot.startTime;
                    document.querySelector(`[name="endTime${slot.dayOfWeek}"]`).value = slot.endTime;
                }
            });
        }
    } catch (error) {
        console.error('Erro ao carregar disponibilidade:', error);
        showMessage('error', 'Erro ao carregar disponibilidade');
    }
}

// Atualizar a função de salvar disponibilidade
async function salvarDisponibilidade() {
    try {
        console.log('Salvando disponibilidade...');
        const availability = [];
        
        // Coletar dados do formulário
        for (let i = 0; i < 7; i++) {
            const dayCheckbox = document.getElementById(`day${i}`);
            if (dayCheckbox?.checked) {
                const startTime = document.querySelector(`[name="startTime${i}"]`).value;
                const endTime = document.querySelector(`[name="endTime${i}"]`).value;
                
                if (!startTime || !endTime) {
                    throw new Error('Preencha os horários para os dias selecionados');
                }

                availability.push({
                    dayOfWeek: i,
                    startTime,
                    endTime
                });
            }
        }

        console.log('Dados coletados:', availability);

        const csrfToken = getCsrfToken();

        const response = await fetch('/mentoring/availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ availability })
        });

        const data = await response.json();
        console.log('Resposta:', data);

        if (data.success) {
            showMessage('success', 'Disponibilidade atualizada com sucesso');
            bootstrap.Modal.getInstance(document.getElementById('disponibilidadeModal')).hide();
            setTimeout(() => window.location.reload(), 1500);
        } else {
            throw new Error(data.error || 'Erro ao salvar disponibilidade');
        }

    } catch (error) {
        console.error('Erro ao salvar disponibilidade:', error);
        showMessage('error', error.message || 'Erro ao salvar disponibilidade');
    }
}

// Função para enviar avaliação
async function enviarAvaliacao(sessionId) {
    try {
        console.log('Iniciando processo de avaliação para sessão:', sessionId);
        
        const modal = document.getElementById(`avaliacaoModal-${sessionId}`);
        if (!modal) {
            console.error('Modal não encontrado');
            showMessage('error', 'Erro ao encontrar modal de avaliação');
            return;
        }
        
        const form = modal.querySelector('form');
        if (!form) {
            console.error('Formulário não encontrado');
            showMessage('error', 'Erro ao encontrar formulário de avaliação');
            return;
        }

        // Usar a função getCsrfToken() para obter o token
        const csrfToken = getCsrfToken();
        console.log('CSRF Token obtido');
        
        const rating = modal.querySelector(`input[name="rating-${sessionId}"]:checked`);
        console.log('Avaliação selecionada:', rating ? rating.value : 'Nenhuma');
        
        const feedback = modal.querySelector(`textarea[name="feedback-${sessionId}"]`);
        console.log('Feedback encontrado:', feedback !== null);
        console.log('Conteúdo do feedback:', feedback?.value);

        if (!rating) {
            console.log('ERRO: Nenhuma avaliação selecionada');
            showMessage('error', 'Por favor, selecione uma avaliação');
            return;
        }

        if (!feedback || !feedback.value.trim()) {
            console.log('ERRO: Feedback vazio ou não encontrado');
            showMessage('error', 'Por favor, deixe um feedback');
            return;
        }

        const dadosAvaliacao = {
            rating: Number(rating.value),
            feedback: feedback.value.trim()
        };

        console.log('Preparando dados para envio:', {
            sessionId,
            ...dadosAvaliacao
        });

        console.log('Enviando requisição para:', `/mentoring/sessions/${sessionId}/review`);
        const response = await fetch(`/mentoring/sessions/${sessionId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(dadosAvaliacao)
        });

        console.log('Resposta recebida - Status:', response.status);
        const data = await response.json();
        console.log('Dados da resposta:', data);

        if (response.ok) {
            console.log('Avaliação enviada com sucesso');
            showMessage('success', 'Avaliação enviada com sucesso!');
            
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                console.log('Modal encontrado, fechando...');
                modalInstance.hide();
            }
            
            console.log('Agendando recarga da página...');
            setTimeout(() => {
                console.log('Recarregando página...');
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(data.error || 'Erro ao enviar avaliação');
        }

    } catch (error) {
        console.error('Erro detalhado ao enviar avaliação:', error);
        console.error('Stack trace:', error.stack);
        showMessage('error', `Erro ao enviar avaliação: ${error.message}`);
    }
}

// Função para atualizar a aparência das estrelas
function updateStars(stars, rating, sessionId) {
    console.log('Atualizando aparência das estrelas:', {
        totalEstrelas: stars.length,
        avaliacaoSelecionada: rating,
        sessionId: sessionId
    });
    
    stars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        const novaCor = starRating <= rating ? 'var(--warning)' : '#ddd';
        console.log(`Estrela ${starRating}: ${novaCor}`);
        star.style.color = novaCor;
    });
}
 