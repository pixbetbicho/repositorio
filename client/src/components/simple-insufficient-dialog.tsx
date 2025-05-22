import React, { useEffect } from 'react';
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Wallet } from "lucide-react";
import { requestOpenDepositDialog } from "@/components/direct-deposit-dialog";

interface SimpleInsufficientDialogProps {
  requiredAmount: number;
  currentBalance: number;
  hasBonusBalance: boolean;
  bonusBalance: number;
  onDeposit: () => void;
  onUseBonusBalance: () => void;
  onClose: () => void;
}

export function SimpleInsufficientDialog({
  requiredAmount,
  currentBalance,
  hasBonusBalance,
  bonusBalance,
  onDeposit,
  onUseBonusBalance,
  onClose
}: SimpleInsufficientDialogProps) {
  const missing = requiredAmount - currentBalance;
  const canUseBonusBalance = hasBonusBalance && bonusBalance >= requiredAmount;
  
  // Adicionar listener para eventos globais
  useEffect(() => {
    // Função para fechar este diálogo quando solicitado globalmente
    const handleCloseAllDialogs = () => {
      console.log("📫 SimpleInsufficientDialog recebeu solicitação para fechar");
      onClose();
    };
    
    // Quando o diálogo de depósito for aberto
    const handleDepositDialogOpened = () => {
      console.log("📫 SimpleInsufficientDialog detectou diálogo de depósito aberto");
      onClose();
    };
    
    // Registrar listeners
    window.addEventListener('close-all-dialogs', handleCloseAllDialogs);
    window.addEventListener('deposit-dialog-opened', handleDepositDialogOpened);
    
    // Cleanup ao desmontar
    return () => {
      window.removeEventListener('close-all-dialogs', handleCloseAllDialogs);
      window.removeEventListener('deposit-dialog-opened', handleDepositDialogOpened);
    };
  }, [onClose]);
  
  // Função para fechar este diálogo e solicitar a abertura do diálogo de depósito global
  const handleDepositClick = () => {
    console.log("Botão Depositar Agora clicado - usando sistema global independente");
    
    // Fechar imediatamente o diálogo atual
    onClose();
    
    // Notificar o componente pai
    if (onDeposit) {
      onDeposit();
    }
    
    // Solicitar abertura do diálogo de depósito global
    // Esta função se encarregará de fechar todos os diálogos antes de abrir o de depósito
    requestOpenDepositDialog();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="h-6 w-6" />
          <h2 className="text-xl font-bold">Saldo Insuficiente</h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          Você não tem saldo suficiente para realizar esta aposta.
          {canUseBonusBalance && ' Mas você pode usar seu saldo de bônus disponível!'}
        </p>
        
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-500">Valor da aposta:</div>
            <div className="text-right font-medium">{formatCurrency(requiredAmount, false)}</div>
            
            <div className="text-gray-500">Seu saldo atual:</div>
            <div className="text-right font-medium">{formatCurrency(currentBalance, false)}</div>
            
            {hasBonusBalance && (
              <>
                <div className="text-gray-500">Seu saldo de bônus:</div>
                <div className="text-right font-medium text-primary font-bold">{formatCurrency(bonusBalance, false)}</div>
              </>
            )}
            
            <div className="text-gray-500">Faltam:</div>
            <div className="text-right font-medium text-red-500">{formatCurrency(missing, false)}</div>
          </div>
          
          {canUseBonusBalance && (
            <div className="rounded-md border p-3 mt-2 bg-green-50">
              <p className="text-sm text-green-700">
                Você tem saldo de bônus suficiente para fazer esta aposta.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          {!canUseBonusBalance && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
          
          {canUseBonusBalance ? (
            <>
              <Button 
                onClick={handleDepositClick}
                variant="outline" 
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <CreditCard className="h-4 w-4" />
                Depositar Agora
              </Button>
              
              <Button 
                onClick={onUseBonusBalance} 
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Wallet className="h-4 w-4" />
                Usar Saldo de Bônus
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleDepositClick}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CreditCard className="h-4 w-4" />
              Depositar Agora
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}