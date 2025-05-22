import pg from 'pg';
const { Pool } = pg;

async function createUserBonusesTable() {
  try {
    console.log('Iniciando criação da tabela user_bonuses...');
    
    // Criar uma conexão direta com o banco
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Usar o pool diretamente para executar SQL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_bonuses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        rollover_amount REAL NOT NULL,
        rolled_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        expires_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        related_transaction_id INTEGER
      );
    `);
    
    console.log('Tabela user_bonuses criada com sucesso!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar a tabela user_bonuses:', error);
    process.exit(1);
  }
}

createUserBonusesTable();