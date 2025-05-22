# Instruções para Rollback do Projeto

Este documento explica como restaurar o projeto a partir dos pontos de rollback em caso de problemas.

## Rollback Criado em 08/05/2025

Arquivo: `rollback_99_percent_2025-05-08.tar.gz`

Este rollback representa o projeto com 99% das funcionalidades implementadas e funcionando, incluindo:
- Conexão estável com banco de dados no Replit e DigitalOcean
- Interface administrativa completa
- Sistema de apostas funcional
- Gerenciamento de sorteios e animais
- Sistema de pagamentos operacional

### Procedimento de Rollback

Para restaurar o projeto a partir deste ponto:

1. Se estiver usando Replit:
```bash
# Descompacte o arquivo de rollback
tar -xzvf rollbacks/rollback_99_percent_2025-05-08.tar.gz -C /tmp

# Restaure os arquivos críticos
cp -f /tmp/server/db.ts server/
cp -f /tmp/app.json ./

# Reinicie o aplicativo
```

2. Se estiver usando DigitalOcean:
   - Faça upload do arquivo de rollback para o servidor
   - Descompacte o arquivo
   - Substitua os arquivos atuais pelos do backup
   - Reinicie o aplicativo

### Arquivos Críticos

Os arquivos mais importantes que podem precisar de restauração individual são:
- `server/db.ts`: Configuração de conexão com banco de dados
- `app.json`: Configuração de deploy para DigitalOcean
- `server/storage.ts`: Interface com o banco de dados
- `shared/schema.ts`: Esquema do banco de dados

## Notas Importantes

1. O rollback inclui a configuração completa para funcionar em ambos os ambientes (Replit e DigitalOcean).
2. As credenciais do banco de dados são armazenadas nas variáveis de ambiente e não são incluídas no rollback.
3. Após o rollback, é recomendável verificar o estado do banco de dados para garantir que os dados estão consistentes.
4. Em caso de problemas pós-rollback, verifique os logs para identificar possíveis erros.