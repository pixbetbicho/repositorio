import pg from 'pg';
const { Pool } = pg;

// Create a new PostgreSQL client using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

async function updateSchema() {
  try {
    console.log('Connecting to database...');
    
    // Add site branding columns
    const result = await pool.query(`
      ALTER TABLE system_settings 
      ADD COLUMN IF NOT EXISTS site_name TEXT NOT NULL DEFAULT 'Jogo do Bicho',
      ADD COLUMN IF NOT EXISTS site_description TEXT NOT NULL DEFAULT 'A melhor plataforma de apostas online',
      ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT '/img/logo.png',
      ADD COLUMN IF NOT EXISTS favicon_url TEXT NOT NULL DEFAULT '/favicon.ico';
    `);
    
    console.log('Schema updated successfully!');
    
    // Verify the columns
    const { rows } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'system_settings'
      ORDER BY ordinal_position;
    `);
    
    console.log('System settings columns:');
    rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await pool.end();
    console.log('Connection closed');
  }
}

updateSchema();