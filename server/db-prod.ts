// Configuração de conexão com banco de dados para PRODUÇÃO
// Usando cliente pg padrão para evitar problemas com WebSockets no DigitalOcean

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

// Verificar disponibilidade da URL do banco de dados
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for production environment');
}

console.log('🔄 PRODUÇÃO: Usando cliente pg padrão em vez de @neondatabase/serverless');

// Configuração do pool com parâmetros específicos para produção
const connectionString = process.env.DATABASE_URL;
console.log(`URL de conexão (ofuscada): ${connectionString.replace(/:[^:]*@/, ':***@')}`);

// Configuração otimizada para produção
const poolConfig = {
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10, // limitar número de conexões
  connectionTimeoutMillis: 10000, // 10 segundos
  idleTimeoutMillis: 30000, // 30 segundos
  keepAlive: false // evitar problemas com websockets persistentes
};

// Criação do pool para PostgreSQL padrão
export const pool = new Pool(poolConfig);

// Configurar listener de erro para o pool
pool.on('error', (err: any) => {
  console.error('Erro inesperado no pool de conexão:', err?.message || 'Erro desconhecido');
});

// Testar conexão com o banco
console.log('Testando conexão com o banco de dados em PRODUÇÃO...');
pool.query('SELECT current_database() as db_name, current_user as db_user')
  .then((result: any) => {
    console.log('✅ Conexão bem-sucedida!');
    console.log(`Database: ${result.rows[0].db_name}, User: ${result.rows[0].db_user}`);
  })
  .catch((err: any) => {
    console.error('❌ Falha na conexão com o banco de dados!');
    console.error(`Erro: ${err.message}`);
  });

// Criação e exportação da instância do Drizzle ORM
export const db = drizzle(pool, { schema });