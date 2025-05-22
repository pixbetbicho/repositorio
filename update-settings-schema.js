import pg from 'pg';
const { Pool } = pg;

// Conectar ao banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

async function updateSystemSettingsSchema() {
  try {
    console.log('Conectando ao banco de dados...');
    
    // Verificar quais colunas já existem
    const { rows } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'system_settings' 
      AND column_name IN ('site_name', 'site_description', 'logo_url', 'favicon_url')
    `);
    
    const existingColumns = rows.map(row => row.column_name);
    console.log('Colunas existentes:', existingColumns);
    
    // Determinar quais colunas precisam ser adicionadas
    const columnsToAdd = [];
    if (!existingColumns.includes('site_name')) columnsToAdd.push("site_name TEXT NOT NULL DEFAULT 'Jogo do Bicho'");
    if (!existingColumns.includes('site_description')) columnsToAdd.push("site_description TEXT NOT NULL DEFAULT 'A melhor plataforma de apostas online'");
    if (!existingColumns.includes('logo_url')) columnsToAdd.push("logo_url TEXT NOT NULL DEFAULT '/img/logo.png'");
    if (!existingColumns.includes('favicon_url')) columnsToAdd.push("favicon_url TEXT NOT NULL DEFAULT '/favicon.ico'");
    
    if (columnsToAdd.length > 0) {
      // Construir a query para adicionar as colunas
      const alterQuery = `
        ALTER TABLE system_settings 
        ${columnsToAdd.map(col => `ADD COLUMN IF NOT EXISTS ${col}`).join(', ')}
      `;
      
      console.log('Executando query:', alterQuery);
      
      // Executar a query
      await pool.query(alterQuery);
      
      console.log(`✅ Sucesso! Adicionadas ${columnsToAdd.length} novas colunas à tabela system_settings.`);
    } else {
      console.log('✅ Todos os campos já existem na tabela system_settings.');
    }
    
    // Verificar o estado final da tabela
    const { rows: finalColumns } = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'system_settings'
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura final da tabela system_settings:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar o esquema:', error);
  } finally {
    // Fechar conexão com o banco de dados
    await pool.end();
    console.log('Conexão fechada.');
  }
}

// Executar função principal
updateSystemSettingsSchema();