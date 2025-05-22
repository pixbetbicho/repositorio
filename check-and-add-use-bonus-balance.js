// Script para verificar e adicionar a coluna use_bonus_balance à tabela bets
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkAndAddUseBonusBalanceColumn() {
  try {
    console.log('Verificando se a coluna use_bonus_balance existe na tabela bets...');
    
    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bets' AND column_name = 'use_bonus_balance'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('Coluna use_bonus_balance não existe na tabela bets, adicionando...');
      
      // Adicionar a coluna à tabela
      await pool.query(`
        ALTER TABLE bets 
        ADD COLUMN use_bonus_balance BOOLEAN DEFAULT false
      `);
      
      console.log('Coluna use_bonus_balance adicionada com sucesso!');
    } else {
      console.log('Coluna use_bonus_balance já existe na tabela bets, nada a fazer.');
    }
    
    // Mostrar todas as colunas para verificação
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bets'
      ORDER BY column_name
    `);
    
    console.log('Colunas da tabela bets:', columns.rows.map(row => row.column_name));
    
  } catch (error) {
    console.error('Erro ao verificar/adicionar coluna use_bonus_balance:', error);
  } finally {
    // Encerrar a conexão com o banco
    pool.end();
  }
}

// Executar a função
checkAndAddUseBonusBalanceColumn();