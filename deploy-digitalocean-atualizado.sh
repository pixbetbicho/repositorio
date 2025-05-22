#!/bin/bash

# Script de deploy atualizado para DigitalOcean App Platform
# Este script simplificado prepara e faz deploy do aplicativo para o DigitalOcean App Platform

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando processo de deploy para DigitalOcean...${NC}"

# Verificar se as credenciais do DigitalOcean estão configuradas
if [ -z "$DIGITALOCEAN_ACCESS_TOKEN" ]; then
  echo -e "${RED}ERRO: DIGITALOCEAN_ACCESS_TOKEN não encontrado${NC}"
  echo "Por favor, configure o token de acesso do DigitalOcean:"
  echo "export DIGITALOCEAN_ACCESS_TOKEN=seu_token_aqui"
  exit 1
fi

# Verificar se o nome da aplicação está definido
APP_NAME=${APP_NAME:-"jogo-do-bicho-app"}
echo -e "${GREEN}Nome da aplicação: ${APP_NAME}${NC}"

# Construir a aplicação
echo -e "${YELLOW}Construindo a aplicação...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}ERRO: Falha ao construir a aplicação${NC}"
  exit 1
fi

echo -e "${GREEN}Aplicação construída com sucesso!${NC}"

# Deploy para DigitalOcean App Platform
echo -e "${YELLOW}Realizando deploy para DigitalOcean App Platform...${NC}"
doctl apps create --spec app.json --access-token $DIGITALOCEAN_ACCESS_TOKEN

if [ $? -ne 0 ]; then
  echo -e "${RED}ERRO: Falha ao criar aplicação no DigitalOcean${NC}"
  echo -e "${YELLOW}Tentando atualizar aplicação existente...${NC}"
  
  # Obter ID da aplicação
  APP_ID=$(doctl apps list --access-token $DIGITALOCEAN_ACCESS_TOKEN --format ID --no-header | grep -i $APP_NAME | head -n 1)
  
  if [ -z "$APP_ID" ]; then
    echo -e "${RED}ERRO: Não foi possível encontrar a aplicação existente${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Aplicação encontrada com ID: ${APP_ID}${NC}"
  
  # Atualizar aplicação
  doctl apps update $APP_ID --spec app.json --access-token $DIGITALOCEAN_ACCESS_TOKEN
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}ERRO: Falha ao atualizar aplicação no DigitalOcean${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Deploy realizado com sucesso!${NC}"

# Exibir URL da aplicação
echo -e "${YELLOW}Obtendo informações da aplicação...${NC}"
APP_ID=$(doctl apps list --access-token $DIGITALOCEAN_ACCESS_TOKEN --format ID --no-header | grep -i $APP_NAME | head -n 1)

if [ -n "$APP_ID" ]; then
  APP_URL=$(doctl apps get $APP_ID --access-token $DIGITALOCEAN_ACCESS_TOKEN --format DefaultIngress --no-header)
  echo -e "${GREEN}Aplicação disponível em: ${APP_URL}${NC}"
  
  # Instruções pós-deploy
  echo ""
  echo -e "${YELLOW}IMPORTANTE: Próximos passos${NC}"
  echo "1. Aguarde alguns minutos para a aplicação ficar disponível"
  echo "2. Acesse a URL: ${APP_URL}/api/reset-database para inicializar o banco de dados"
  echo "3. LEMBRE-SE de remover ou proteger esta rota após o uso inicial"
  echo ""
else
  echo -e "${RED}AVISO: Não foi possível obter a URL da aplicação${NC}"
  echo "Verifique manualmente no painel do DigitalOcean App Platform"
fi

echo -e "${GREEN}Processo de deploy concluído!${NC}"