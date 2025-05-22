import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface InsufficientBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredAmount: number;
  currentBalance: number;
  onDeposit: () => void;
  onUseBonusBalance?: () => void; // Callback para quando o usuário escolher usar saldo de bônus
}

export function InsufficientBalanceDialog({
  open,
  onOpenChange,
  requiredAmount,
  currentBalance,
  onDeposit,
  onUseBonusBalance
}: InsufficientBalanceDialogProps) {
  const missing = requiredAmount - currentBalance;
  const [hasBonusBalance, setHasBonusBalance] = useState(false);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [allowBonusBets, setAllowBonusBets] = useState(false);

  // Buscar saldo de bônus do usuário
  const { data: bonusBalanceData } = useQuery<{ bonusBalance: number }>({
    queryKey: ["/api/user/bonus-balance"],
    enabled: open // Só faz a requisição quando o diálogo estiver aberto
  });

  // Buscar configurações do sistema
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/system-settings"],
    enabled: open // Só faz a requisição quando o diálogo estiver aberto
  });

  // Atualizar estado quando os dados forem recebidos
  useEffect(() => {
    console.log("🧮 Bonus balance data:", bonusBalanceData);
    console.log("⚙️ System settings:", systemSettings);
    
    if (bonusBalanceData !== undefined) {
      const bonusBalance = bonusBalanceData.bonusBalance || 0;
      setBonusBalance(bonusBalance);
      const hasSufficientBonus = bonusBalance >= requiredAmount;
      console.log("💵 Bonus balance check:", { bonusBalance, requiredAmount, hasSufficientBonus });
      setHasBonusBalance(hasSufficientBonus);
    }
    
    if (systemSettings !== undefined) {
      // Garante que a propriedade será buscada corretamente do objeto com fallback para true
      // para garantir que o usuário possa usar bônus se a propriedade não estiver definida
      const allowBonusBets = systemSettings?.allowBonusBets !== false;
      console.log("🎮 Checking if bonus bets are allowed:", allowBonusBets, "Setting from:", systemSettings);
      setAllowBonusBets(allowBonusBets);
    } else {
      // Fallback para true se as configurações não estiverem disponíveis
      console.log("⚠️ System settings not available, defaulting allowBonusBets to true");
      setAllowBonusBets(true);
    }
  }, [bonusBalanceData, systemSettings, requiredAmount]);

  const canUseBonusBalance = hasBonusBalance && allowBonusBets;

  // Log forçado para verificar quando o componente é renderizado e seu estado atual
  console.log("💰 RENDERIZANDO INSUFICIENT_BALANCE_DIALOG", { 
    open, 
    requiredAmount, 
    currentBalance, 
    bonusBalance, 
    hasBonusBalance, 
    allowBonusBets, 
    canUseBonusBalance 
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} defaultOpen={open}>
      <DialogContent className="sm:max-w-[425px] z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Saldo Insuficiente Para Aposta
          </DialogTitle>
          <DialogDescription>
            Você não tem saldo suficiente para realizar esta aposta.
            {canUseBonusBalance && ' Mas você pode usar seu saldo de bônus disponível!'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-muted-foreground">Valor da aposta:</div>
            <div className="text-right font-medium">{formatCurrency(requiredAmount, false)}</div>
            
            <div className="text-muted-foreground">Seu saldo atual:</div>
            <div className="text-right font-medium">{formatCurrency(currentBalance, false)}</div>
            
            {hasBonusBalance && (
              <>
                <div className="text-muted-foreground">Seu saldo de bônus:</div>
                <div className="text-right font-medium text-primary font-bold">{formatCurrency(bonusBalance, false)}</div>
              </>
            )}
            
            <div className="text-muted-foreground">Faltam:</div>
            <div className="text-right font-medium text-destructive">{formatCurrency(missing, false)}</div>
          </div>
          
          {canUseBonusBalance && (
            <div className="rounded-md border p-3 mt-2 bg-green-50">
              <p className="text-sm text-green-700">
                Você tem saldo de bônus suficiente para fazer esta aposta. 
                Feche esta mensagem e selecione a opção "Usar saldo de bônus" ao fazer sua aposta.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canUseBonusBalance ? 'Voltar para Apostar' : 'Cancelar'}
          </Button>
          {canUseBonusBalance ? (
            <Button 
              onClick={() => {
                if (onUseBonusBalance) {
                  onUseBonusBalance();
                }
                onOpenChange(false);
              }} 
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Wallet className="h-4 w-4" />
              Usar Saldo de Bônus
            </Button>
          ) : (
            <Button onClick={onDeposit} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Depositar Agora
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
