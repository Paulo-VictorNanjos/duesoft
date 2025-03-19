# 📚 Portal do Estudante / LMS DUESOFT

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Ready-brightgreen.svg)](https://www.mongodb.com/)

> Uma plataforma de aprendizado moderna e gamificada, desenvolvida com Node.js, Express e EJS.

![Portal do Estudante Banner](https://via.placeholder.com/800x400?text=Portal+do+Estudante)

## ✨ Destaques

- 🔐 **Sistema Robusto de Autenticação** - JWT, proteção de rotas e níveis de acesso
- 📚 **Gestão Completa de Cursos** - Módulos hierárquicos e tracking de progresso
- 📝 **Sistema Avançado de Provas** - Timer, anti-fraude e correção automática
- 🎮 **Gamificação Integrada** - Sistema de XP, rankings e achievements
- 📱 **Design Responsivo** - Interface moderna com Bootstrap
- 🎯 **Progressão por Níveis** - Sistema de categorias (Júnior, Pleno, Sênior)

## 🚀 Funcionalidades Principais

### 🎓 Sistema de Cursos
- Organização hierárquica de módulos e lições
- Acompanhamento automático de progresso
- Certificados de conclusão
- Player de vídeo-aulas integrado

### 📋 Sistema de Provas
- Múltiplas tentativas configuráveis
- Timer com controle de tempo
- Sistema anti-fraude com detecção de saída da tela
- Feedback imediato e relatórios detalhados

### ⭐ Sistema de Experiência (XP)
- Base de 1000 XP por aprovação
- Bônus por desempenho excepcional
- Categorias de progressão:
  - 🌱 Júnior (0 - 19.999 XP)
  - 🌿 Pleno (20.000 - 49.999 XP)
  - 🌳 Sênior (50.000+ XP)

### 👑 Interface Administrativa
- Dashboard analítico
- Gerenciamento de conteúdo
- Estatísticas em tempo real
- Controle total do sistema

## 🛠️ Tecnologias

- Node.js
- Express
- MongoDB
- EJS
- JWT
- Bootstrap

## ⚙️ Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/portal-do-estudante.git
cd portal-do-estudante
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o ambiente**
```bash
cp .env.example .env
```

4. **Configure as variáveis de ambiente no arquivo .env**
```
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/student-portal2
JWT_SECRET=your-secret-key
```

5. **Inicie o servidor**
```bash
npm start
```

## 🗺️ Roadmap

- [x] Sistema de notificações (90%)
- [x] Chat entre alunos e professores
- [ ] Fórum de discussão
- [x] Sistema de achievements
- [ ] Integração com plataformas de vídeo
- [ ] API para integração externa
- [ ] Sistema de pagamentos
- [ ] Sistema de licenças relacional sistema de pagamentos
- [x] Relatórios avançados (40%)
- [ ] Gamificação expandida
- [ ] Sistema de mentoria
- [ ] Área de perfil aprimorada
- [ ] feedback no dashboard referente a prova realizada, com pontuação, acertos e erros. 	

## 🤝 Contribuição

Contribuições são sempre bem-vindas! Confira nosso guia de contribuição para começar.

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Desenvolvido por

FOX-DESIGNER AND SOFTWARES

---

<p align="center">
  Feito com ❤️ para a comunidade de desenvolvedores
</p>