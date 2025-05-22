import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { UserStats } from "@/components/user-stats";
import { UpcomingDrawsCard, UserActionsCard } from "@/components/stats-card";
import { RecentBets } from "@/components/recent-bets";
import { TransactionHistory } from "@/components/transaction-history";
import { BetWithDetails, Animal, Draw, GameMode } from "@/types";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { UserSettingsDialog } from "@/components/user-settings-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Importar o componente de apostas via adaptador
import { UserBetForm } from "@/components/user-bet-form";
// Importar o componente de bônus
import { UserBonuses } from "@/components/user-bonuses";
// Importar o componente de exibição de saldo de bônus
import { BonusBalanceDisplay } from "@/components/bonus-balance-display";

export default function UserDashboard() {
  const { user } = useAuth();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickBetOpen, setQuickBetOpen] = useState(false);

  const { data: betsResponse, isLoading: betsLoading } = useQuery<{
    data: BetWithDetails[],
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }
  }>({
    queryKey: ["/api/bets"],
  });

  // Extrair os dados das apostas da resposta paginada
  const bets = betsResponse?.data || [];
  
  // Buscar o valor total de ganhos do usuário diretamente do backend
  const { data: winningsData, isLoading: winningsLoading } = useQuery<{ totalWinnings: number }>({
    queryKey: ["/api/user/winnings"],
  });

  // Calculate total stats for user dashboard
  const totalBets = betsResponse?.meta?.total || 0;
  const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0) || 0;
  // Usar o valor total de ganhos do backend em vez de calcular apenas a partir da primeira página
  const totalWinnings = winningsData?.totalWinnings || 0;

  const handleDeposit = () => {
    setDepositOpen(true);
  };

  const handleWithdraw = () => {
    setWithdrawOpen(true);
  };

  const handleHistory = () => {
    // Already on the history view
    window.scrollTo({
      top: document.getElementById('recent-bets')?.offsetTop || 0,
      behavior: 'smooth'
    });
  };

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Header com informações principais e ações de destaque */}
        <div className="bg-primary rounded-2xl shadow-xl p-4 sm:p-6 text-white mb-4 relative overflow-hidden">
          
          <div className="grid sm:grid-cols-3 gap-4 mb-4 relative">
            <div className="sm:col-span-1">
              <h2 className="text-xl sm:text-2xl font-bold mb-1">Olá, {user.username}!</h2>
              <p className="text-white/70 text-sm">Bem-vindo(a) ao seu painel de controle</p>
            </div>

            {/* Botão de fazer aposta (centro) */}
            <div className="sm:col-span-1 flex items-center justify-center">
              <button
                onClick={() => {
                  console.log("Botão 'Fazer Nova Aposta' clicado!");
                  setQuickBetOpen(true);
                  console.log("Estado quickBetOpen alterado para:", true);
                }}
                className="w-full sm:w-auto bg-white text-primary hover:brightness-110 font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Fazer Nova Aposta
              </button>
            </div>
            
            {/* Saldo destacado (direita) */}
            <div className="sm:col-span-1 bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white">
              <p className="text-xs text-white/70 mb-1">Seus saldos</p>
              <div className="flex flex-col items-end">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold tracking-wide">R$ {user.balance.toFixed(2)}</span>
                    <BonusBalanceDisplay />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handleDeposit}
                      className="ml-3 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-3 py-1 text-sm font-medium flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Depositar
                    </button>
                    <button 
                      onClick={handleWithdraw}
                      className="ml-3 bg-green-500/60 hover:bg-green-500/80 transition-colors rounded-lg px-3 py-1 text-sm font-medium flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Sacar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-3 text-center relative">
            <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-3">
              <p className="text-sm opacity-80 mb-1">Apostas</p>
              <p className="text-lg font-bold">{totalBets}</p>
            </div>
            <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-3">
              <p className="text-sm opacity-80 mb-1">Apostado</p>
              <p className="text-lg font-bold">R${totalBetAmount.toFixed(0)}</p>
            </div>
            <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-3">
              <p className="text-sm opacity-80 mb-1">Ganhos</p>
              <p className="text-lg font-bold text-green-300">R${totalWinnings.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* Bloco de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2 lg:col-span-1 order-1 lg:order-1">
            <UserActionsCard 
              onDeposit={handleDeposit} 
              onWithdraw={handleWithdraw}
              onHistory={handleHistory}
              onSettings={handleSettings}
              onBet={() => {
                console.log("Botão 'Apostar' clicado no card!");
                setQuickBetOpen(true);
                console.log("Estado quickBetOpen alterado para:", true);
              }}
            />
          </div>
          
          <div className="md:col-span-2 lg:col-span-1 order-3 lg:order-2">
            <UpcomingDrawsCard />
          </div>
          
          <UserStats 
            totalBets={totalBets}
            totalBetAmount={totalBetAmount}
            totalWinnings={totalWinnings}
            isLoading={betsLoading}
          />
        </div>

        {/* Abas de histórico */}
        <div id="history" className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4">
          <Tabs defaultValue="bets" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="bets" className="text-sm sm:text-base">Apostas Recentes</TabsTrigger>
              <TabsTrigger value="transactions" className="text-sm sm:text-base">Transações</TabsTrigger>
              <TabsTrigger value="bonuses" className="text-sm sm:text-base">Bônus</TabsTrigger>
            </TabsList>
            <TabsContent value="bets" id="recent-bets">
              <RecentBets />
            </TabsContent>
            <TabsContent value="transactions">
              <TransactionHistory />
            </TabsContent>
            <TabsContent value="bonuses">
              <UserBonuses />
            </TabsContent>
          </Tabs>
        </div>
      </main>



      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />
      <UserSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {/* Usar diretamente o componente MobileBetWizardNew dentro de um Dialog */}
      <Dialog open={quickBetOpen} onOpenChange={setQuickBetOpen}>
        <DialogContent className="w-[95%] max-w-md p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Fazer Aposta</DialogTitle>
            <DialogDescription>Escolha sua aposta</DialogDescription>
          </DialogHeader>
          
          {/* Buscar dados para o componente de apostas */}
          <UserBetForm 
            onComplete={() => setQuickBetOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
