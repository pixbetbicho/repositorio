import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { AdminStats } from "@/components/admin-stats";
import { DrawManagement } from "@/components/draw-management";
import { RecentUsers } from "@/components/recent-users";
import { PopularGroups } from "@/components/popular-groups";
import { BetManagement } from "@/components/bet-management";
import { UserManagement } from "@/components/user-management";
import { DrawResults } from "@/components/draw-results";
import { AdminDashboardMetrics } from "@/components/admin-dashboard-metrics";
import { GameModesManagement } from "@/components/game-modes-management";
import { SalesReport } from "@/components/sales-report";
import { BetDischarge } from "@/components/bet-discharge";
import { SystemSettings } from "@/components/system-settings";
import { PaymentGatewayManagement } from "@/components/payment-gateway-management";
import { FinancialReports } from "@/components/financial-reports";
import { User, Bet } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  Users, 
  GanttChart, 
  DollarSign, 
  Trophy, 
  Settings,
  Sliders,
  BarChart,
  Shield,
  Cog,
  Menu,
  X,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

// Definir os itens do menu
const menuItems = [
  { id: "dashboard", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard" },
  { id: "users", icon: <Users className="h-5 w-5" />, label: "Usuários" },
  { id: "draws", icon: <GanttChart className="h-5 w-5" />, label: "Sorteios" },
  { id: "bets", icon: <DollarSign className="h-5 w-5" />, label: "Apostas" },
  { id: "results", icon: <Trophy className="h-5 w-5" />, label: "Resultados" },
  { id: "quotations", icon: <Sliders className="h-5 w-5" />, label: "Cotações" },
  { id: "reports", icon: <BarChart className="h-5 w-5" />, label: "Relatórios" },
  { id: "financial", icon: <CreditCard className="h-5 w-5" />, label: "Financeiro" },
  { id: "discharge", icon: <Shield className="h-5 w-5" />, label: "Descarrego" },
  { id: "payment", icon: <CreditCard className="h-5 w-5" />, label: "Integração" },
  { id: "system", icon: <Cog className="h-5 w-5" />, label: "Sistema" },
  { id: "stats", icon: <Settings className="h-5 w-5" />, label: "Estatísticas" }
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Atualizando para a nova estrutura de dados com paginação
  const { data: betsData } = useQuery<{ data: Bet[], meta: { total: number, page: number, pageSize: number, totalPages: number } }>({
    queryKey: ["/api/admin/bets"],
  });
  
  // Criando uma referência para os dados das apostas para manter compatibilidade com o código existente
  const bets = betsData?.data || [];

  // Calculate admin stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeUsers = users?.length || 0;
  
  const todayBets = bets?.filter(bet => {
    const betDate = new Date(bet.createdAt);
    return betDate >= today;
  }) || [];
  
  const todayRevenue = todayBets.reduce((sum, bet) => sum + bet.amount, 0);
  
  const totalPaidOut = bets?.reduce((sum, bet) => {
    if (bet.status === "won" && bet.winAmount) {
      return sum + bet.winAmount;
    }
    return sum;
  }, 0) || 0;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setMobileMenuOpen(false);
  };

  // Make sure user is admin
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  // Renderiza o conteúdo apropriado com base na aba ativa
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <AdminStats 
              activeUsers={activeUsers}
              todayRevenue={todayRevenue}
              todayBets={todayBets.length}
              totalPaidOut={totalPaidOut}
            />
            <AdminDashboardMetrics />
          </>
        );
      case "users":
        return <UserManagement />;
      case "draws":
        return <DrawManagement />;
      case "bets":
        return <BetManagement />;
      case "results":
        return <DrawResults />;
      case "quotations":
        return <GameModesManagement />;
      case "reports":
        return <SalesReport />;
      case "financial":
        return <FinancialReports />;
      case "discharge":
        return <BetDischarge />;
      case "payment":
        return <PaymentGatewayManagement />;
      case "system":
        return <SystemSettings />;
      case "stats":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentUsers />
            <PopularGroups />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="lg:flex">
        {/* Menu lateral para desktop */}
        <div className="hidden lg:block w-64 bg-white shadow-md h-[calc(100vh-64px)] fixed">
          <div className="p-4 border-b">
            <h2 className="font-bold text-xl">Painel Admin</h2>
            <p className="text-sm text-gray-500">{user?.name || user?.username}</p>
          </div>
          
          <nav className="mt-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 130px)' }}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center w-full px-4 py-3 text-left space-x-3 ${
                  activeTab === item.id 
                    ? "bg-primary/10 text-primary border-l-4 border-primary" 
                    : "hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo principal */}
        <main className="lg:ml-64 w-full px-2 sm:px-4 py-3">
          {/* Cabeçalho mobile com botão do menu */}
          <div className="lg:hidden flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm sticky top-0 z-20">
            <h1 className="text-lg font-bold">{menuItems.find(item => item.id === activeTab)?.label || "Painel"}</h1>
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80%] max-w-[300px] p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b flex justify-between items-center bg-primary text-white">
                    <h2 className="font-bold">Painel Admin</h2>
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="text-white hover:bg-primary-dark hover:text-white">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="p-3 border-b">
                    <p className="text-sm font-medium">{user?.name || user?.username}</p>
                    <p className="text-xs text-gray-500">Administrador</p>
                  </div>
                  
                  <div className="flex-1 overflow-auto py-2">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`flex items-center w-full px-4 py-3 text-left space-x-3 ${
                          activeTab === item.id 
                            ? "bg-primary/10 text-primary border-l-4 border-primary font-medium" 
                            : "hover:bg-gray-100"
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Grid de estatísticas rápidas para mobile */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-2 gap-2 mb-4 lg:hidden">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-primary mr-1" />
                  <p className="text-xs text-gray-500">Usuários</p>
                </div>
                <p className="text-lg font-bold mt-1">{activeUsers}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                  <p className="text-xs text-gray-500">Apostas Hoje</p>
                </div>
                <p className="text-lg font-bold mt-1">{todayBets.length}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <BarChart className="h-4 w-4 text-blue-500 mr-1" />
                  <p className="text-xs text-gray-500">Receita</p>
                </div>
                <p className="text-lg font-bold mt-1">R$ {todayRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                  <p className="text-xs text-gray-500">Total Pago</p>
                </div>
                <p className="text-lg font-bold mt-1">R$ {totalPaidOut.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Conteúdo principal dinâmico */}
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm overflow-x-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}