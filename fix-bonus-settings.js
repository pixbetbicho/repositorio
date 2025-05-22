// Script para corrigir as configurações de bônus
require('dotenv').config();
const { Pool } = require('pg');

async function fixBonusSettings() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('=== Atualizando configurações de bônus ===');
    
    // Ativar o bônus de primeiro depósito
    const updateQuery = `
      UPDATE system_settings
      SET first_deposit_bonus_enabled = TRUE,
          first_deposit_bonus_percentage = 150,
          first_deposit_bonus_max_amount = 300,
          first_deposit_bonus_rollover = 2
      WHERE id = 1;
    `;
    
    await pool.query(updateQuery);
    console.log('✅ Configurações de bônus atualizadas com sucesso!');
    
    // Verificar as configurações atualizadas
    const { rows } = await pool.query('SELECT * FROM system_settings LIMIT 1');
    
    if (rows.length > 0) {
      const settings = rows[0];
      console.log('Configurações de bônus atualizadas:');
      console.log(`- Bônus de primeiro depósito: ${settings.first_deposit_bonus_enabled ? 'ATIVADO' : 'DESATIVADO'}`);
      console.log(`- Percentual: ${settings.first_deposit_bonus_percentage}%`);
      console.log(`- Valor máximo: R$ ${settings.first_deposit_bonus_max_amount}`);
      console.log(`- Rollover: ${settings.first_deposit_bonus_rollover}x`);
    }
    
  } catch (error) {
    console.error('❌ ERRO ao atualizar configurações de bônus:', error);
  } finally {
    await pool.end();
    console.log('=== Concluído ===');
  }
}

fixBonusSettings();