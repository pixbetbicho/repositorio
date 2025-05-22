// Seletor de conexão de banco de dados baseado no ambiente
// Este arquivo decide qual implementação de banco de dados usar

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';

// Determinar o ambiente
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Modo de ambiente em db-selector: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);

let db: any;
let pool: any;

// No modo de produção, importar o módulo de produção
if (isProduction) {
  console.log('Carregando configuração de banco de dados para PRODUÇÃO...');
  // Importação dinâmica não é suportada em ESM, vamos substituir por importação estática
  const prodDb = require('./db-prod');
  db = prodDb.db;
  pool = prodDb.pool;
} else {
  // Configuração para desenvolvimento (usando Neon Serverless)
  console.log('Carregando configuração de banco de dados para DESENVOLVIMENTO...');
  
  // Verificar se DATABASE_URL está disponível
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set for development environment');
  }
  
  // Importar dependências para desenvolvimento
  const ws = require('ws');
  const { neonConfig } = require('@neondatabase/serverless');
  
  // Configurar WebSocket para Neon
  neonConfig.webSocketConstructor = ws;
  
  // Configuração do pool para desenvolvimento
  const connectionString = process.env.DATABASE_URL;
  console.log(`URL de conexão (ofuscada): ${connectionString.replace(/:[^:]*@/, ':***@')}`);
  
  // Criar pool com configurações para desenvolvimento
  pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  // Configurar listener de erro
  pool.on('error', (err: any) => {
    console.error('Erro no pool de conexão:', err.message);
  });
  
  // Criar instância Drizzle
  db = drizzle(pool, { schema });
  
  // Testar conexão
  pool.query('SELECT current_database() as db_name')
    .then((result: any) => {
      console.log('✅ Conexão de desenvolvimento bem-sucedida!');
      console.log(`Database: ${result.rows[0].db_name}`);
    })
    .catch((err: any) => {
      console.error('❌ Falha na conexão de desenvolvimento:', err.message);
    });
}

// Exportar as instâncias do pool e db
export { pool, db };