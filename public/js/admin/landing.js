// Gerenciamento da Landing Page
class LandingManager {
    constructor() {
        this.initializeForm();
        this.initializeFeatures();
        this.initializeTestimonials();
    }

    initializeForm() {
        const form = document.getElementById('landingForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = new FormData(form);

                // Coletar dados das features
                const features = [];
                document.querySelectorAll('.feature-item').forEach((item, index) => {
                    features.push({
                        icon: item.querySelector('select[name^="features["]')?.value,
                        title: item.querySelector('input[name$="[title]"]')?.value,
                        description: item.querySelector('textarea[name$="[description]"]')?.value
                    });
                });

                // Coletar dados dos testimonials
                const testimonials = [];
                document.querySelectorAll('.testimonial-item').forEach((item, index) => {
                    const testimonial = {
                        name: item.querySelector('input[name$="[name]"]')?.value,
                        role: item.querySelector('input[name$="[role]"]')?.value,
                        text: item.querySelector('textarea[name$="[text]"]')?.value
                    };

                    // Adicionar imagem se existir
                    const imageInput = item.querySelector('input[type="file"]');
                    if (imageInput?.files[0]) {
                        formData.append(`testimonials[${index}][image]`, imageInput.files[0]);
                    }

                    testimonials.push(testimonial);
                });

                // Adicionar dados estruturados ao FormData
                formData.append('featuresData', JSON.stringify(features));
                formData.append('testimonialsData', JSON.stringify(testimonials));

                // Adicionar dados do CTA
                formData.append('ctaTitle', document.querySelector('[name="ctaTitle"]')?.value || '');
                formData.append('ctaSubtitle', document.querySelector('[name="ctaSubtitle"]')?.value || '');
                formData.append('ctaPrimaryBtnText', document.querySelector('[name="ctaPrimaryBtnText"]')?.value || '');
                formData.append('ctaPrimaryBtnUrl', document.querySelector('[name="ctaPrimaryBtnUrl"]')?.value || '');
                formData.append('ctaSecondaryBtnText', document.querySelector('[name="ctaSecondaryBtnText"]')?.value || '');
                formData.append('ctaSecondaryBtnUrl', document.querySelector('[name="ctaSecondaryBtnUrl"]')?.value || '');

                // Adicionar estilos das seções
                formData.append('featuresBgColor', document.querySelector('[name="featuresBgColor"]')?.value || '');
                formData.append('featuresTextColor', document.querySelector('[name="featuresTextColor"]')?.value || '');
                formData.append('featuresPadding', document.querySelector('[name="featuresPadding"]')?.value || '');

                formData.append('testimonialsBgColor', document.querySelector('[name="testimonialsBgColor"]')?.value || '');
                formData.append('testimonialsTextColor', document.querySelector('[name="testimonialsTextColor"]')?.value || '');
                formData.append('testimonialsPadding', document.querySelector('[name="testimonialsPadding"]')?.value || '');

                formData.append('ctaBgColor', document.querySelector('[name="ctaBgColor"]')?.value || '');
                formData.append('ctaTextColor', document.querySelector('[name="ctaTextColor"]')?.value || '');
                formData.append('ctaPadding', document.querySelector('[name="ctaPadding"]')?.value || '');

                // Debug
                console.log('Dados sendo enviados:', {
                    features,
                    testimonials,
                    formDataEntries: Array.from(formData.entries())
                });

                const response = await fetch('/admin/landing/settings', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Erro ao salvar configurações');
                }

                const result = await response.json();
                
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sucesso!',
                        text: 'Configurações salvas com sucesso',
                        showConfirmButton: false,
                        timer: 1500
                    });
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    throw new Error(result.error || 'Erro ao salvar configurações');
                }

            } catch (error) {
                console.error('Erro:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: error.message,
                    confirmButtonText: 'OK'
                });
            }
        });
    }

    initializeFeatures() {
        const addFeatureBtn = document.getElementById('addFeature');
        if (!addFeatureBtn) return;

        addFeatureBtn.addEventListener('click', () => {
            const container = document.getElementById('featuresContainer');
            const index = container.children.length;
            
            const template = `
                <div class="feature-item card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <label class="form-label">Ícone</label>
                                <select class="form-select" name="features[${index}][icon]">
                                    <option value="fas fa-laptop-code">💻 Laptop</option>
                                    <option value="fas fa-video">🎥 Vídeo</option>
                                    <option value="fas fa-chart-line">📈 Gráfico</option>
                                    <option value="fas fa-mobile-alt">📱 Mobile</option>
                                    <option value="fas fa-certificate">🏆 Certificado</option>
                                    <option value="fas fa-comments">💬 Comentários</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Título</label>
                                <input type="text" class="form-control" name="features[${index}][title]">
                            </div>
                            <div class="col-md-5">
                                <label class="form-label">Descrição</label>
                                <textarea class="form-control" name="features[${index}][description]" rows="2"></textarea>
                            </div>
                        </div>
                        <button type="button" class="btn btn-danger btn-sm mt-2 remove-feature">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', template);
        });

        // Remover feature
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-feature')) {
                e.target.closest('.feature-item').remove();
            }
        });
    }

    initializeTestimonials() {
        // Similar ao initializeFeatures
        // Implementar se necessário
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new LandingManager();
}); 