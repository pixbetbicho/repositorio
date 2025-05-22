// Script para adicionar a coluna allow_bonus_bets à tabela system_settings
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addAllowBonusBetsColumn() {
  try {
    console.log('Verificando se a coluna allow_bonus_bets existe...');
    
    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'system_settings' AND column_name = 'allow_bonus_bets'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('Coluna allow_bonus_bets não existe, adicionando...');
      
      // Adicionar a coluna à tabela
      await pool.query(`
        ALTER TABLE system_settings 
        ADD COLUMN allow_bonus_bets BOOLEAN DEFAULT true
      `);
      
      console.log('Coluna allow_bonus_bets adicionada com sucesso!');
    } else {
      console.log('Coluna allow_bonus_bets já existe, nada a fazer.');
    }
    
    // Mostrar todas as colunas para verificação
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'system_settings'
      ORDER BY column_name
    `);
    
    console.log('Colunas da tabela system_settings:', columns.rows.map(row => row.column_name));
    
  } catch (error) {
    console.error('Erro ao adicionar coluna allow_bonus_bets:', error);
  } finally {
    // Encerrar a conexão com o banco
    pool.end();
  }
}

// Executar a função
addAllowBonusBetsColumn();