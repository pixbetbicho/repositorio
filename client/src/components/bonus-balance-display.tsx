import { useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';

export function BonusBalanceDisplay() {
  // Consultar o saldo de bônus usando o novo endpoint
  const { data, isLoading, error } = useQuery<{ bonusBalance: number }>({
    queryKey: ['/api/user/bonus-balance'],
  });
  
  // Se estiver carregando, mostre um indicador de carregamento sutil
  if (isLoading) {
    return (
      <div className="flex items-center text-xs text-white/70 mt-1">
        <span className="inline-block h-2 w-2 rounded-full bg-white/50 animate-pulse mr-1"></span>
        <span>Carregando bônus...</span>
      </div>
    );
  }
  
  // Se ocorrer um erro, não exiba nada (erro silencioso)
  if (error || !data) {
    return null;
  }
  
  // Se não houver saldo de bônus, não exiba nada
  if (data.bonusBalance === 0) {
    return null;
  }
  
  // Exibir o saldo de bônus
  return (
    <div className="flex items-center text-xs text-yellow-300 mt-1">
      <Gift className="h-3 w-3 mr-1" />
      <span>+ R$ {data.bonusBalance.toFixed(2)} em bônus</span>
    </div>
  );
}