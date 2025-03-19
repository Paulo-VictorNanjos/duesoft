#!/bin/bash

# Script de implantação para Hostinger
# Use: bash deploy.sh seu_usuario@seudominio.com

if [ -z "$1" ]; then
  echo "Erro: Você precisa fornecer o endereço SSH da Hostinger."
  echo "Uso: bash deploy.sh seu_usuario@seudominio.com"
  exit 1
fi

SSH_ADDRESS=$1
REMOTE_DIR="~/domains/$(echo $SSH_ADDRESS | cut -d@ -f2)/public_html"

echo "===== Preparando para implantação ====="
echo "Endereço SSH: $SSH_ADDRESS"
echo "Diretório remoto: $REMOTE_DIR"

# Verifica se o arquivo .env.production existe
if [ ! -f ".env.production" ]; then
  echo "ERRO: Arquivo .env.production não encontrado!"
  echo "Por favor, crie o arquivo .env.production antes de continuar."
  exit 1
fi

# Criando arquivo de versão
echo "$(date +%Y%m%d%H%M%S)" > version.txt
git add version.txt
git commit -m "Atualização de versão para implantação"
git push origin main

echo "===== Iniciando implantação ====="

# Conectando via SSH e executando comandos remotos
ssh $SSH_ADDRESS << EOF
  echo "===== Conectado ao servidor remoto ====="
  
  # Verificar se o diretório existe
  if [ ! -d $REMOTE_DIR ]; then
    echo "Diretório $REMOTE_DIR não existe. Criando..."
    mkdir -p $REMOTE_DIR
  fi
  
  cd $REMOTE_DIR
  
  # Se for a primeira implantação, clone o repositório
  if [ ! -d ".git" ]; then
    echo "===== Primeira implantação: Clonando repositório ====="
    # Backup de qualquer conteúdo existente
    if [ "$(ls -A)" ]; then
      mkdir -p ~/backup_before_deploy
      cp -r * ~/backup_before_deploy/
      rm -rf *
    fi
    
    git clone https://github.com/Paulo-VictorNanjos/duesoft.git .
  else
    echo "===== Repositório já existe: Atualizando código ====="
    git pull origin main
  fi
  
  echo "===== Instalando dependências ====="
  npm install --production
  
  # Copiar arquivo de ambiente de produção se não existir
  if [ ! -f ".env" ] || [ ".env.production" -nt ".env" ]; then
    echo "===== Configurando variáveis de ambiente ====="
    cp .env.production .env
  fi
  
  # Verificar se o PM2 está instalado
  if ! command -v pm2 &> /dev/null; then
    echo "===== Instalando PM2 ====="
    npm install -g pm2
  fi
  
  echo "===== Iniciando/Reiniciando aplicação ====="
  pm2 describe duesoft > /dev/null
  if [ $? -eq 0 ]; then
    # A aplicação já está rodando, reinicie
    pm2 restart duesoft
  else
    # A aplicação não está rodando, inicie
    pm2 start ecosystem.config.js --env production
    pm2 startup
    pm2 save
  fi
  
  echo "===== Implantação concluída com sucesso! ====="
  echo "Para verificar status: pm2 status"
  echo "Para ver logs: pm2 logs duesoft"
EOF

echo "===== Script de implantação finalizado =====" 