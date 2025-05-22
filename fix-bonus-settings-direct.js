// Script SQL direto para forçar a atualização das configurações do bônus
// Este script cria as colunas necessárias caso não existam e define valores padrão

import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixBonusSettings() {
  try {
    console.log("Iniciando correção direta das configurações de bônus via SQL...");
    
    // Primeiro, verificar se a tabela system_settings existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.error("Tabela system_settings não existe! Abortando operação.");
      return;
    }
    
    console.log("Tabela system_settings encontrada. Verificando colunas existentes...");
    
    // Obter todas as colunas existentes na tabela
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'system_settings';
    `);
    
    const existingColumns = columnsQuery.rows.map(row => row.column_name);
    console.log("Colunas existentes:", existingColumns);
    
    // Definir as colunas necessárias para os bônus
    const requiredColumns = [
      { name: 'signup_bonus_enabled', type: 'BOOLEAN', default: 'FALSE' },
      { name: 'signup_bonus_amount', type: 'REAL', default: '10' },
      { name: 'signup_bonus_rollover', type: 'REAL', default: '3' },
      { name: 'signup_bonus_expiration', type: 'INTEGER', default: '7' },
      { name: 'first_deposit_bonus_enabled', type: 'BOOLEAN', default: 'FALSE' },
      { name: 'first_deposit_bonus_amount', type: 'REAL', default: '100' },
      { name: 'first_deposit_bonus_percentage', type: 'REAL', default: '100' },
      { name: 'first_deposit_bonus_max_amount', type: 'REAL', default: '200' },
      { name: 'first_deposit_bonus_rollover', type: 'REAL', default: '3' },
      { name: 'first_deposit_bonus_expiration', type: 'INTEGER', default: '7' },
      { name: 'promotional_banners_enabled', type: 'BOOLEAN', default: 'TRUE' },
      { name: 'signup_bonus_banner_enabled', type: 'BOOLEAN', default: 'FALSE' },
      { name: 'first_deposit_bonus_banner_enabled', type: 'BOOLEAN', default: 'FALSE' }
    ];
    
    // Adicionar as colunas que não existem
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adicionando coluna ${column.name} do tipo ${column.type}`);
        
        await pool.query(`
          ALTER TABLE system_settings 
          ADD COLUMN ${column.name} ${column.type} NOT NULL DEFAULT ${column.default};
        `);
        
        console.log(`✅ Coluna ${column.name} adicionada com sucesso`);
      } else {
        console.log(`Coluna ${column.name} já existe`);
      }
    }
    
    // Atualizar os valores para ativar os bônus
    console.log("Atualizando valores das configurações de bônus...");
    
    const updateQuery = `
      UPDATE system_settings 
      SET 
        signup_bonus_enabled = TRUE,
        signup_bonus_amount = 10,
        signup_bonus_rollover = 3,
        signup_bonus_expiration = 7,
        first_deposit_bonus_enabled = TRUE,
        first_deposit_bonus_amount = 100,
        first_deposit_bonus_percentage = 100,
        first_deposit_bonus_max_amount = 200,
        first_deposit_bonus_rollover = 3,
        first_deposit_bonus_expiration = 7,
        promotional_banners_enabled = TRUE,
        signup_bonus_banner_enabled = TRUE,
        first_deposit_bonus_banner_enabled = TRUE,
        updated_at = NOW()
      WHERE id = (SELECT MAX(id) FROM system_settings);
    `;
    
    const updateResult = await pool.query(updateQuery);
    console.log(`✅ Configurações atualizadas. Linhas afetadas: ${updateResult.rowCount}`);
    
    // Verificar se a atualização foi aplicada corretamente
    const verifyQuery = await pool.query(`
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
      WHERE id = (SELECT MAX(id) FROM system_settings);
    `);
    
    if (verifyQuery.rows.length > 0) {
      console.log("Valores atuais após atualização:");
      console.log(verifyQuery.rows[0]);
      
      // Verificar se os valores foram atualizados corretamente
      const result = verifyQuery.rows[0];
      if (result.signup_bonus_enabled === true && result.first_deposit_bonus_enabled === true) {
        console.log("✅ Atualização de bônus completada com sucesso!");
      } else {
        console.log("⚠️ Os valores não parecem ter sido atualizados corretamente.");
      }
    } else {
      console.log("⚠️ Não foi possível verificar os valores atualizados.");
    }
    
    console.log("Script de correção de bônus concluído!");
  } catch (error) {
    console.error("Erro durante a execução do script:", error);
  } finally {
    process.exit(0);
  }
}

fixBonusSettings();