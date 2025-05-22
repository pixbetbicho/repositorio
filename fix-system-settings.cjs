const { Pool } = require('pg');

async function fixSystemSettings() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Verificando a tabela system_settings...');

    // Verificar se a coluna allow_bonus_bets existe
    const checkColumnQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'system_settings' 
        AND column_name = 'allow_bonus_bets'
      );
    `;
    
    const columnCheckResult = await pool.query(checkColumnQuery);
    const columnExists = columnCheckResult.rows[0].exists;
    
    console.log(`A coluna allow_bonus_bets existe? ${columnExists}`);
    
    // Se a coluna não existir, adicioná-la
    if (!columnExists) {
      console.log('Adicionando a coluna allow_bonus_bets à tabela system_settings...');
      
      await pool.query(`
        ALTER TABLE system_settings 
        ADD COLUMN allow_bonus_bets BOOLEAN NOT NULL DEFAULT true;
      `);
      
      console.log('Coluna allow_bonus_bets adicionada com sucesso!');
    } else {
      console.log('A coluna allow_bonus_bets já existe, não é necessária nenhuma alteração.');
    }
    
    // Mostrar todas as colunas da tabela system_settings
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'system_settings' 
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    console.log('Colunas na tabela system_settings:');
    columnsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name}`);
    });
    
    // Mostrar o valor atual de allow_bonus_bets
    const settingsQuery = `
      SELECT allow_bonus_bets 
      FROM system_settings 
      LIMIT 1;
    `;
    
    try {
      const settingsResult = await pool.query(settingsQuery);
      if (settingsResult.rows.length > 0) {
        console.log('Valor atual de allow_bonus_bets:', settingsResult.rows[0].allow_bonus_bets);
      } else {
        console.log('Não há registros na tabela system_settings.');
      }
    } catch (error) {
      console.error('Erro ao verificar o valor atual de allow_bonus_bets:', error);
    }

    console.log('Processo concluído!');
  } catch (error) {
    console.error('Erro ao verificar ou modificar a tabela system_settings:', error);
  } finally {
    await pool.end();
  }
}

fixSystemSettings().catch(console.error);