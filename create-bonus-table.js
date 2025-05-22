// Script para criar a tabela de bônus
import { Pool } from 'pg';

async function createUserBonusesTable() {
  // Usar a variável de ambiente DATABASE_URL diretamente
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Conectado ao banco de dados PostgreSQL');

    // Criar tabela user_bonuses
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_bonuses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        remaining_amount DECIMAL(10, 2) NOT NULL,
        rollover_amount DECIMAL(10, 2) NOT NULL,
        rolled_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        expires_at TIMESTAMP WITH TIME ZONE,
        related_transaction_id INTEGER REFERENCES payment_transactions(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await pool.query(createTableQuery);
    console.log('Tabela user_bonuses criada ou já existente');
    
    console.log('Operação concluída com sucesso');
  } catch (error) {
    console.error('Erro ao executar operação:', error);
  } finally {
    await client.end();
    console.log('Conexão com o banco de dados encerrada');
  }
}

// Auto-executar a função
(async () => {
  try {
    await createUserBonusesTable();
  } catch (error) {
    console.error('Erro na execução:', error);
  }
})();