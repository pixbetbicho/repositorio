import { useState, useEffect } from "react";
import { format, subDays, endOfDay, startOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  FileDown,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  RefreshCw,
  TimerIcon,
  InfoIcon,
  AlertTriangle,
  CircleDollarSign,
  DollarSign
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  PaymentTransaction,
  Withdrawal,
  WithdrawalStatus,
  TransactionType
} from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

export function FinancialReports() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  
  const [activeTab, setActiveTab] = useState("deposits");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Estados para o AlertDialog de saldo insuficiente
  const [showGatewayAlert, setShowGatewayAlert] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ message: string, withdrawalId?: number, amount?: number, balance?: number }>({ message: "" });
  
  // Estado para controlar o carregamento das operações
  const [processingWithdrawal, setProcessingWithdrawal] = useState<number | null>(null);
  
  // Notificações
  const { toast } = useToast();
  
  // Consulta de transações de depósito
  const { data: deposits, isLoading: isLoadingDeposits } = useQuery<PaymentTransaction[]>({
    queryKey: ["/api/admin/transactions", "deposit", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: "deposit",
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      });
      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao buscar depósitos");
      return res.json();
    },
    enabled: activeTab === "deposits" || activeTab === "summary"
  });
  
  // Consulta de transações de saque
  const { data: withdrawals, isLoading: isLoadingWithdrawals } = useQuery<Withdrawal[]>({
    queryKey: ["/api/admin/withdrawals", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      const res = await fetch(`/api/admin/withdrawals?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao buscar saques");
      return res.json();
    },
    enabled: activeTab === "withdrawals" || activeTab === "summary"
  });
  
  // Consulta do resumo financeiro
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["/api/admin/transactions/summary", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      });
      const res = await fetch(`/api/admin/transactions/summary?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao buscar resumo financeiro");
      return res.json();
    },
    enabled: activeTab === "summary"
  });
  
  // Consulta do saldo disponível no gateway
  const { data: gatewayBalance, isLoading: isLoadingGatewayBalance, refetch: refetchGatewayBalance } = useQuery({
    queryKey: ["/api/admin/gateway-balance"],
    queryFn: async () => {
      const res = await fetch("/api/admin/gateway-balance");
      if (!res.ok) throw new Error("Falha ao buscar saldo do gateway");
      return res.json();
    },
    enabled: activeTab === "withdrawals"
  });
  
  // QueryClient para manipular o cache
  const queryClient = useQueryClient();
  
  // Função para aprovar um saque
  const approveWithdrawal = async (withdrawalId: number) => {
    try {
      setProcessingWithdrawal(withdrawalId);
      
      // Verificar primeiro se há saldo disponível no gateway
      await refetchGatewayBalance();
      
      if (!gatewayBalance || !gatewayBalance.balance) {
        toast({
          title: "Erro ao verificar saldo",
          description: "Não foi possível verificar o saldo disponível no gateway de pagamento",
          variant: "destructive"
        });
        setProcessingWithdrawal(null);
        return;
      }
      
      // Obter detalhes do saque a ser aprovado
      const withdrawal = withdrawals?.find(w => w.id === withdrawalId);
      if (!withdrawal) {
        toast({
          title: "Erro",
          description: "Saque não encontrado",
          variant: "destructive"
        });
        setProcessingWithdrawal(null);
        return;
      }
      
      // Verificar se o saldo é suficiente
      if (gatewayBalance.balance < withdrawal.amount) {
        setAlertInfo({
          message: "Saldo insuficiente no gateway de pagamento",
          withdrawalId,
          amount: withdrawal.amount,
          balance: gatewayBalance.balance
        });
        setShowGatewayAlert(true);
        setProcessingWithdrawal(null);
        return;
      }
      
      // Enviar solicitação para aprovar o saque
      const res = await apiRequest("PATCH", `/api/admin/withdrawals/${withdrawalId}/status`, {
        status: "approved",
        notes: `Aprovado manualmente. Saldo disponível: R$ ${gatewayBalance.balance.toFixed(2)}`
      });
      
      if (res.ok) {
        toast({
          title: "Saque aprovado",
          description: "O saque foi aprovado e está em processamento pelo gateway",
        });
        
        // Atualizar o cache após o sucesso
        await queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      } else {
        const error = await res.json();
        toast({
          title: "Erro ao aprovar saque",
          description: error.message || "Ocorreu um erro ao aprovar o saque",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao aprovar saque:", error);
      toast({
        title: "Erro ao aprovar saque",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setProcessingWithdrawal(null);
    }
  };
  
  // Função para rejeitar um saque
  const rejectWithdrawal = async (withdrawalId: number) => {
    try {
      setProcessingWithdrawal(withdrawalId);
      
      // Enviar solicitação para rejeitar o saque
      const res = await apiRequest("PATCH", `/api/admin/withdrawals/${withdrawalId}/status`, {
        status: "rejected",
        rejectionReason: "Rejeitado manualmente pelo administrador"
      });
      
      if (res.ok) {
        toast({
          title: "Saque rejeitado",
          description: "O saque foi rejeitado com sucesso",
        });
        
        // Atualizar o cache após o sucesso
        await queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      } else {
        const error = await res.json();
        toast({
          title: "Erro ao rejeitar saque",
          description: error.message || "Ocorreu um erro ao rejeitar o saque",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao rejeitar saque:", error);
      toast({
        title: "Erro ao rejeitar saque",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setProcessingWithdrawal(null);
    }
  };
  
  // Função para exportar transações para CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    // Criar cabeçalhos com base na primeira linha de dados
    const headers = Object.keys(data[0]);
    
    // Converter dados para CSV
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(header => `"${row[header] || ""}"`).join(","))
    ].join("\n");
    
    // Criar e baixar o arquivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Função para formatar o status de um depósito
  const getDepositStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1"><TimerIcon className="h-3 w-3" /> Pendente</Badge>;
      case "completed":
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>;
      case "failed":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Falhou</Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1"><InfoIcon className="h-3 w-3" /> {status}</Badge>;
    }
  };
  
  // Função para formatar o status de um saque
  const getWithdrawalStatusBadge = (status: WithdrawalStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1"><TimerIcon className="h-3 w-3" /> Pendente</Badge>;
      case "processing":
        return <Badge variant="warning" className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Em Processamento</Badge>;
      case "approved":
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Aprovado</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary" className="flex items-center gap-1"><InfoIcon className="h-3 w-3" /> {status}</Badge>;
    }
  };
  
  // Filtragem com base no intervalo de datas
  const filteredDeposits = deposits?.filter(tx => {
    // Usar campo createdAt para transações
    const txDate = new Date(tx.createdAt);
    return isWithinInterval(txDate, {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to)
    });
  }) || [];
  
  const filteredWithdrawals = withdrawals?.filter(tx => {
    // Usar campo requestedAt para saques
    const txDate = new Date(tx.requestedAt);
    return isWithinInterval(txDate, {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to)
    });
  }) || [];
  
  // Cálculos de totais
  const totalDepositsAmount = filteredDeposits.reduce((sum, tx) => 
    tx.status === "completed" ? sum + tx.amount : sum, 0);
  
  const totalWithdrawalsAmount = filteredWithdrawals.reduce((sum, tx) => 
    tx.status === "approved" ? sum + tx.amount : sum, 0);
  
  const totalPendingWithdrawals = filteredWithdrawals.filter(tx => 
    tx.status === "pending").length;
    
  const totalPendingWithdrawalsAmount = filteredWithdrawals
    .filter(tx => tx.status === "pending")
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  return (
    <Card className="w-full">
      {/* AlertDialog para saldo insuficiente */}
      <AlertDialog open={showGatewayAlert} onOpenChange={setShowGatewayAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Atenção: Saldo insuficiente no gateway
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Não é possível aprovar o saque pois o saldo disponível no gateway de pagamento é insuficiente.</p>
              
              {alertInfo.amount && alertInfo.balance && (
                <div className="bg-muted p-4 rounded-md space-y-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span>Valor do saque:</span>
                    <span className="font-semibold text-red-500">
                      R$ {alertInfo.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Saldo disponível:</span>
                    <span className="font-semibold text-amber-500">
                      R$ {alertInfo.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                    <span>Saldo necessário:</span>
                    <span className="font-semibold text-destructive">
                      R$ {Math.max(0, alertInfo.amount - alertInfo.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
              
              <p className="mt-4">Por favor, adicione fundos ao gateway antes de aprovar este saque.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <Button variant="outline" className="gap-2" onClick={() => refetchGatewayBalance()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar saldo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Relatórios Financeiros
        </CardTitle>
        <CardDescription>
          Analise depósitos, saques e o fluxo financeiro da plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="w-full sm:w-1/2 md:w-1/3">
              <Label htmlFor="date-range" className="mb-2 block">Período</Label>
              <DateRangePicker 
                dateRange={dateRange} 
                onChange={(range: DateRange | undefined) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }} 
              />
            </div>
            
            {activeTab === "withdrawals" && (
              <div className="w-full sm:w-1/2 md:w-1/3">
                <Label htmlFor="status-filter" className="mb-2 block">Status</Label>
                <Select 
                  value={statusFilter} 
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger id="status-filter" className="w-full">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="processing">Em Processamento</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Tabs para alternar entre visões */}
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="deposits">Depósitos</TabsTrigger>
              <TabsTrigger value="withdrawals">Saques</TabsTrigger>
            </TabsList>
            
            {/* Tab de Resumo Geral */}
            <TabsContent value="summary">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Depósitos</p>
                          <div className="text-xl sm:text-2xl font-bold text-green-600 flex items-center gap-1">
                            <ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                            R$ {totalDepositsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <Badge variant="outline">{filteredDeposits.length}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Saques</p>
                          <div className="text-xl sm:text-2xl font-bold text-red-600 flex items-center gap-1">
                            <ArrowUpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                            R$ {totalWithdrawalsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <Badge variant="outline">{filteredWithdrawals.filter(w => w.status === "approved").length}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                          <div className={cn(
                            "text-xl sm:text-2xl font-bold",
                            totalDepositsAmount - totalWithdrawalsAmount >= 0 
                              ? "text-green-600" 
                              : "text-red-600"
                          )}>
                            R$ {(totalDepositsAmount - totalWithdrawalsAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Saques Pendentes</p>
                          <div className="text-xl sm:text-2xl font-bold text-amber-600 flex items-center gap-1">
                            <TimerIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            R$ {totalPendingWithdrawalsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <Badge variant="outline">{totalPendingWithdrawals}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Estatísticas detalhadas caso a API forneça */}
                {summary && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Estatísticas do Período</h3>
                    
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Depósitos</p>
                        <p className="text-base sm:text-lg font-bold">{summary.deposits.count}</p>
                        <p className="text-sm sm:text-base text-green-600">R$ {summary.deposits.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Saques</p>
                        <p className="text-base sm:text-lg font-bold">{summary.withdrawals.count}</p>
                        <p className="text-sm sm:text-base text-red-600">R$ {summary.withdrawals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Apostas</p>
                        <p className="text-base sm:text-lg font-bold">{summary.bets.count}</p>
                        <p className="text-sm sm:text-base text-gray-600">R$ {summary.bets.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Ganhos</p>
                        <p className="text-base sm:text-lg font-bold">{summary.wins.count}</p>
                        <p className="text-sm sm:text-base text-purple-600">R$ {summary.wins.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de Depósitos */}
            <TabsContent value="deposits">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Depósitos</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => exportToCSV(filteredDeposits, "depositos")}
                    disabled={!filteredDeposits.length}
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
                
                {isLoadingDeposits ? (
                  <div className="flex justify-center py-8">
                    <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredDeposits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum depósito encontrado no período selecionado.
                  </div>
                ) : (
                  <>
                    {/* Visão Desktop - Tabela */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Usuário</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Gateway</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ref. Externa</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredDeposits.map((tx) => (
                              <TableRow key={tx.id}>
                                <TableCell className="font-medium">{tx.id}</TableCell>
                                <TableCell>
                                  {format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell>{tx.userId}</TableCell>
                                <TableCell>
                                  R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>{tx.gatewayId}</TableCell>
                                <TableCell>{getDepositStatusBadge(tx.status)}</TableCell>
                                <TableCell>
                                  {tx.externalId ? (
                                    <span className="text-xs font-mono">{tx.externalId}</span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">N/A</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                    
                    {/* Visão Mobile - Cards */}
                    <div className="md:hidden space-y-4">
                      {filteredDeposits.map((tx) => (
                        <Card key={tx.id} className="overflow-hidden">
                          <CardHeader className="p-3 pb-0">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">ID: {tx.id}</span>
                              {getDepositStatusBadge(tx.status)}
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 pt-2">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Data:</span>
                                <span className="font-medium">{format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                              </div>
                              <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Usuário:</span>
                                <span className="font-medium">{tx.userId}</span>
                              </div>
                              <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Valor:</span>
                                <span className="font-bold text-green-600">R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Ref. Externa:</span>
                                {tx.externalId ? (
                                  <span className="font-mono text-xs">{tx.externalId}</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">N/A</span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de Saques */}
            <TabsContent value="withdrawals">
              <div className="space-y-4">
                {/* Card de Saldo do Gateway */}
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-3 sm:px-6 gap-3 sm:gap-0">
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      <div>
                        <h4 className="font-medium">Saldo do Gateway</h4>
                        <p className="text-sm text-muted-foreground">Pushin Pay (PIX)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {isLoadingGatewayBalance ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground">Carregando...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-base sm:text-xl font-semibold",
                              gatewayBalance?.balance ? (
                                gatewayBalance.balance < totalPendingWithdrawalsAmount 
                                  ? "text-red-600" 
                                  : "text-green-600"
                              ) : "text-muted-foreground"
                            )}>
                              {gatewayBalance?.balance !== undefined 
                                ? `R$ ${gatewayBalance.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                : "Indisponível"}
                            </span>
                            {gatewayBalance?.balance !== undefined && totalPendingWithdrawalsAmount > 0 && (
                              <span className="text-xs text-muted-foreground max-w-[220px] sm:max-w-none">
                                {gatewayBalance.balance >= totalPendingWithdrawalsAmount 
                                  ? "Saldo suficiente para todos os saques pendentes"
                                  : `Saldo insuficiente, faltam R$ ${(totalPendingWithdrawalsAmount - gatewayBalance.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </span>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 flex-shrink-0" 
                            onClick={() => refetchGatewayBalance()}
                            title="Atualizar saldo"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Saques</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => exportToCSV(filteredWithdrawals, "saques")}
                    disabled={!filteredWithdrawals.length}
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
                
                {isLoadingWithdrawals ? (
                  <div className="flex justify-center py-8">
                    <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredWithdrawals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum saque encontrado com os filtros selecionados.
                  </div>
                ) : (
                  <>
                    {/* Visão Desktop - Tabela */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Usuário</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Chave PIX</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredWithdrawals.map((withdrawal) => (
                              <TableRow key={withdrawal.id}>
                                <TableCell className="font-medium">{withdrawal.id}</TableCell>
                                <TableCell>
                                  {format(new Date(withdrawal.requestedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell>{withdrawal.userId}</TableCell>
                                <TableCell>
                                  R$ {withdrawal.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs font-mono break-all">{withdrawal.pixKey}</span>
                                </TableCell>
                                <TableCell>{getWithdrawalStatusBadge(withdrawal.status)}</TableCell>
                                <TableCell>
                                  {(withdrawal.status === "pending" || withdrawal.status === "processing") && (
                                    <div className="flex space-x-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0"
                                        title={withdrawal.status === "processing" ? "Saque em processamento" : "Aprovar saque"}
                                        disabled={processingWithdrawal === withdrawal.id || withdrawal.status === "processing"}
                                        onClick={() => withdrawal.status === "pending" && approveWithdrawal(withdrawal.id)}
                                      >
                                        {processingWithdrawal === withdrawal.id ? (
                                          <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        )}
                                      </Button>
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        title={withdrawal.status === "processing" ? "Saque em processamento" : "Rejeitar saque"}
                                        disabled={processingWithdrawal === withdrawal.id || withdrawal.status === "processing"}
                                        onClick={() => withdrawal.status === "pending" && rejectWithdrawal(withdrawal.id)}
                                      >
                                        {processingWithdrawal === withdrawal.id ? (
                                          <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                    
                    {/* Visão Mobile - Cards */}
                    <div className="md:hidden space-y-4">
                      {filteredWithdrawals.map((withdrawal) => (
                        <Card key={withdrawal.id} className="overflow-hidden">
                          <CardHeader className="p-3 pb-0">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">ID: {withdrawal.id}</span>
                              {getWithdrawalStatusBadge(withdrawal.status)}
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 pt-2">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Data:</span>
                                <span className="font-medium">{format(new Date(withdrawal.requestedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                              </div>
                              <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Usuário:</span>
                                <span className="font-medium">{withdrawal.userId}</span>
                              </div>
                              <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-muted-foreground">Valor:</span>
                                <span className="font-bold text-red-600">R$ {withdrawal.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="border-b pb-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Chave PIX:</span>
                                </div>
                                <div className="mt-1">
                                  <span className="text-xs font-mono break-all">{withdrawal.pixKey}</span>
                                </div>
                              </div>
                              
                              {(withdrawal.status === "pending" || withdrawal.status === "processing") && (
                                <div className="flex justify-end items-center gap-2 pt-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 gap-1"
                                    disabled={processingWithdrawal === withdrawal.id || withdrawal.status === "processing"}
                                    onClick={() => withdrawal.status === "pending" && approveWithdrawal(withdrawal.id)}
                                  >
                                    {processingWithdrawal === withdrawal.id ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    )}
                                    Aprovar
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1"
                                    disabled={processingWithdrawal === withdrawal.id || withdrawal.status === "processing"}
                                    onClick={() => withdrawal.status === "pending" && rejectWithdrawal(withdrawal.id)}
                                  >
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}