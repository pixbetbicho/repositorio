# Guia Simplificado para Deploy no DigitalOcean

Este guia fornece instruções passo-a-passo para implantar seu Jogo do Bicho no DigitalOcean, mesmo se você é iniciante em programação.

## Pré-requisitos

1. Tenha uma conta no [DigitalOcean](https://www.digitalocean.com/)
2. Instale o CLI do DigitalOcean (doctl) seguindo as [instruções oficiais](https://docs.digitalocean.com/reference/doctl/how-to/install/)

## Passo 1: Obter o Token do DigitalOcean

1. Acesse [API > Tokens](https://cloud.digitalocean.com/account/api/tokens) no DigitalOcean
2. Clique em "Generate New Token"
3. Dê um nome como "Deploy Token" e clique em "Generate Token"
4. Copie o token gerado (você só poderá vê-lo uma vez)

## Passo 2: Configurar seu ambiente local

Abra o terminal e execute:

```bash
# Configurar token do DigitalOcean (substitua seu_token_aqui pelo token copiado)
export DIGITALOCEAN_ACCESS_TOKEN=seu_token_aqui

# (Opcional) Definir nome da aplicação
export APP_NAME=jogo-do-bicho-app
```

## Passo 3: Personalizar arquivos de configuração

1. Edite o arquivo `app.json`:
   - Altere o `SESSION_SECRET` para uma string longa e aleatória
   - Você pode modificar o tamanho da instância se quiser (`instance_size_slug`)

## Passo 4: Fazer o deploy

Execute o script simplificado:

```bash
# Tornar o script executável (apenas na primeira vez)
chmod +x deploy-simples.sh

# Executar o script
./deploy-simples.sh
```

## Passo 5: Inicializar o banco de dados

Após o deploy concluído:

1. Acesse a URL da sua aplicação (algo como `https://jogo-do-bicho-app-xxxx.ondigitalocean.app`)
2. Adicione `/api/reset-database` ao final da URL para inicializar o banco de dados
3. Este passo deve ser feito apenas UMA VEZ após o primeiro deploy

## O que fazer se tiver problemas?

### Se o deploy falhar:

1. Verifique se o token do DigitalOcean está correto
2. Confirme se o CLI do DigitalOcean está instalado corretamente

### Se a aplicação não conectar ao banco de dados:

1. Verifique se inicializou o banco de dados conforme o Passo 5
2. Tente reiniciar a aplicação no painel do DigitalOcean

### Se precisar de logs:

1. Acesse o painel do DigitalOcean > Apps > sua_aplicação
2. Clique em "Console" para ver logs em tempo real

## Atualizar a aplicação

Para atualizar sua aplicação após fazer mudanças:

1. Execute novamente o script de deploy:
   ```bash
   ./deploy-simples.sh
   ```

2. NÃO acesse a URL de inicialização do banco de dados novamente, a menos que queira reiniciar todos os dados.