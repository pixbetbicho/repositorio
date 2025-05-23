/**
 * PushinPay Webhook Handler
 * Processa notificações de pagamento da PushinPay
 */

import { Request, Response } from "express";
import { storage } from "../storage";
import { pushinPayService } from "../services/pushinpay";

interface PushinPayWebhookData {
  id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  external_id: string;
  paid_at?: string;
  created_at: string;
  expires_at: string;
}

export async function handlePushinPayWebhook(req: Request, res: Response) {
  try {
    console.log("[PushinPay Webhook] Dados recebidos:", JSON.stringify(req.body, null, 2));
    
    const webhookData: PushinPayWebhookData = req.body;
    
    // Validações básicas
    if (!webhookData.id || !webhookData.status || !webhookData.external_id) {
      console.error("[PushinPay Webhook] Dados incompletos:", req.body);
      return res.status(400).json({ message: "Dados incompletos no webhook" });
    }
    
    // Extrair ID da transação do external_id
    const externalIdParts = webhookData.external_id.split('-');
    if (externalIdParts.length < 2 || externalIdParts[0] !== 'DEPOSIT') {
      console.error("[PushinPay Webhook] Formato de external_id inválido:", webhookData.external_id);
      return res.status(400).json({ message: "Formato de external_id inválido" });
    }
    
    const transactionId = parseInt(externalIdParts[1]);
    if (isNaN(transactionId)) {
      console.error("[PushinPay Webhook] ID de transação inválido:", externalIdParts[1]);
      return res.status(400).json({ message: "ID de transação inválido" });
    }
    
    // Buscar transação no banco
    const transaction = await storage.getPaymentTransaction(transactionId);
    if (!transaction) {
      console.error("[PushinPay Webhook] Transação não encontrada:", transactionId);
      return res.status(404).json({ message: "Transação não encontrada" });
    }
    
    // Verificar se a transação já foi processada
    if (transaction.status === 'completed') {
      console.log("[PushinPay Webhook] Transação já processada:", transactionId);
      return res.json({ message: "Transação já processada" });
    }
    
    // Processar baseado no status
    switch (webhookData.status) {
      case 'paid':
        await processSuccessfulPayment(transaction, webhookData);
        break;
        
      case 'expired':
      case 'cancelled':
        await processFailedPayment(transaction, webhookData);
        break;
        
      case 'pending':
        // Apenas atualizar dados se necessário
        await storage.updateTransactionStatus(
          transactionId,
          "pending",
          webhookData.id,
          undefined,
          webhookData
        );
        break;
    }
    
    res.json({ message: "Webhook processado com sucesso" });
    
  } catch (error) {
    console.error("[PushinPay Webhook] Erro:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}

async function processSuccessfulPayment(transaction: any, webhookData: PushinPayWebhookData) {
  try {
    console.log(`[PushinPay] Processando pagamento confirmado - Transação ${transaction.id}`);
    
    // Verificar se o usuário ainda existe
    const user = await storage.getUser(transaction.userId);
    if (!user) {
      throw new Error(`Usuário ${transaction.userId} não encontrado`);
    }
    
    // Atualizar status da transação
    await storage.updateTransactionStatus(
      transaction.id,
      "completed",
      webhookData.id,
      undefined,
      webhookData
    );
    
    // Atualizar saldo do usuário
    const updatedUser = await storage.updateUserBalance(transaction.userId, transaction.amount);
    
    console.log(`[PushinPay] Pagamento processado com sucesso:
      - Transação: ${transaction.id}
      - Usuário: ${user.username} (${user.id})
      - Valor: R$ ${transaction.amount}
      - Saldo anterior: R$ ${user.balance}
      - Novo saldo: R$ ${updatedUser?.balance}
    `);
    
    // Criar registro de transação financeira
    await storage.createTransaction({
      userId: transaction.userId,
      type: "deposit",
      amount: transaction.amount,
      description: `Depósito via PushinPay - PIX ID: ${webhookData.id}`,
      relatedId: transaction.id
    });
    
    // Verificar e aplicar bônus de primeiro depósito
    await checkAndApplyFirstDepositBonus(user, transaction.amount);
    
  } catch (error) {
    console.error("[PushinPay] Erro ao processar pagamento confirmado:", error);
    throw error;
  }
}

async function processFailedPayment(transaction: any, webhookData: PushinPayWebhookData) {
  try {
    console.log(`[PushinPay] Processando pagamento ${webhookData.status} - Transação ${transaction.id}`);
    
    // Atualizar status da transação
    await storage.updateTransactionStatus(
      transaction.id,
      "failed",
      webhookData.id,
      undefined,
      webhookData
    );
    
    console.log(`[PushinPay] Transação ${transaction.id} marcada como ${webhookData.status}`);
    
  } catch (error) {
    console.error("[PushinPay] Erro ao processar pagamento falho:", error);
    throw error;
  }
}

async function checkAndApplyFirstDepositBonus(user: any, depositAmount: number) {
  try {
    // Verificar se o bônus de primeiro depósito está habilitado
    const settings = await storage.getSystemSettings();
    if (!settings?.firstDepositBonusEnabled) {
      return;
    }
    
    // Verificar se o usuário já recebeu um bônus de primeiro depósito
    const existingBonus = await storage.getUserBonusByType(user.id, 'first_deposit');
    if (existingBonus) {
      console.log(`[Bônus] Usuário ${user.username} já recebeu bônus de primeiro depósito`);
      return;
    }
    
    // Verificar se este é realmente o primeiro depósito
    const completedDeposits = await storage.getUserCompletedDeposits(user.id);
    if (completedDeposits.length > 1) {
      console.log(`[Bônus] Usuário ${user.username} já possui ${completedDeposits.length} depósitos confirmados`);
      return;
    }
    
    // Calcular valor do bônus
    const bonusPercentage = settings.firstDepositBonusPercentage || 100;
    const maxBonusAmount = settings.firstDepositBonusMaxAmount || 200;
    let bonusAmount = (depositAmount * bonusPercentage) / 100;
    
    if (bonusAmount > maxBonusAmount) {
      bonusAmount = maxBonusAmount;
    }
    
    // Aplicar bônus
    await storage.createUserBonus({
      userId: user.id,
      type: 'first_deposit',
      amount: bonusAmount,
      rolloverRequirement: settings.firstDepositBonusRollover || 2,
      expiresAt: new Date(Date.now() + (settings.firstDepositBonusExpiration || 7) * 24 * 60 * 60 * 1000),
      isActive: true,
      description: `Bônus de primeiro depósito (${bonusPercentage}% até R$ ${maxBonusAmount})`
    });
    
    // Atualizar saldo de bônus do usuário
    await storage.updateUserBonusBalance(user.id, bonusAmount);
    
    console.log(`[Bônus] Bônus de primeiro depósito aplicado:
      - Usuário: ${user.username}
      - Depósito: R$ ${depositAmount}
      - Bônus: R$ ${bonusAmount} (${bonusPercentage}%)
      - Rollover: ${settings.firstDepositBonusRollover}x
    `);
    
  } catch (error) {
    console.error("[Bônus] Erro ao verificar/aplicar bônus de primeiro depósito:", error);
    // Não interrompemos o processo principal por erro no bônus
  }
}