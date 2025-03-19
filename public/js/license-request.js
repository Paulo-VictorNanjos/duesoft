document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('licenseRequestForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                
                console.log('Enviando dados:', data); // Debug

                const response = await fetch('/license/request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sucesso!',
                        text: result.message || 'Solicitação enviada com sucesso!',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    throw new Error(result.message || 'Erro ao processar solicitação');
                }
            } catch (error) {
                console.error('Erro:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: error.message || 'Erro ao enviar solicitação',
                    confirmButtonText: 'OK'
                });
            }
        });
    }
}); 