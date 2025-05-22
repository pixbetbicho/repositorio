import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, Search, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Transaction {
  id: number;
  userId: number;
  gatewayId: number;
  amount: number;
  status: string;
  externalId?: string;
  externalUrl?: string;
  response?: any;
  createdAt: string;
}

export function TransactionHistory() {
  const [currentPage, setCurrentPage] = useState(1);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Buscar transações do usuário
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/payment-transactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payment-transactions");
      return await res.json();
    },
  });
  
  // Verificar todos os pagamentos pendentes automaticamente
  const checkPendingPayments = async (isManualCheck = false) => {
    try {
      if (isAutoChecking) return;
      
      setIsAutoChecking(true);
      
      const hasPendingTransactions = transactions.some(
        t => t.status === 'pending' || t.status === 'processing'
      );
      
      if (!hasPendingTransactions) {
        setIsAutoChecking(false);
        return;
      }
      
      const res = await apiRequest(
        "POST", 
        "/api/payment-transactions/check-pending"
      );
      
      const data = await res.json();
      console.log("Verificação automática de pagamentos:", data);
      
      if (data.updatedCount > 0) {
        // Atualizar dados
        queryClient.invalidateQueries({ queryKey: ["/api/payment-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        // Exibir toast apenas para verificações manuais (ou seja, quando o botão foi clicado)
        if (isManualCheck) {
          toast({
            title: "Pagamento confirmado!",
            description: `${data.updatedCount} ${data.updatedCount === 1 ? 'pagamento foi' : 'pagamentos foram'} confirmados e seu saldo foi atualizado.`,
          });
        }
      } else if (data.checkedCount > 0 && isManualCheck) {
        // Exibir toast apenas para verificações manuais
        toast({
          title: "Verificação concluída",
          description: `${data.checkedCount} transações verificadas. Nenhuma atualização necessária.`,
        });
      }
    } catch (error) {
      console.error("Erro ao verificar pagamentos pendentes:", error);
      toast({
        title: "Erro ao verificar pagamentos",
        description: "Ocorreu um erro ao verificar seus pagamentos pendentes.",
        variant: "destructive",
      });
    } finally {
      setIsAutoChecking(false);
    }
  };
  
  // Verificação automática de pagamentos pendentes
  useEffect(() => {
    // Verificar se há transações pendentes
    const hasPendingTransactions = transactions.some(
      t => t.status === 'pending' || t.status === 'processing'
    );
    
    if (!hasPendingTransactions) return;
    
    // Verificar imediatamente após carregar a página
    const timeoutId = setTimeout(() => {
      checkPendingPayments();
    }, 3000);
    
    // Verificar a cada 30 segundos
    const intervalId = setInterval(() => {
      checkPendingPayments();
    }, 30000);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [transactions]);
  
  // Verificar pagamento manualmente (apenas para admin)
  const verifyPayment = async (transactionId: number) => {
    try {
      setVerifyingId(transactionId);
      
      toast({
        title: "Verificando pagamento",
        description: "Aguarde enquanto verificamos o status do seu pagamento.",
      });
      
      const res = await apiRequest(
        "POST", 
        `/api/payment-transactions/${transactionId}/verify`
      );
      
      const data = await res.json();
      console.log("Verificação manual de pagamento:", data);
      
      if (data.status === "completed") {
        toast({
          title: "Pagamento confirmado",
          description: "Seu pagamento foi confirmado com sucesso!",
        });
      } else {
        toast({
          title: "Status do pagamento",
          description: `Status atual: ${data.status}`,
        });
      }
      
      // Atualizar dados
      queryClient.invalidateQueries({ queryKey: ["/api/payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
      toast({
        title: "Erro ao verificar pagamento",
        description: "Ocorreu um erro ao verificar o status do seu pagamento.",
        variant: "destructive",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  // Paginação das transações
  const totalPages = Math.ceil(transactions.length / pageSize);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Renderizar a badge de status com cores diferentes
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <Badge variant="success">Concluído</Badge>;
      case "pending":
        return <Badge variant="outline">Pendente</Badge>;
      case "processing":
        return <Badge variant="warning">Em processamento</Badge>;
      case "failed":
      case "rejected":
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Renderizar ação (como ver recibo, etc.)
  const renderAction = (transaction: Transaction) => {
    // Para transações concluídas, mostrar botão de visualizar recibo
    if (transaction.status === "completed" || transaction.status === "approved") {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            // Implementar exibição de recibo/comprovante
            console.log("Ver recibo da transação", transaction.id);
          }}
        >
          <span className="sr-only">Ver recibo</span>
          <Search className="h-4 w-4" />
        </Button>
      );
    }
    
    // Para transações pendentes ou em processamento, mostrar botão de verificar
    if (transaction.status === "pending" || transaction.status === "processing") {
      return (
        <div className="flex justify-end gap-2">
          {transaction.externalUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => window.open(transaction.externalUrl, "_blank")}
            >
              <span className="sr-only">Abrir QR Code</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          
          {/* Botão de verificação manual apenas para administradores */}
          {user?.isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={verifyingId === transaction.id}
              onClick={() => verifyPayment(transaction.id)}
            >
              <span className="sr-only">Verificar pagamento</span>
              <RefreshCw className={`h-4 w-4 ${verifyingId === transaction.id ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      );
    }

    // Para transações com URL externa (QR Code, etc), permitir abrir
    if (transaction.externalUrl) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => window.open(transaction.externalUrl, "_blank")}
        >
          <span className="sr-only">Abrir link</span>
          <ExternalLink className="h-4 w-4" />
        </Button>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>
            Seu histórico de depósitos e retiradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-muted-foreground mb-2">
              Você ainda não realizou nenhuma transação.
            </div>
            <div className="text-sm text-muted-foreground">
              Quando você fizer um depósito ou uma retirada, suas transações aparecerão aqui.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verificar se há transações pendentes
  const hasPendingTransactions = transactions.some(
    t => t.status === 'pending' || t.status === 'processing'
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 text-primary" />
            Histórico de Transações
          </CardTitle>
          <CardDescription>
            Seu histórico de depósitos e retiradas
          </CardDescription>
        </div>
        
        {/* Botão para verificar manualmente todos os pagamentos pendentes */}
        {hasPendingTransactions && (
          <Button 
            size="sm"
            variant="outline"
            onClick={() => checkPendingPayments(true)}
            disabled={isAutoChecking}
            className="mt-2 sm:mt-0 sm:ml-auto"
          >
            {isAutoChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar Pagamentos
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Versão para desktop - tabela tradicional */}
        <div className="rounded-md border hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {formatDate(new Date(transaction.createdAt), true)}
                  </TableCell>
                  <TableCell>
                    {transaction.amount > 0 ? "Depósito" : "Retirada"}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Math.abs(transaction.amount))}
                  </TableCell>
                  <TableCell>{renderStatusBadge(transaction.status)}</TableCell>
                  <TableCell className="text-right">
                    {renderAction(transaction)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Versão para mobile - cards */}
        <div className="space-y-3 md:hidden">
          {paginatedTransactions.map((transaction) => (
            <div 
              key={transaction.id} 
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium">
                  {transaction.amount > 0 ? "Depósito" : "Retirada"}
                </div>
                <div>{renderStatusBadge(transaction.status)}</div>
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-500">
                  {formatDate(new Date(transaction.createdAt), true)}
                </div>
                <div className="font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(Math.abs(transaction.amount))}
                </div>
              </div>
              
              <div className="flex justify-end mt-2">
                {transaction.externalUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(transaction.externalUrl, "_blank")}
                    className="h-8 px-2 text-xs flex items-center"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    QR Code
                  </Button>
                )}
                
                {(transaction.status === "pending" || transaction.status === "processing") && user?.isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={verifyingId === transaction.id}
                    onClick={() => verifyPayment(transaction.id)}
                    className="h-8 px-2 text-xs flex items-center ml-2"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${verifyingId === transaction.id ? 'animate-spin' : ''}`} />
                    Verificar
                  </Button>
                )}
                
                {(transaction.status === "completed" || transaction.status === "approved") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs flex items-center"
                    onClick={() => {
                      console.log("Ver recibo da transação", transaction.id);
                    }}
                  >
                    <Search className="h-3 w-3 mr-1" />
                    Recibo
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center sm:justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs"
            >
              Anterior
            </Button>
            <div className="text-sm">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-xs"
            >
              Próxima
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}