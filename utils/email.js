import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true para 465, false para outros
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const sendActivationEmail = async (email, { companyName, activationLink, responsible }) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Bem-vindo ao LMS Portal - Ative sua conta ${companyName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .header {
                        background: #4f46e5;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        padding: 20px;
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background: #4f46e5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        font-size: 0.875rem;
                        color: #6b7280;
                    }
                    .info-box {
                        background: white;
                        border: 1px solid #e5e7eb;
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                    }
                    .highlight {
                        color: #4f46e5;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Bem-vindo ao LMS Portal!</h1>
                </div>
                
                <div class="content">
                    <h2>Olá, ${responsible}!</h2>
                    
                    <p>Sua empresa <span class="highlight">${companyName}</span> foi registrada com sucesso em nossa plataforma.</p>
                    
                    <div class="info-box">
                        <h3>Informações da Empresa:</h3>
                        <ul>
                            <li><strong>Nome:</strong> ${companyName}</li>
                            <li><strong>Responsável:</strong> ${responsible}</li>
                            <li><strong>Email:</strong> ${email}</li>
                            <li><strong>Data de Registro:</strong> ${new Date().toLocaleDateString('pt-BR')}</li>
                        </ul>
                    </div>

                    <div class="info-box">
                        <h3>Próximos Passos:</h3>
                        <ol>
                            <li>Clique no botão abaixo para ativar sua conta</li>
                            <li>Configure o perfil da sua empresa</li>
                            <li>Adicione seus primeiros usuários</li>
                            <li>Comece a criar seus cursos</li>
                        </ol>
                    </div>

                    <div style="text-align: center;">
                        <a href="${activationLink}" class="button">Ativar minha conta</a>
                    </div>

                    <p><strong>Observação:</strong> Este link é válido por 24 horas. Após este período, você precisará solicitar um novo link de ativação.</p>

                    <div class="info-box">
                        <h3>Precisa de ajuda?</h3>
                        <p>Nossa equipe de suporte está disponível para ajudar:</p>
                        <ul>
                            <li>Email: suporte@lmsportal.com</li>
                            <li>Telefone: (11) 1234-5678</li>
                            <li>Horário: Seg-Sex, 9h às 18h</li>
                        </ul>
                    </div>
                </div>

                <div class="footer">
                    <p>Este é um email automático. Por favor, não responda.</p>
                    <p>LMS Portal &copy; ${new Date().getFullYear()} - Todos os direitos reservados</p>
                    <p>
                        <a href="https://lmsportal.com/privacy">Política de Privacidade</a> | 
                        <a href="https://lmsportal.com/terms">Termos de Uso</a>
                    </p>
                </div>
            </body>
            </html>
        `
    };

    await transporter.sendMail(mailOptions);
};

export const sendLoginAlert = async (email, loginInfo) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '🚨 Alerta de Segurança - Novo Acesso Detectado',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .header {
                        background: #dc2626;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        padding: 20px;
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background: #4f46e5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .info-box {
                        background: white;
                        border: 1px solid #e5e7eb;
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                    }
                    .alert-box {
                        background: #fee2e2;
                        border: 1px solid #ef4444;
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                        color: #991b1b;
                    }
                    .action-button {
                        background: #dc2626;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🚨 Alerta de Segurança</h1>
                </div>
                
                <div class="content">
                    <div class="alert-box">
                        <h2>Detectamos um novo acesso à sua conta</h2>
                        <p>Se não foi você, sua conta pode estar comprometida.</p>
                    </div>

                    <div class="info-box">
                        <h3>Detalhes do Acesso:</h3>
                        <ul>
                            <li><strong>Data:</strong> ${new Date(loginInfo.date).toLocaleString('pt-BR')}</li>
                            <li><strong>IP:</strong> ${loginInfo.ip}</li>
                            <li><strong>Navegador:</strong> ${loginInfo.userAgent}</li>
                            <li><strong>Localização:</strong> ${loginInfo.location || 'Não disponível'}</li>
                        </ul>
                    </div>

                    <div class="info-box">
                        <h3>Ações Recomendadas:</h3>
                        <ol>
                            <li>Altere sua senha imediatamente</li>
                            <li>Ative a autenticação em dois fatores</li>
                            <li>Revise as atividades recentes da sua conta</li>
                            <li>Entre em contato com o suporte se necessário</li>
                        </ol>
                    </div>

                    <div style="text-align: center;">
                        <a href="${process.env.BASE_URL}/change-password" class="button action-button">
                            Alterar Minha Senha
                        </a>
                    </div>
                </div>
                <div class="footer">
                    <p>Este é um email automático. Por favor, não responda.</p>
                    <p>LMS Portal &copy; ${new Date().getFullYear()} - Todos os direitos reservados</p>
                    <p>
                        <a href="${process.env.BASE_URL}/privacy">Política de Privacidade</a> | 
                        <a href="${process.env.BASE_URL}/terms">Termos de Uso</a>
                    </p>
                </div>
            </body>
            </html>
        `
    };
    await transporter.sendMail(mailOptions);
};

