import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { UserStats } from "@/components/user-stats";
import { UpcomingDrawsCard, UserActionsCard } from "@/components/stats-card";
import { RecentBets } from "@/components/recent-bets";
import { TransactionHistory } from "@/components/transaction-history";
import { BetWithDetails } from "@/types";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { UserSettingsDialog } from "@/components/user-settings-dialog";
import { QuickBetDialog } from "@/components/quick-bet-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

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
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 relative">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1">Olá, {user.username}!</h2>
              <p className="text-white/70 text-sm">Bem-vindo(a) ao seu painel de controle</p>
            </div>
            
            {/* Saldo destacado */}
            <div className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white mt-3 sm:mt-0 w-full sm:w-auto">
              <p className="text-xs text-white/70 mb-1">Seu saldo disponível</p>
              <div className="flex items-center justify-between sm:justify-start">
                <span className="text-xl font-bold tracking-wide">R$ {user.balance.toFixed(2)}</span>
                <button 
                  onClick={handleDeposit}
                  className="ml-3 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-3 py-1 text-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Depositar
                </button>
              </div>
            </div>
          </div>

          {/* Botão de fazer aposta destacado */}
          <button
            onClick={() => setQuickBetOpen(true)}
            className="w-full sm:w-auto sm:absolute sm:right-6 sm:top-1/2 sm:transform sm:-translate-y-1/2 bg-white text-primary hover:brightness-110 font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center mb-6 sm:mb-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Fazer Nova Aposta
          </button>

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
              onBet={() => setQuickBetOpen(true)}
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
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="bets" className="text-sm sm:text-base">Apostas Recentes</TabsTrigger>
              <TabsTrigger value="transactions" className="text-sm sm:text-base">Transações</TabsTrigger>
            </TabsList>
            <TabsContent value="bets" id="recent-bets">
              <RecentBets />
            </TabsContent>
            <TabsContent value="transactions">
              <TransactionHistory />
            </TabsContent>
          </Tabs>
        </div>
      </main>



      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />
      <UserSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <QuickBetDialog open={quickBetOpen} onOpenChange={setQuickBetOpen} />
    </div>
  );
}
