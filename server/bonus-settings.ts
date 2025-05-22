/**
 * Módulo dedicado às configurações de bônus do sistema
 * Implementação completamente refatorada
 */

import { storage } from "./storage";

// Tipagem para configurações de bônus
export interface BonusConfig {
  signupBonus: {
    enabled: boolean;
    amount: number;
    rollover: number;
    expiration: number;
  };
  firstDepositBonus: {
    enabled: boolean;
    amount: number;
    percentage: number;
    maxAmount: number;
    rollover: number;
    expiration: number;
  };
  promotionalBanners: {
    enabled: boolean;
  };
}

/**
 * Obtém as configurações de bônus do sistema
 */
export async function getBonusSettings(): Promise<BonusConfig> {
  const settings = await storage.getSystemSettings();
  
  // Configuração padrão caso não existam settings
  const defaultConfig: BonusConfig = {
    signupBonus: {
      enabled: false,
      amount: 10,
      rollover: 3,
      expiration: 7
    },
    firstDepositBonus: {
      enabled: false,
      amount: 100,
      percentage: 100,
      maxAmount: 200,
      rollover: 3,
      expiration: 7
    },
    promotionalBanners: {
      enabled: false
    }
  };
  
  // Se não existirem configurações, retorna o padrão
  if (!settings) {
    return defaultConfig;
  }
  
  // Extrai as configurações relacionadas a bônus
  return {
    signupBonus: {
      enabled: Boolean(settings.signupBonusEnabled), 
      amount: Number(settings.signupBonusAmount) || defaultConfig.signupBonus.amount,
      rollover: Number(settings.signupBonusRollover) || defaultConfig.signupBonus.rollover,
      expiration: Number(settings.signupBonusExpiration) || defaultConfig.signupBonus.expiration
    },
    firstDepositBonus: {
      enabled: Boolean(settings.firstDepositBonusEnabled),
      amount: Number(settings.firstDepositBonusAmount) || defaultConfig.firstDepositBonus.amount,
      percentage: Number(settings.firstDepositBonusPercentage) || defaultConfig.firstDepositBonus.percentage,
      maxAmount: Number(settings.firstDepositBonusMaxAmount) || defaultConfig.firstDepositBonus.maxAmount,
      rollover: Number(settings.firstDepositBonusRollover) || defaultConfig.firstDepositBonus.rollover,
      expiration: Number(settings.firstDepositBonusExpiration) || defaultConfig.firstDepositBonus.expiration
    },
    promotionalBanners: {
      enabled: Boolean(settings.promotionalBannersEnabled)
    }
  };
}

/**
 * Salva as configurações de bônus no sistema
 */
export async function saveBonusSettings(config: BonusConfig): Promise<boolean> {
  try {
    // Obtém as configurações atuais
    const currentSettings = await storage.getSystemSettings();
    
    if (!currentSettings) {
      throw new Error("Não foi possível obter as configurações atuais do sistema");
    }

    // Converte os valores para os tipos corretos antes de salvar
    const signupBonusEnabled = Boolean(config.signupBonus.enabled);
    const firstDepositBonusEnabled = Boolean(config.firstDepositBonus.enabled);
    
    // Prepara as novas configurações garantindo tipagem correta
    const updatedSettings = {
      ...currentSettings,
      // Bônus de cadastro
      signupBonusEnabled: signupBonusEnabled,
      signupBonusAmount: Number(config.signupBonus.amount),
      signupBonusRollover: Number(config.signupBonus.rollover),
      signupBonusExpiration: Number(config.signupBonus.expiration),
      
      // Bônus de primeiro depósito
      firstDepositBonusEnabled: firstDepositBonusEnabled,
      firstDepositBonusAmount: Number(config.firstDepositBonus.amount),
      firstDepositBonusPercentage: Number(config.firstDepositBonus.percentage),
      firstDepositBonusMaxAmount: Number(config.firstDepositBonus.maxAmount),
      firstDepositBonusRollover: Number(config.firstDepositBonus.rollover),
      firstDepositBonusExpiration: Number(config.firstDepositBonus.expiration),
      
      // Banners promocionais
      promotionalBannersEnabled: Boolean(config.promotionalBanners.enabled)
    };
    
    console.log("Valores sendo salvos para signupBonusEnabled:", signupBonusEnabled);
    console.log("Valores sendo salvos para firstDepositBonusEnabled:", firstDepositBonusEnabled);
    console.log("Salvando configurações:", JSON.stringify(updatedSettings));
    
    // Salva as configurações no banco
    await storage.saveSystemSettings(updatedSettings);
    
    // Gera log para confirmar que as configurações foram salvas
    console.log("=== CONFIGURAÇÕES DE BÔNUS SALVAS COM SUCESSO ===");
    console.log("Bônus de cadastro ativado:", signupBonusEnabled);
    console.log("Bônus de primeiro depósito ativado:", firstDepositBonusEnabled);
    
    return true;
  } catch (error) {
    console.error("Erro ao salvar configurações de bônus:", error);
    return false;
  }
}