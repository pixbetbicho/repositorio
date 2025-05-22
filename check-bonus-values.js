require('dotenv').config();
const { Pool } = require('pg');

async function checkBonusSettings() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('=== Verificando configurações de bônus ===');
    
    // Buscar configurações do sistema
    const { rows } = await pool.query('SELECT * FROM system_settings LIMIT 1');
    
    if (!rows || rows.length === 0) {
      console.log('❌ Tabela system_settings não encontrada ou vazia!');
      return;
    }

    const systemSettings = rows[0];

    // Mostrar valores de bônus
    console.log('Configurações de bônus de primeiro depósito:');
    console.log(`- Ativado: ${systemSettings.first_deposit_bonus_enabled}`);
    console.log(`- Percentual: ${systemSettings.first_deposit_bonus_percentage}%`);
    console.log(`- Valor máximo: R$ ${systemSettings.first_deposit_bonus_max_amount}`);
    console.log(`- Rollover: ${systemSettings.first_deposit_bonus_rollover}x`);
    console.log(`- Expiração: ${systemSettings.first_deposit_bonus_expiration} dias`);
    
    // Se o bônus está desativado ou o percentual é zero
    if (!systemSettings.first_deposit_bonus_enabled || systemSettings.first_deposit_bonus_percentage === 0) {
      console.log('\n⚠️ O bônus de primeiro depósito está DESATIVADO ou com percentual ZERO!');
      console.log('Para ativar, defina first_deposit_bonus_enabled = true e first_deposit_bonus_percentage > 0');
    }
    
  } catch (error) {
    console.error('Erro ao verificar configurações de bônus:', error);
  } finally {
    await pool.end();
  }
}

checkBonusSettings();