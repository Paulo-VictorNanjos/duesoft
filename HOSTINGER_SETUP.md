# Instruções de Configuração na Hostinger

Este documento contém instruções passo a passo sobre como configurar esta aplicação Node.js na Hostinger, mantendo suas configurações originais.

## 1. Requisitos do Plano

Verifique se seu plano da Hostinger inclui:
- Suporte a Node.js
- Painel de controle com gerenciamento de aplicações Node.js

## 2. Preparação no Painel da Hostinger

1. Faça login no painel de controle da Hostinger (hPanel)
2. Vá para a seção "Websites" ou "Hospedagem"
3. Selecione seu domínio
4. Procure uma opção como "Node.js" ou "Aplicativos Node.js" ou "Gerenciador de aplicativos"

## 3. Configuração da Aplicação Node.js

1. Clique em "Criar Nova Aplicação" ou opção similar
2. Configure a aplicação:
   - Nome: duesoft
   - Versão do Node.js: 18.x (ou mais recente)
   - Domínio: Seu domínio ou subdomínio
   - Diretório: /public_html (ou o que for recomendado)
   - Porta: 3000 (a mesma do arquivo .env.hostinger)
   - Arquivo principal: app.js
   - Comando de inicialização: npm start

## 4. Upload dos Arquivos

1. No painel da Hostinger, acesse o "Gerenciador de Arquivos"
2. Navegue até a pasta raiz da sua aplicação (geralmente /public_html)
3. Faça upload de todos os arquivos deste projeto, exceto:
   - node_modules (instalaremos separadamente)
   - .git
   - arquivos de teste e arquivos temporários

## 5. Instalação das Dependências

1. Se houver uma opção de "Terminal" ou "Console" no painel da Hostinger:
   - Navegue até o diretório da sua aplicação
   - Execute: `npm install --production`
2. Caso contrário:
   - Faça upload da pasta node_modules completa

## 6. Configuração do Arquivo .env

1. Crie um arquivo .env no diretório raiz através do Gerenciador de Arquivos
2. Copie o conteúdo do arquivo .env.hostinger fornecido
3. Ajuste as seguintes configurações:
   - DOMAIN: Substitua "seudominiohostinger.com" pelo seu domínio real
   - GOOGLE_REDIRECT_URI: Atualize para usar seu domínio real
   - Verifique outras configurações específicas para o ambiente de produção

## 7. Iniciar a Aplicação

1. No painel de gerenciamento de aplicações Node.js da Hostinger
2. Localize sua aplicação "duesoft"
3. Clique em "Iniciar" ou "Start"
4. Verifique os logs para garantir que a aplicação está funcionando

## 8. Configuração de Domínio/Subdomínio

1. No painel da Hostinger, vá para "Domínios" ou "Gerenciamento de Domínios"
2. Configure seu domínio para apontar para a aplicação Node.js
3. Ative o SSL para seu domínio (recomendado para segurança)

## 9. Verificação

1. Acesse seu domínio em um navegador web
2. Verifique se a aplicação carrega corretamente
3. Teste o login com suas credenciais

## 10. Verificação de Saúde do Sistema

Depois de configurar tudo:

1. Acesse o Terminal/Console da Hostinger (se disponível)
2. Execute: `npm run healthcheck`
3. Verifique os resultados para garantir que tudo está funcionando corretamente

## Solução de Problemas

Se a aplicação não funcionar:
1. Verifique os logs da aplicação no painel
2. Confirme se as variáveis de ambiente estão configuradas corretamente
3. Verifique se o MongoDB Atlas está acessível (o IP da Hostinger pode precisar ser adicionado à lista de IPs permitidos no MongoDB Atlas)
4. Verifique se o Node.js está devidamente configurado com a versão correta

## Adicionar IP da Hostinger ao MongoDB Atlas

1. Descubra o IP da sua hospedagem (geralmente você pode ver isso nos logs ou no painel da Hostinger)
2. Acesse o MongoDB Atlas
3. Vá para "Network Access"
4. Adicione o IP da Hostinger à lista de IPs permitidos

## Contato
Se precisar de ajuda adicional, entre em contato através do GitHub: https://github.com/Paulo-VictorNanjos/duesoft 