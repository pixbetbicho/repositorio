
/**
 * Configuração do PostgreSQL otimizada para Replit e DigitalOcean
 * Solução específica para problemas de conexão em diferentes ambientes
 */

import * as schema from '../shared/schema';
import ws from 'ws';
import pg from 'pg';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';

// Configurações globais de ambiente
export const isProduction = process.env.NODE_ENV === 'production';
export const isReplit = process.env.REPL_ID !== undefined;
export const isLocalDev = !isProduction && !isReplit;

// Verificar conexão de banco de dados
if (!process.env.DATABASE_URL) {
  throw new Error('🚨 ERRO CRÍTICO: DATABASE_URL não está configurado! A aplicação não funcionará corretamente.');
}

// Log de início da inicialização
console.log('======== INICIALIZAÇÃO DO BANCO DE DADOS ========');
console.log(`🌎 Ambiente: ${isProduction ? 'PRODUÇÃO' : isReplit ? 'REPLIT' : 'DESENVOLVIMENTO LOCAL'}`);
console.log(`🔌 URL do banco: ${process.env.DATABASE_URL.substring(0, 20)}...`);

// Declarar variáveis de conexão
let pool;
let db;

// Função de inicialização com tratamento específico por ambiente
function initializeConnection() {
  try {
    if (isReplit) {
      // ---- REPLIT: USE NEON COM WEBSOCKET SEM FALLBACK ----
      console.log('🔧 REPLIT: Usando driver Neon com WebSocket');
      
      // Configuração especial para o Replit
      neonConfig.webSocketConstructor = ws;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Necessário para SSL no Replit
      
      // Parâmetros otimizados para Replit
      pool = new NeonPool({
        connectionString: process.env.DATABASE_URL,
        ssl: true,
        max: 3, // Conexões limitadas no Replit
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000
      });
      
      // Criar instância do Drizzle para Replit
      console.log('🔄 Criando instância Drizzle com driver Neon...');
      db = drizzleNeon(pool, { schema });
      console.log('✅ Driver Neon inicializado com sucesso para Replit');
    }
    else if (isProduction) {
      // ---- PRODUÇÃO: USE PG PADRÃO COM SSL RELAXADO ----
      console.log('🔧 PRODUÇÃO: Usando driver PostgreSQL padrão');
      
      // Produção precisa desabilitar verificações de SSL
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      // Pool otimizado para produção
      pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined // Ignora verificações de identidade do servidor
        },
        max: 15, // Mais conexões para produção
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        statement_timeout: 30000,
        query_timeout: 30000,
        application_name: 'jogo-do-bicho-production'
      });
      
      // Criar instância do Drizzle para produção
      console.log('🔄 Criando instância Drizzle com driver PostgreSQL...');
      db = drizzlePg(pool, { schema });
      console.log('✅ Driver PostgreSQL inicializado com sucesso para produção');
    }
    else {
      // ---- DESENVOLVIMENTO LOCAL: TENTA AMBOS OS MÉTODOS ----
      console.log('🔧 DEV LOCAL: Tentando driver PostgreSQL');
      
      // Primeiro tenta driver padrão PostgreSQL
      pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false,
        max: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000
      });
      
      // Criar instância do Drizzle para dev local
      console.log('🔄 Criando instância Drizzle com driver PostgreSQL...');
      db = drizzlePg(pool, { schema });
      console.log('✅ Driver PostgreSQL inicializado com sucesso para desenvolvimento local');
    }
    
    // Handler global de erro para o pool
    pool.on('error', (err) => {
      console.error('⚠️ Erro na conexão com o pool:', err.message);
      // Não encerrar o aplicativo, apenas log
    });
    
    // Retornar referências
    return { pool, db };
  } 
  catch (error) {
    console.error('🔥 ERRO FATAL na inicialização do banco:', error);
    
    // Prover uma implementação alternativa minimalista para que a aplicação continue
    console.warn('⚠️ Usando implementação minimalista de emergência. A funcionalidade será limitada.');
    
    // Criar um pool mínimo
    const minimalPool = {
      query: async () => { 
        console.warn('🚨 Tentativa de acesso ao banco com conexão falha');
        return { rows: [] }; 
      },
      on: () => {},
      connect: async () => {
        throw new Error('Conexão com banco indisponível');
      }
    };
    
    // Criar uma instância minimalista de db
    const minimalDb = {
      select: () => ({ from: () => ({ where: () => [] }) }),
      insert: () => ({ values: () => ({ returning: () => [] }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
      delete: () => ({ where: () => ({ returning: () => [] }) }),
      execute: async () => []
    };
    
    return { 
      pool: minimalPool, 
      db: minimalDb 
    };
  }
}

// Inicializar ambos pool e db em uma única função
const { pool: initializedPool, db: initializedDb } = initializeConnection();
pool = initializedPool;
db = initializedDb;

// Verificar conexão de forma assíncrona
setTimeout(async () => {
  try {
    console.log('🔍 Verificando conexão com banco de dados...');
    const result = await pool.query('SELECT NOW() as time');
    
    if (result && result.rows && result.rows[0]) {
      console.log(`✅ Banco de dados conectado e operacional às ${result.rows[0].time}`);
      console.log('======== BANCO DE DADOS INICIALIZADO ========');
    } else {
      console.error('⚠️ Conexão estabelecida, mas resposta inválida:', result);
    }
  } catch (err) {
    console.error('❌ Erro na verificação final de conexão:', err.message);
    console.error('⚠️ A aplicação continuará, mas funcionalidades de banco de dados podem falhar');
  }
}, 1000);

// Exportar as interfaces
export { pool, db };
