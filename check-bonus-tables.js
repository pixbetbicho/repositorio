import pg from 'pg';
const { Pool } = pg;

async function checkBonusTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Verificar se a tabela user_bonuses existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bonuses'
      );
    `);
    
    console.log('A tabela user_bonuses existe?', tableCheck.rows[0].exists);
    
    // Verificar se as colunas de bônus existem na tabela system_settings
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'system_settings' 
      AND column_name IN (
        'signup_bonus_enabled', 
        'signup_bonus_amount', 
        'first_deposit_bonus_enabled', 
        'first_deposit_bonus_amount'
      );
    `);
    
    console.log('Colunas de bônus em system_settings:', columnCheck.rows.map(row => row.column_name));
    
    // Verificar o conteúdo atual de system_settings
    const settings = await pool.query(`
      SELECT 
        id,
        signup_bonus_enabled, 
        signup_bonus_amount, 
        first_deposit_bonus_enabled, 
        first_deposit_bonus_amount
      FROM system_settings
      LIMIT 1;
    `);
    
    console.log('Configurações atuais de bônus:', settings.rows[0]);
    
    // Tentar atualizar diretamente as configurações de bônus
    console.log('Testando atualização direta de configurações de bônus...');
    
    const updateResult = await pool.query(`
      UPDATE system_settings 
      SET 
        signup_bonus_enabled = true,
        first_deposit_bonus_enabled = true
      WHERE id = $1
      RETURNING *
    `, [settings.rows[0].id]);
    
    console.log('Resultado da atualização:', 
      updateResult.rowCount > 0 ? 'Atualização bem-sucedida' : 'Falha na atualização'
    );
    
    if (updateResult.rowCount > 0) {
      console.log('Valores atualizados:', {
        signup_bonus_enabled: updateResult.rows[0].signup_bonus_enabled,
        first_deposit_bonus_enabled: updateResult.rows[0].first_deposit_bonus_enabled
      });
    }
    
    // Encerrar a conexão
    await pool.end();
  } catch (error) {
    console.error('Erro ao verificar o sistema de bônus:', error);
    await pool.end();
  }
}

checkBonusTables();