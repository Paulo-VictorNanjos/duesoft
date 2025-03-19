# Lista de Arquivos para Upload na Hostinger

Estes são os arquivos e pastas essenciais que você precisa fazer upload para a Hostinger:

## Arquivos de Configuração
- `.env.hostinger` (Renomeie para `.env` após o upload)
- `ecosystem.config.js` (Configuração do PM2, se a Hostinger suportar)
- `package.json` (Informações sobre o projeto e dependências)
- `package-lock.json` (Versões exatas das dependências)
- `healthcheck.js` (Script para verificar a saúde da aplicação)

## Pastas Principais
- `controllers/` (Controladores da aplicação)
- `models/` (Modelos de dados MongoDB)
- `views/` (Arquivos de visualização EJS)
- `public/` (Arquivos estáticos: CSS, JS, imagens)
- `routes/` (Rotas da aplicação)
- `middlewares/` (Middlewares da aplicação)
- `services/` (Serviços da aplicação)
- `utils/` (Utilitários da aplicação)
- `config/` (Configurações da aplicação)
- `scripts/` (Scripts utilitários)

## Arquivos Principais
- `app.js` (Arquivo principal da aplicação)
- `HOSTINGER_SETUP.md` (Instruções detalhadas para configuração)

## Arquivos Opcionais (Dependendo das Configurações da Hostinger)
- `node_modules/` (Se não for possível instalar via npm na Hostinger)

## Arquivos a Serem Ignorados
- `.git/` (Pasta de controle de versão Git)
- `tests/` (Testes automatizados)
- `coverage/` (Relatórios de cobertura de testes)
- `.github/` (Configurações do GitHub)
- `deploy.sh` (Script de implantação para SSH)
- `.env` (Arquivo de ambiente local - use o .env.hostinger em seu lugar)
- `testConnection.js` (Script de teste local)
- `initDatabase.js` (Script de inicialização local)
- `UPLOAD_FILES_LIST.md` (Esta lista de arquivos)

## Método de Upload Recomendado

1. Crie um arquivo .zip contendo todos os arquivos e pastas necessários
2. Exclua os arquivos e pastas a serem ignorados antes de criar o .zip
3. Faça upload do arquivo .zip através do Gerenciador de Arquivos da Hostinger
4. Extraia o arquivo .zip na pasta raiz da aplicação
5. Renomeie `.env.hostinger` para `.env`
6. Configure as variáveis específicas (domínio, etc.) conforme necessário

## Lista de Verificação Pós-Upload

1. Arquivos e pastas essenciais estão presentes
2. Arquivo `.env` está configurado corretamente
3. Dependências estão instaladas
4. Configuração do domínio está correta
5. MongoDB Atlas está configurado com o IP da Hostinger 