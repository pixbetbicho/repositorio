# Arquivos Individuais para Recuperação Rápida

Estes arquivos representam as partes mais críticas do sistema que podem ser restauradas individualmente em caso de problemas específicos.

## Arquivos Disponíveis

1. **db.ts**
   - Contém a configuração de conexão com banco de dados
   - Funciona tanto no Replit quanto na DigitalOcean
   - Implementa detecção automática de ambiente

2. **app.json**
   - Configuração para deploy na DigitalOcean
   - Inclui variáveis de ambiente necessárias para produção

3. **schema.ts**
   - Define o esquema do banco de dados
   - Contém todas as tabelas, relações e tipos

4. **storage.ts**
   - Interface para acesso ao banco de dados
   - Implementa todos os métodos de CRUD

5. **auth.ts**
   - Sistema de autenticação
   - Gerencia login, logout e sessões

## Como Usar para Recuperação

### Para problemas de conexão com banco de dados:
1. Restaurar `db.ts`
2. Reiniciar a aplicação

### Para problemas com deploy:
1. Restaurar `app.json`
2. Refazer o deploy

### Para problemas com autenticação:
1. Restaurar `auth.ts`
2. Reiniciar a aplicação

### Para problemas gerais de funcionalidade:
Recomenda-se usar o arquivo de rollback completo `rollback_99_percent_2025-05-08.tar.gz` em vez de tentar recuperar arquivos individuais.

## Data do Backup

08/05/2025