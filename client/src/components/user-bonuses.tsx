import { UserBonus } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Gift, Info } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

export function UserBonuses() {
  const { data: bonuses, isLoading } = useQuery<UserBonus[]>({
    queryKey: ['/api/user/bonuses'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!bonuses || bonuses.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Gift className="h-5 w-5 mr-2 text-primary" />
            Bônus Disponíveis
          </CardTitle>
          <CardDescription>Você não possui nenhum bônus ativo no momento</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Gift className="h-5 w-5 mr-2 text-primary" />
          Bônus Ativos
        </CardTitle>
        <CardDescription>Seus bônus disponíveis e progresso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bonuses.map((bonus) => (
          <TooltipProvider key={bonus.id}>
            <div className="border rounded-md p-4 bg-card shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">
                  {bonus.type === 'signup'
                    ? 'Bônus de Cadastro'
                    : bonus.type === 'first_deposit'
                    ? 'Bônus de Primeiro Depósito'
                    : 'Bônus Promocional'}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      {bonus.type === 'signup'
                        ? 'Bônus concedido por cadastro na plataforma'
                        : bonus.type === 'first_deposit'
                        ? 'Bônus concedido no seu primeiro depósito'
                        : 'Bônus promocional'}
                    </p>
                    <p className="mt-1">
                      Você precisa cumprir o requisito de rollover para poder sacar o valor do bônus.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="text-2xl font-bold mb-1">R$ {bonus.amount.toFixed(2)}</div>

              <div className="text-sm text-muted-foreground mb-2">
                Expira em: {format(new Date(bonus.expiresAt || Date.now()), 'dd/MM/yyyy', { locale: ptBR })}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Progresso de Rollover</span>
                  <span>
                    {bonus.rolledAmount.toFixed(2)} / {bonus.rolloverAmount.toFixed(2)}
                  </span>
                </div>
                <Progress 
                  value={(bonus.rolledAmount / bonus.rolloverAmount) * 100} 
                  className="h-2" 
                />
              </div>
            </div>
          </TooltipProvider>
        ))}
      </CardContent>
    </Card>
  );
}