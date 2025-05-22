// Script para verificar valores atuais de bônus nas configurações do sistema
import { db } from './server/db.js';

async function checkBonusSettings() {
  try {
    console.log('=== Verificando configurações de bônus ===');
    
    // Buscar configurações do sistema
    const systemSettings = await db.query.system_settings.findFirst();
    
    if (!systemSettings) {
      console.log('❌ Tabela system_settings não encontrada ou vazia!');
      return;
    }

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
    process.exit(0);
  }
}

checkBonusSettings();