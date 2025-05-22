#!/bin/bash

# Script para facilitar o deploy no DigitalOcean App Platform

# Cores para output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

echo -e "${YELLOW}=== Script de Deploy para DigitalOcean App Platform ===${NC}\n"

# Verifica se git está instalado
if ! command -v git &> /dev/null; then
    echo "Git não encontrado. Por favor, instale o Git primeiro."
    exit 1
fi

# Verifica se estamos em um repositório git
if [ ! -d .git ]; then
    echo "Este diretório não é um repositório Git. Execute 'git init' primeiro."
    exit 1
fi

# Pede confirmação antes de continuar
echo -e "Este script irá preparar seu projeto para deploy no DigitalOcean App Platform.\n"
echo -e "Certifique-se de que você já criou um repositório no GitHub e um banco de dados no DigitalOcean.\n"
read -p "Continuar? (s/n): " choice

if [ "$choice" != "s" ] && [ "$choice" != "S" ]; then
    echo "Operação cancelada pelo usuário."
    exit 0
fi

# Verifica se o arquivo app.json existe
if [ ! -f app.json ]; then
    echo "O arquivo app.json não foi encontrado. Este arquivo é necessário para configurar o App Platform."
    exit 1
fi

# Verifica se o endpoint de saúde está respondendo
echo -e "\n${YELLOW}Verificando se o endpoint de saúde está respondendo...${NC}"

# Verifica se o servidor está rodando
server_running=false
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Endpoint de saúde está respondendo!${NC}"
    server_running=true
else
    echo -e "${YELLOW}! Servidor não está rodando ou endpoint de saúde não está respondendo.${NC}"
    echo -e "  Isso não é um problema para o deploy, mas é recomendado testar localmente antes."
fi

# Adiciona todos os arquivos modificados ao Git
echo -e "\n${YELLOW}Adicionando arquivos ao Git...${NC}"
git add .

# Commit das mudanças
echo -e "\n${YELLOW}Commitando mudanças...${NC}"
read -p "Mensagem de commit (padrão: 'Preparação para deploy'): " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="Preparação para deploy"
fi

git commit -m "$commit_msg"

# Push para o GitHub
echo -e "\n${YELLOW}Enviando para o GitHub...${NC}"
read -p "Nome da branch (padrão: 'main'): " branch_name

if [ -z "$branch_name" ]; then
    branch_name="main"
fi

git push origin "$branch_name"

# Informações finais
echo -e "\n${GREEN}=== Preparação para deploy concluída! ===${NC}\n"
echo -e "Próximos passos:"
echo -e "1. Acesse o DigitalOcean App Platform: https://cloud.digitalocean.com/apps"
echo -e "2. Clique em 'Create App'"
echo -e "3. Conecte-se ao seu repositório GitHub"
echo -e "4. Na configuração do App Platform, selecione 'Use a Dockerfile' nas opções avançadas"
echo -e "5. Configure as variáveis de ambiente conforme o arquivo DEPLOY_APP_PLATFORM.md"
echo -e "6. Vincule seu banco de dados existente"
echo -e "7. Clique em 'Launch App'"
echo -e "\nIMPORTANTE: Certifique-se de selecionar 'Use a Dockerfile' para resolver o problema"
echo -e "do pacote @vitejs/plugin-react. Mais detalhes no arquivo DEPLOY_APP_PLATFORM.md."
echo -e "\nBom deploy! 🚀\n"
