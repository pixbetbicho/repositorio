FROM node:18-slim

WORKDIR /app

# Copiar apenas os arquivos necessários para instalar as dependências
COPY package.json package-lock.json ./

# Instalar TODAS as dependências (incluindo devDependencies)
# Isso garante que pacotes como @vitejs/plugin-react estejam disponíveis
RUN npm install --include=dev

# Depois copiar o restante do código
COPY . .

# Construir a aplicação
RUN npm run build

# Configurar as variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8080

# Expor a porta usada pela aplicação
EXPOSE 8080

# Iniciar a aplicação
CMD ["npm", "start"]