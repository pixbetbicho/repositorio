#!/bin/bash
# Script simples para deploy no DigitalOcean

# Cores para mensagens
VERDE='\033[0;32m'
AMARELO='\033[1;33m'
VERMELHO='\033[0;31m'
NC='\033[0m' # Sem cor

echo -e "${AMARELO}Iniciando deploy simples para DigitalOcean...${NC}"

# 1. Construir a aplicação
echo -e "${AMARELO}Construindo a aplicação...${NC}"
npm run build

# Verificar se a construção foi bem-sucedida
if [ $? -ne 0 ]; then
  echo -e "${VERMELHO}Erro ao construir a aplicação!${NC}"
  exit 1
fi

echo -e "${VERDE}Aplicação construída com sucesso!${NC}"

# 2. Verificar se temos o token do DigitalOcean
if [ -z "$DIGITALOCEAN_ACCESS_TOKEN" ]; then
  echo -e "${VERMELHO}DIGITALOCEAN_ACCESS_TOKEN não encontrado!${NC}"
  echo "Execute este comando antes de tentar novamente:"
  echo "export DIGITALOCEAN_ACCESS_TOKEN=seu_token_aqui"
  exit 1
fi

# 3. Nome da aplicação (padrão se não for fornecido)
APP_NAME=${APP_NAME:-"jogo-do-bicho-app"}
echo -e "${VERDE}Nome da aplicação: ${APP_NAME}${NC}"

# 4. Fazer deploy para o DigitalOcean
echo -e "${AMARELO}Enviando aplicação para o DigitalOcean...${NC}"
doctl apps create --spec app.json

# Se falhar, tentar atualizar a aplicação existente
if [ $? -ne 0 ]; then
  echo -e "${AMARELO}App já existe, tentando atualizar...${NC}"
  
  # Obter ID da aplicação
  APP_ID=$(doctl apps list --format ID --no-header | head -n 1)
  
  if [ -z "$APP_ID" ]; then
    echo -e "${VERMELHO}Não foi possível encontrar o ID da aplicação!${NC}"
    exit 1
  fi
  
  # Atualizar a aplicação
  doctl apps update $APP_ID --spec app.json
  
  if [ $? -ne 0 ]; then
    echo -e "${VERMELHO}Falha ao atualizar aplicação!${NC}"
    exit 1
  fi
fi

echo -e "${VERDE}Deploy concluído com sucesso!${NC}"
echo ""
echo -e "${AMARELO}IMPORTANTE: Após o deploy, acesse:${NC}"
echo "https://sua-app.ondigitalocean.app/api/reset-database"
echo "Esta URL inicializa o banco de dados. Acesse apenas UMA VEZ!"
echo ""
echo -e "${VERDE}Sua aplicação estará disponível em alguns minutos.${NC}"

# Tornar o script executável
chmod +x deploy-simples.sh