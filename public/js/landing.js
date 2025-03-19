// Evitar carregamento duplo do Stripe
if (!window.stripeLoaded) {
    const stripe = Stripe('sua_chave_publica');
    window.stripeLoaded = true;
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se os elementos existem antes de adicionar listeners
    const planButtons = document.querySelectorAll('[data-plan-button]');
    if (planButtons) {
        planButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                // seu código do plano aqui
            });
        });
    }

    // Outros event listeners com verificação
    const form = document.querySelector('#signupForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            // seu código do form aqui
        });
    }

    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navbarMenu = document.querySelector('.navbar-menu');
    const navbarAuth = document.querySelector('.navbar-auth');

    mobileMenuBtn.addEventListener('click', () => {
        navbarMenu.classList.toggle('active');
        navbarAuth.classList.toggle('active');
    });

    // Smooth Scroll
    const links = document.querySelectorAll('a[href^="#"]');
    if (links) {
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = link.getAttribute('href').slice(1);
                if (id) {
                    const element = document.getElementById(id);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    // Animation on Scroll
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight;
            
            if(elementPosition < screenPosition) {
                element.classList.add('animated');
            }
        });
    }

    window.addEventListener('scroll', animateOnScroll);

    // FAQ Toggle
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Fecha todos os outros itens
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            // Abre/fecha o item clicado
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });

    // Certifique-se de que o seletor está correto
    document.querySelector('.seletor-valido').addEventListener('click', function() {
        // Código aqui
    });
}); 