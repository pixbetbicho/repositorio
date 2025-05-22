import pg from 'pg';
const { Pool } = pg;

// Conexão simplificada
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Conectando ao banco de dados...');
    
    // Executar alteração direta (abordagem simplificada)
    const query = `
      ALTER TABLE system_settings 
      ADD COLUMN IF NOT EXISTS site_name TEXT NOT NULL DEFAULT 'Jogo do Bicho',
      ADD COLUMN IF NOT EXISTS site_description TEXT NOT NULL DEFAULT 'A melhor plataforma de apostas online',
      ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT '/img/logo.png',
      ADD COLUMN IF NOT EXISTS favicon_url TEXT NOT NULL DEFAULT '/favicon.ico';
    `;
    
    console.log('Executando query de alteração...');
    await pool.query(query);
    console.log('Esquema atualizado com sucesso!');
    
    // Verificar se as colunas foram adicionadas
    const { rows } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'system_settings'
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura atual da tabela:');
    rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('ERRO:', error);
  } finally {
    await pool.end();
    console.log('Conexão fechada');
  }
}

run();
