// Script para corrigir as configurações do sistema
import { db } from './server/db.js';
import { systemSettings, eq } from '@shared/schema';

async function fixSystemSettings() {
  try {
    console.log('=== Atualizando configurações de bônus ===');
    
    // Atualizar configurações de bônus via drizzle ORM
    await db.update(systemSettings)
      .set({
        firstDepositBonusEnabled: true,
        firstDepositBonusPercentage: 150,
        firstDepositBonusMaxAmount: 300,
        firstDepositBonusRollover: 2
      })
      .where(eq(systemSettings.id, 1));
    
    console.log('✅ Configurações atualizadas com sucesso!');
    
    // Verificar configurações atualizadas
    const [settings] = await db.select().from(systemSettings);
    
    console.log('Configurações de bônus atualizadas:');
    console.log(`- Bônus de primeiro depósito: ${settings.firstDepositBonusEnabled ? 'ATIVADO' : 'DESATIVADO'}`);
    console.log(`- Percentual: ${settings.firstDepositBonusPercentage}%`);
    console.log(`- Valor máximo: R$ ${settings.firstDepositBonusMaxAmount}`);
    console.log(`- Rollover: ${settings.firstDepositBonusRollover}x`);
    
  } catch (error) {
    console.error('❌ ERRO ao atualizar configurações:', error);
  }
}

fixSystemSettings();