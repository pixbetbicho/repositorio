import pg from 'pg';
const { Pool } = pg;

async function checkTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_bonuses'
      );
    `);
    
    console.log('Tabela user_bonuses existe?', result.rows[0].exists);
    
    if (result.rows[0].exists) {
      const tableSchema = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_bonuses';
      `);
      
      console.log('Estrutura da tabela user_bonuses:');
      tableSchema.rows.forEach(column => {
        console.log(`${column.column_name}: ${column.data_type}`);
      });
    } else {
      console.log('A tabela user_bonuses não existe. Vamos criá-la...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_bonuses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          remaining_amount REAL NOT NULL,
          rollover_amount REAL NOT NULL,
          rolled_amount REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active',
          expires_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          related_transaction_id INTEGER
        );
      `);
      
      console.log('Tabela user_bonuses criada com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao verificar/criar tabela:', error);
  } finally {
    await pool.end();
  }
}

checkTable();