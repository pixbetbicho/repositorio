import pg from 'pg';
const { Pool } = pg;

// Configuração do cliente PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateBonusSettings() {
  try {
    console.log('Iniciando atualização forçada das configurações de bônus...');
    
    // Verificar se a tabela system_settings existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('A tabela system_settings não existe!');
      await pool.end();
      return;
    }
    
    // Verificar se as colunas para bônus existem
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'system_settings'
      AND column_name IN (
        'signup_bonus_enabled',
        'signup_bonus_amount',
        'signup_bonus_rollover',
        'signup_bonus_expiration',
        'first_deposit_bonus_enabled',
        'first_deposit_bonus_amount',
        'first_deposit_bonus_percentage',
        'first_deposit_bonus_max_amount',
        'first_deposit_bonus_rollover',
        'first_deposit_bonus_expiration'
      );
    `);
    
    console.log('Colunas de bônus encontradas:', columnCheck.rows.map(r => r.column_name));
    
    if (columnCheck.rows.length < 10) {
      console.error('Algumas colunas de bônus estão faltando!');
      
      // Criar as colunas faltantes
      const missingColumns = [
        'signup_bonus_enabled',
        'signup_bonus_amount',
        'signup_bonus_rollover',
        'signup_bonus_expiration',
        'first_deposit_bonus_enabled',
        'first_deposit_bonus_amount',
        'first_deposit_bonus_percentage',
        'first_deposit_bonus_max_amount',
        'first_deposit_bonus_rollover',
        'first_deposit_bonus_expiration'
      ].filter(col => !columnCheck.rows.some(r => r.column_name === col));
      
      console.log('Colunas faltantes:', missingColumns);
      
      // Adicionar as colunas faltantes
      for (const column of missingColumns) {
        let dataType = 'boolean';
        let defaultValue = 'false';
        
        if (column.includes('amount') || column.includes('rollover') || column.includes('percentage') || column.includes('max_amount')) {
          dataType = 'real';
          defaultValue = column.includes('percentage') ? '100' : (column.includes('max_amount') ? '200' : '10');
        } else if (column.includes('expiration')) {
          dataType = 'integer';
          defaultValue = '7';
        }
        
        await pool.query(`
          ALTER TABLE system_settings 
          ADD COLUMN IF NOT EXISTS ${column} ${dataType} NOT NULL DEFAULT ${defaultValue}
        `);
        
        console.log(`Coluna ${column} adicionada com tipo ${dataType} e valor padrão ${defaultValue}`);
      }
    }
    
    // Atualizar os valores diretamente na tabela
    const updateResult = await pool.query(`
      UPDATE system_settings 
      SET 
        signup_bonus_enabled = true,
        signup_bonus_amount = 10,
        signup_bonus_rollover = 3,
        signup_bonus_expiration = 7,
        first_deposit_bonus_enabled = true,
        first_deposit_bonus_amount = 100,
        first_deposit_bonus_percentage = 100,
        first_deposit_bonus_max_amount = 200,
        first_deposit_bonus_rollover = 3,
        first_deposit_bonus_expiration = 7,
        updated_at = NOW()
    `);
    
    console.log('Atualização realizada com sucesso. Linhas afetadas:', updateResult.rowCount);
    
    // Verificar se os valores foram atualizados corretamente
    const checkResult = await pool.query(`
      SELECT 
        signup_bonus_enabled,
        signup_bonus_amount,
        signup_bonus_rollover,
        signup_bonus_expiration,
        first_deposit_bonus_enabled,
        first_deposit_bonus_amount,
        first_deposit_bonus_percentage,
        first_deposit_bonus_max_amount,
        first_deposit_bonus_rollover,
        first_deposit_bonus_expiration
      FROM system_settings
      LIMIT 1
    `);
    
    console.log('Valores atuais das configurações de bônus:', checkResult.rows[0]);
    
    await pool.end();
    console.log('Atualização de configurações de bônus concluída.');
  } catch (error) {
    console.error('Erro ao atualizar configurações de bônus:', error);
    await pool.end();
  }
}

// Executar o script
updateBonusSettings();