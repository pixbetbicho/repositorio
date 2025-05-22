
/**
 * Configuração do PostgreSQL otimizada para DigitalOcean
 * Solução para problemas de conexão em diferentes ambientes
 */

import * as schema from '../shared/schema';
import ws from 'ws';
import pg from 'pg';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';

// Verificar se DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não está configurado nas variáveis de ambiente!');
}

// Detectar ambiente
const isProduction = process.env.NODE_ENV === 'production';
const isReplit = !!process.env.REPL_ID || !!process.env.REPL_SLUG;

console.log(`Ambiente detectado: ${isProduction ? 'PRODUÇÃO' : isReplit ? 'REPLIT' : 'DESENVOLVIMENTO LOCAL'}`);

let pool;

if (isProduction) {
  // AMBIENTE DE PRODUÇÃO (DigitalOcean)
  console.log('Usando conexão PostgreSQL padrão otimizada para produção');
  
  // Configuração crítica para o DigitalOcean
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  // Usar pg padrão em produção
  const { Pool } = pg;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
      // Desabilitar todas as verificações de SSL
      checkServerIdentity: () => undefined
    },
    // Aumentar timeouts
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });
} else {
  // AMBIENTE DE DESENVOLVIMENTO (Replit ou Local)
  console.log('Usando conexão WebSocket para desenvolvimento');
  
  // Configurar WebSocket para o driver Neon
  neonConfig.webSocketConstructor = ws;
  
  // Criar pool com Neon para ambiente de desenvolvimento
  pool = new NeonPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// Criar instância do Drizzle ORM com tratamento para diferentes tipos de pool
export const db = isProduction 
  ? drizzlePg(pool, { schema })    // Usar driver node-postgres para produção 
  : drizzleNeon(pool, { schema }); // Usar driver neon para desenvolvimento

// Tratamento de erros básico
pool.on('error', (err) => {
  console.error('Erro na conexão com banco de dados:', err);
});

// Testar conexão
console.log('Testando conexão com banco de dados...');
pool.query('SELECT NOW() as time')
  .then(result => console.log(`✅ Banco de dados conectado com sucesso às ${result.rows[0].time}`))
  .catch(err => {
    console.error('❌ Erro na conexão com banco de dados:', err.message);
    if (err.stack) console.error('Detalhes do erro:', err.stack);
  });

// Exportar pool para uso em outros módulos
export { pool };