export const sendPasswordReset = async (email, resetLink) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Recuperação de Senha - LMS Portal',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .header {
                        background: #4f46e5;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        padding: 20px;
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background: #4f46e5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .info-box {
                        background: white;
                        border: 1px solid #e5e7eb;
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Recuperação de Senha</h1>
                </div>
                
                <div class="content">
                    <div class="info-box">
                        <h2>Olá!</h2>
                        <p>Recebemos uma solicitação para redefinir sua senha.</p>
                        <p>Se você não solicitou esta alteração, ignore este email.</p>
                    </div>

                    <div style="text-align: center;">
                        <a href="${resetLink}" class="button">Redefinir Minha Senha</a>
                    </div>

                    <div class="info-box">
                        <p><strong>Observação:</strong> Este link é válido por 1 hora.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>Este é um email automático. Por favor, não responda.</p>
                    <p>LMS Portal &copy; ${new Date().getFullYear()} - Todos os direitos reservados</p>
                    <p>
                        <a href="${process.env.BASE_URL}/privacy">Política de Privacidade</a> | 
                        <a href="${process.env.BASE_URL}/terms">Termos de Uso</a>
                    </p>
                </div>
            </body>
            </html>
        `
    };
    await transporter.sendMail(mailOptions);
};

export const sendAchievementNotification = async (email, achievement) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '🏆 Nova Conquista Desbloqueada!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .header {
                        background: #f59e0b;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        padding: 20px;
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background: #4f46e5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .info-box {
                        background: white;
                        border: 1px solid #e5e7eb;
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                    }
                    .achievement-box {
                        background: #fef3c7;
                        border: 1px solid #f59e0b;
                        padding: 20px;
                        margin: 15px 0;
                        border-radius: 5px;
                        text-align: center;
                    }
                    .achievement-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🏆 Nova Conquista!</h1>
                </div>
                
                <div class="content">
                    <div class="achievement-box">
                        <div class="achievement-icon">🏆</div>
                        <h2>${achievement.title}</h2>
                        <p>${achievement.description}</p>
                        <p><strong>+${achievement.xpReward} XP</strong></p>
                    </div>

                    <div class="info-box">
                        <h3>Detalhes da Conquista:</h3>
                        <ul>
                            <li><strong>Categoria:</strong> ${achievement.category}</li>
                            <li><strong>Raridade:</strong> ${achievement.rarity}</li>
                            <li><strong>XP Ganho:</strong> ${achievement.xpReward}</li>
                        </ul>
                    </div>

                    <div style="text-align: center;">
                        <a href="${process.env.BASE_URL}/achievements" class="button">
                            Ver Minhas Conquistas
                        </a>
                    </div>
                </div>
                <div class="footer">
                    <p>Este é um email automático. Por favor, não responda.</p>
                    <p>LMS Portal &copy; ${new Date().getFullYear()} - Todos os direitos reservados</p>
                    <p>
                        <a href="${process.env.BASE_URL}/privacy">Política de Privacidade</a> | 
                        <a href="${process.env.BASE_URL}/terms">Termos de Uso</a>
                    </p>
                </div>
            </body>
            </html>
        `
    };
    await transporter.sendMail(mailOptions);
};

export const sendMentorWelcomeEmail = async (email, { name, company }) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '🎓 Bem-vindo ao Time de Mentores!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>${baseEmailStyles}</style>
            </head>
            <body>
                <div class="header" style="background: #0891b2;">
                    <h1>Bem-vindo ao Time de Mentores!</h1>
                </div>
                
                <div class="content">
                    <h2>Olá, ${name}!</h2>
                    
                    <p>Parabéns! Você agora faz parte do time de mentores da ${company}.</p>
                    
                    <div class="info-box">
                        <h3>Próximos Passos:</h3>
                        <ol>
                            <li>Complete seu perfil de mentor</li>
                            <li>Configure sua disponibilidade</li>
                            <li>Revise as diretrizes de mentoria</li>
                            <li>Comece a aceitar sessões</li>
                        </ol>
                    </div>

                    <div class="info-box">
                        <h3>Recursos Importantes:</h3>
                        <ul>
                            <li>Guia do Mentor</li>
                            <li>Melhores Práticas</li>
                            <li>FAQ do Mentor</li>
                            <li>Políticas de Mentoria</li>
                        </ul>
                    </div>

                    <div style="text-align: center;">
                        <a href="${process.env.BASE_URL}/mentor/dashboard" class="button">
                            Acessar Dashboard do Mentor
                        </a>
                    </div>
                </div>
                ${emailFooter}
            </body>
            </html>
        `
    };

    await transporter.sendMail(mailOptions);
};

const baseEmailStyles = `
    body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
    }
    .header {
        background: #4f46e5;
        color: white;
        padding: 20px;
        text-align: center;
        border-radius: 5px 5px 0 0;
    }
    .content {
        padding: 20px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
    }
    .button {
        display: inline-block;
        padding: 12px 24px;
        background: #4f46e5;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        margin: 20px 0;
    }
    .info-box {
        background: white;
        border: 1px solid #e5e7eb;
        padding: 15px;
        margin: 15px 0;
        border-radius: 5px;
    }
`;

const emailFooter = `
    <div class="footer">
        <p>Este é um email automático. Por favor, não responda.</p>
        <p>LMS Portal &copy; ${new Date().getFullYear()} - Todos os direitos reservados</p>
        <p>
            <a href="${process.env.BASE_URL}/privacy">Política de Privacidade</a> | 
            <a href="${process.env.BASE_URL}/terms">Termos de Uso</a>
        </p>
    </div>
`; 