// Importação direta das dependências necessárias
const { Pool } = require('pg');

// Obtém a URL do banco de dados da variável de ambiente
const DATABASE_URL = process.env.DATABASE_URL;

// Função que cria a tabela de bônus
async function createBonusTable() {
  // Verifica se a URL do banco de dados está disponível
  if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Cria uma conexão com o banco de dados
  const pool = new Pool({
    connectionString: DATABASE_URL,
    // Define um timeout maior para evitar problemas de conexão
    connectionTimeoutMillis: 20000,
    // Limita o número de tentativas de conexão
    max: 1
  });

  try {
    console.log('Connecting to database...');
    
    // Verifica se a tabela já existe
    const checkTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'user_bonuses'
      );
    `);
    
    const tableExists = checkTableResult.rows[0].exists;
    
    if (tableExists) {
      console.log('Table user_bonuses already exists, skipping creation.');
    } else {
      console.log('Creating user_bonuses table...');
      
      // Cria a tabela user_bonuses
      await pool.query(`
        CREATE TABLE user_bonuses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          remaining_amount DECIMAL(10, 2) NOT NULL,
          rollover_amount DECIMAL(10, 2) NOT NULL,
          rolled_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active',
          expires_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          related_transaction_id INTEGER
        );
      `);
      
      console.log('Table user_bonuses created successfully!');
    }
    
    // Fecha a conexão com o pool
    await pool.end();
    console.log('Database connection closed.');
    
    // Finaliza o processo com sucesso
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    
    // Tenta fechar a conexão com o pool
    try {
      await pool.end();
    } catch (closeError) {
      console.error('Error closing pool:', closeError);
    }
    
    // Finaliza o processo com erro
    process.exit(1);
  }
}

// Executa a função principal
createBonusTable();