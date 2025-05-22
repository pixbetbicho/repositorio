// Script para adicionar a coluna use_bonus_balance à tabela bets
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Pool } = pg;

async function fixBetsTable() {
  // Use DATABASE_URL do ambiente
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('DATABASE_URL não está definida. Configure a variável de ambiente.');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Verificar se a coluna já existe
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bets' AND column_name = 'use_bonus_balance'
    `;
    
    const columnCheck = await pool.query(checkColumnQuery);
    
    if (columnCheck.rows.length > 0) {
      console.log('Coluna use_bonus_balance já existe na tabela bets.');
      return;
    }
    
    // Adicionar a coluna
    const addColumnQuery = `
      ALTER TABLE bets
      ADD COLUMN use_bonus_balance BOOLEAN DEFAULT FALSE
    `;
    
    await pool.query(addColumnQuery);
    console.log('Coluna use_bonus_balance adicionada com sucesso à tabela bets!');
    
  } catch (error) {
    console.error('Erro ao adicionar coluna use_bonus_balance:', error);
  } finally {
    await pool.end();
  }
}

fixBetsTable().catch(console.error);