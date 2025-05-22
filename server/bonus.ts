// Gerenciador de bônus
import { BonusType, UserBonus, userBonuses } from "@shared/schema";
import { storage } from "./storage";
import { addDays } from "date-fns";
import { db } from "./db";
import { and, eq, lt } from "drizzle-orm";

// Aplica bônus de cadastro para um usuário
export async function applySignupBonus(userId: number): Promise<UserBonus | null> {
  try {
    // Verifica se o usuário já tem bônus de cadastro
    const existingBonuses = await storage.getUserBonuses(userId);
    const hasSignupBonus = existingBonuses.some(bonus => bonus.type === "signup");
    
    if (hasSignupBonus) {
      console.log(`Usuário ${userId} já possui bônus de cadastro.`);
      return null;
    }
    
    // Obter configurações do sistema
    const settings = await storage.getSystemSettings();
    
    // Verificar se o bônus de cadastro está habilitado
    if (!settings.signupBonusEnabled) {
      console.log("Bônus de cadastro desabilitado nas configurações.");
      return null;
    }
    
    // Calcular data de expiração
    const expiresAt = addDays(new Date(), settings.signupBonusExpiration);
    
    // Criar o bônus
    const bonusData = {
      userId,
      type: "signup" as BonusType,
      amount: settings.signupBonusAmount,
      remainingAmount: settings.signupBonusAmount,
      rolloverAmount: settings.signupBonusAmount * settings.signupBonusRollover,
      rolledAmount: 0,
      status: "active" as const,
      expiresAt,
    };
    
    const newBonus = await storage.createUserBonus(bonusData);
    console.log(`Bônus de cadastro aplicado para usuário ${userId}:`, newBonus);
    
    return newBonus;
  } catch (error) {
    console.error("Erro ao aplicar bônus de cadastro:", error);
    return null;
  }
}

// Aplica bônus de primeiro depósito
export async function applyFirstDepositBonus(
  userId: number, 
  depositAmount: number,
  transactionId: number
): Promise<UserBonus | null> {
  try {
    // Verifica se o usuário já tem bônus de primeiro depósito
    const existingBonuses = await storage.getUserBonuses(userId);
    const hasFirstDepositBonus = existingBonuses.some(bonus => bonus.type === "first_deposit");
    
    if (hasFirstDepositBonus) {
      console.log(`Usuário ${userId} já utilizou o bônus de primeiro depósito.`);
      return null;
    }
    
    // Obter configurações do sistema
    const settings = await storage.getSystemSettings();
    
    // Verificar se o bônus de primeiro depósito está habilitado
    if (!settings.firstDepositBonusEnabled) {
      console.log("Bônus de primeiro depósito desabilitado nas configurações.");
      return null;
    }
    
    // Calcular valor do bônus
    let bonusAmount: number;
    
    // Se há uma porcentagem configurada, usar ela (com limite máximo se configurado)
    if (settings.firstDepositBonusPercentage > 0) {
      bonusAmount = depositAmount * (settings.firstDepositBonusPercentage / 100);
      
      // Aplicar limite se existir
      if (settings.firstDepositBonusMaxAmount > 0 && bonusAmount > settings.firstDepositBonusMaxAmount) {
        bonusAmount = settings.firstDepositBonusMaxAmount;
      }
    } else {
      // Usar valor fixo
      bonusAmount = settings.firstDepositBonusAmount;
    }
    
    // Calcular data de expiração
    const expiresAt = addDays(new Date(), settings.firstDepositBonusExpiration);
    
    // Criar o bônus
    const bonusData = {
      userId,
      type: "first_deposit" as BonusType,
      amount: bonusAmount,
      remainingAmount: bonusAmount,
      rolloverAmount: bonusAmount * settings.firstDepositBonusRollover,
      rolledAmount: 0,
      status: "active" as const,
      expiresAt,
      relatedTransactionId: transactionId
    };
    
    const newBonus = await storage.createUserBonus(bonusData);
    console.log(`Bônus de primeiro depósito aplicado para usuário ${userId}:`, newBonus);
    
    return newBonus;
  } catch (error) {
    console.error("Erro ao aplicar bônus de primeiro depósito:", error);
    return null;
  }
}

// Atualiza o progresso de rollover para apostas
export async function updateBonusProgress(
  userId: number,
  betAmount: number
): Promise<void> {
  try {
    // Obter bônus ativos do usuário
    const activeBonus = await storage.getUserActiveBonus(userId);
    
    if (!activeBonus) {
      return;
    }
    
    // Calcular novo progresso
    const newProgress = activeBonus.rolledAmount + betAmount;
    const isCompleted = newProgress >= activeBonus.rolloverAmount;
    
    // Atualizar status se completado
    if (isCompleted) {
      await storage.completeBonus(activeBonus.id);
      
      // Adicionar o valor do bônus para o saldo real do usuário
      await storage.incrementUserBalance(userId, activeBonus.remainingAmount);
      
      // Registrar a transação
      await storage.createTransaction({
        userId,
        type: "deposit",
        amount: activeBonus.remainingAmount,
        description: `Liberação de bônus de ${activeBonus.type === "signup" ? "cadastro" : "primeiro depósito"} após cumprir rollover`,
        relatedId: activeBonus.id
      });
      
      console.log(`Bônus #${activeBonus.id} completado para o usuário ${userId}. Liberado ${activeBonus.remainingAmount}.`);
    } else {
      // Apenas atualizar o progresso
      await storage.updateUserBonusProgress(activeBonus.id, newProgress);
    }
  } catch (error) {
    console.error("Erro ao atualizar progresso de bônus:", error);
  }
}

// Verifica todos os bônus expirados e marca como expirado
export async function checkExpiredBonuses(): Promise<void> {
  try {
    // Buscar todos os bônus ativos com data de expiração no passado
    const now = new Date();
    const expiredBonuses = await db
      .select()
      .from(userBonuses)
      .where(
        and(
          eq(userBonuses.status, "active"),
          lt(userBonuses.expiresAt, now)
        )
      );
    
    // Marcar cada um como expirado
    for (const bonus of expiredBonuses) {
      await db
        .update(userBonuses)
        .set({ 
          status: "expired" as const,
          updatedAt: new Date()
        })
        .where(eq(userBonuses.id, bonus.id));
        
      console.log(`Bônus #${bonus.id} expirado para usuário ${bonus.userId}.`);
    }
    
    // Log do número total de bônus expirados
    if (expiredBonuses.length > 0) {
      console.log(`Total de ${expiredBonuses.length} bônus expirados processados.`);
    }
  } catch (error) {
    console.error("Erro ao verificar bônus expirados:", error);
  }
}