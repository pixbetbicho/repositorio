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
import { BonusSettingsNew } from "@/components/bonus-settings-new";
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
  CreditCard,
  Calendar,
  TicketCheck,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet";
import * as SheetPrimitive from "@radix-ui/react-dialog";

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
  { id: "bonus", icon: <Gift className="h-5 w-5" />, label: "Bônus" },
  { id: "stats", icon: <Settings className="h-5 w-5" />, label: "Estatísticas" }
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  
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

  // Make sure user is admin
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }
  
  // Lista completa de menus para versão mobile - usando os mesmos itens do menu lateral
  const mobileMenus = menuItems;

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
      case "bonus":
        return <BonusSettingsNew />;
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

  // Adicionando estado para controlar o menu mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex relative">
        {/* Menu lateral para desktop */}
        <div className="hidden lg:block w-64 h-[calc(100vh-64px)] bg-white shadow-md sticky top-[64px] left-0 overflow-y-auto">
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
        <main className="flex-1 w-full px-2 sm:px-4 py-3">
          {/* Menu grid para mobile - sem barra de rolagem */}
          <div className="lg:hidden mb-4">
            <h1 className="text-lg font-bold mb-3 px-1">{menuItems.find(item => item.id === activeTab)?.label || "Painel Admin"}</h1>
            
            <div className="grid grid-cols-4 gap-2 border-b pb-2">
              {mobileMenus.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded ${activeTab === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {item.icon}
                  <span className="text-[10px] mt-1 text-center leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
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