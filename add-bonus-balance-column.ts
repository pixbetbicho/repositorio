import { db, pool } from './server/db';
import { sql } from 'drizzle-orm';

async function addBonusBalanceColumn() {
  try {
    console.log('Adicionando coluna use_bonus_balance à tabela bets...');
    
    // Verificar se a coluna já existe
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bets' AND column_name = 'use_bonus_balance'
    `);
    
    if (checkResult.length > 0) {
      console.log('Coluna use_bonus_balance já existe na tabela bets.');
      process.exit(0);
    }
    
    // Adicionar a coluna
    await db.execute(sql`
      ALTER TABLE bets
      ADD COLUMN use_bonus_balance BOOLEAN DEFAULT FALSE
    `);
    
    console.log('Coluna use_bonus_balance adicionada com sucesso à tabela bets!');
  } catch (error) {
    console.error('Erro ao adicionar coluna use_bonus_balance:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addBonusBalanceColumn().catch(console.error);