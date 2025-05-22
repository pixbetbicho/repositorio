#!/bin/bash

# Script de deploy para DigitalOcean
echo "Iniciando deploy para DigitalOcean..."

# Definir variáveis de ambiente
echo "Configurando variáveis de ambiente..."
cat > .env << EOL
DATABASE_URL=postgres://dbnovobicho:AVNS_Viy3ObhvZqKE1zrKQWX@app-f83e6f0f-1f27-4089-8a14-7bc1ea2c2ab3-do-user-21865989-0.k.db.ondigitalocean.com:25060/dbnovobicho?sslmode=require
PGUSER=dbnovobicho
PGPASSWORD=AVNS_Viy3ObhvZqKE1zrKQWX
PGDATABASE=dbnovobicho
PGHOST=app-f83e6f0f-1f27-4089-8a14-7bc1ea2c2ab3-do-user-21865989-0.k.db.ondigitalocean.com
PGPORT=25060

# Variáveis de aplicação
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-session-secret-a41dae4b88ab404a8e6
EOL

# Instalar dependências
echo "Instalando dependências..."
npm ci --only=production

# Executar migrações do banco de dados
echo "Executando migrações de banco de dados..."
npm run db:push

# Construir o front-end
echo "Construindo a aplicação frontend..."
npm run build

# Iniciar o servidor em modo produção
echo "Iniciando o servidor..."
npm run start
