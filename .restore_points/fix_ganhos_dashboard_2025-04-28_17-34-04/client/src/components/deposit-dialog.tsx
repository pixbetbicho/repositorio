import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MoneyInput } from "./money-input";
import { NumericKeyboard } from "./numeric-keyboard";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Copy,
  QrCode,
  Timer,
  Clock,
  ExternalLink
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Definir schema para o formulário
const depositFormSchema = z.object({
  amount: z.number().min(1, { message: "O valor mínimo é R$1,00" }),
  gatewayId: z.string({ required_error: "Selecione um método de pagamento" })
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

// Interface para gateway de pagamento
interface PaymentGateway {
  id: number;
  name: string;
  type: string;
}

interface DepositDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DepositDialog({ onSuccess, open: controlledOpen, onOpenChange }: DepositDialogProps) {
  const [open, setOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'success' | 'processing' | 'error'>('idle');
  const [transactionDetail, setTransactionDetail] = useState<any>(null);
  const { toast } = useToast();
  
  // Gerenciar estado aberto/fechado
  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  const setIsOpen = onOpenChange || setOpen;
  
  // Reseta o estado quando o diálogo é fechado
  useEffect(() => {
    if (!isOpen) {
      setTransactionStatus('idle');
      setTransactionDetail(null);
    }
  }, [isOpen]);
  
  // Buscar transações com polling mais rápido (a cada 3 segundos quando processando)
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/payment-transactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payment-transactions");
      return await res.json();
    },
    enabled: isOpen && transactionStatus === 'processing',
    refetchInterval: transactionStatus === 'processing' ? 3000 : false, // Polling mais rápido: 3 segundos
    refetchIntervalInBackground: true, // Continuar verificando mesmo em segundo plano
  });

  // Monitorar mudanças nas transações para detecção automática de pagamento
  useEffect(() => {
    // Se estamos processando uma transação e ela está nos dados
    if (transactionStatus === 'processing' && transactionDetail && transactions.length > 0) {
      const currentTransaction = transactions.find((t: any) => t.id === transactionDetail.transactionId);
      
      if (currentTransaction && currentTransaction.status === 'completed') {
        console.log('Transação concluída detectada:', currentTransaction);
        setTransactionStatus('success');
        // Atualizar dados do usuário
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
    }
  }, [transactionStatus, transactionDetail, transactions, queryClient]);

  // Buscar gateways de pagamento ativos
  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ["/api/payment-gateways"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payment-gateways");
      return await res.json() as PaymentGateway[];
    },
    enabled: isOpen,
  });

  // Configuração do formulário com Zod Resolver
  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: 0,
      gatewayId: ""
    },
  });

  // Referência para armazenar o ID da transação atual
  const transaction = useRef<number | null>(null);
  
  // Referência para controlar o ciclo de vida durante as chamadas assíncronas
  const disposed = useRef(false);
  
  // Efeito para redefinir a flag disposed quando o componente é montado/desmontado
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
    };
  }, []);
  
  // Função para iniciar polling do status do pagamento
  const startPolling = useCallback((transactionId: number) => {
    transaction.current = transactionId;
    queryClient.invalidateQueries({ queryKey: ["/api/payment-transactions"] });
    
    // Verificação silenciosa e periódica de pagamentos pendentes
    const interval = setInterval(async () => {
      if (disposed.current) return; // Evitar verificação se componente foi desmontado
      
      try {
        // Chamar endpoint de verificação automática
        await fetch('/api/payment-transactions/check-pending', {
          method: 'POST'
        });
        
        // Atualizar dados do usuário para refletir novo saldo se pago
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        
        // Verificar se a transação atual foi concluída
        const checkResponse = await fetch(`/api/payment-transactions/${transactionId}`);
        const checkResult = await checkResponse.json();
        
        if (checkResult && checkResult.status === 'completed') {
          // Se a transação foi confirmada, mostrar mensagem e fechar o diálogo
          toast({
            title: "Pagamento confirmado!",
            description: "Seu saldo foi atualizado com sucesso.",
            variant: "success"
          });
          
          // Limpar intervalo e fechar
          clearInterval(interval);
          setIsOpen(false);
        }
      } catch (error) {
        // Erros silenciosos - não interromper o processo
      }
    }, 5000); // Verificar a cada 5 segundos
    
    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  }, [queryClient, toast, setIsOpen]);
  
  // Mutation para criar uma transação de depósito
  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number, gatewayId: number }) => {
      // Redirecionamos para o gateway específico com base no tipo selecionado
      const gateway = gateways.find(g => g.id === data.gatewayId);
      
      if (gateway?.type === "pushinpay") {
        const res = await apiRequest("POST", "/api/payment/pushinpay", { 
          amount: data.amount 
        });
        return await res.json();
      } else {
        throw new Error("Método de pagamento não suportado");
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Depósito iniciado",
        description: "Sua solicitação de depósito foi iniciada com sucesso.",
      });
      
      // Guardar detalhes da transação e alterar o estado
      console.log("Payment response:", data);
      setTransactionDetail(data);
      setTransactionStatus('processing');
      form.reset();
      
      // Iniciar polling para verificar status do pagamento
      startPolling(data.transactionId);
      
      // Se houver uma URL externa, redirecionar (em produção)
      if (data.externalUrl) {
        window.open(data.externalUrl, "_blank");
      }
      
      // Atualizar os dados do usuário
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-transactions"] });
      
      // Chamar callback de sucesso se existir
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      setTransactionStatus('error');
      // Verificar se é o erro de valor mínimo
      if (error.message.includes("O valor mínimo para depósito é R$50,00")) {
        toast({
          title: "Valor mínimo não atingido",
          description: "O valor mínimo para depósito é R$50,00",
          variant: "destructive",
        });
      } else {
        // Outro tipo de erro
        toast({
          title: "Erro ao iniciar depósito",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Handler para o envio do formulário
  const onSubmit = (values: DepositFormValues) => {
    setIsSubmitting(true);
    
    // Garantir que o valor está no formato correto
    let amount = values.amount;
    console.log(`Valor original no formulário: ${amount}, tipo: ${typeof amount}`);
    
    // Se não tivermos um valor, usar o valor parseado do campo de texto
    if (amount === undefined || amount === null) {
      amount = parseMoneyValue(depositAmount);
      console.log(`Usando valor do campo de texto: ${amount}`);
    }
    
    // Garantir que é um número com 2 casas decimais
    const finalAmount = parseFloat(Number(amount).toFixed(2));
    
    console.log(`Valor final enviado para API: ${finalAmount}, tipo: ${typeof finalAmount}`);
    
    depositMutation.mutate({
      amount: finalAmount,
      gatewayId: parseInt(values.gatewayId)
    });
  };

  // Handler para entrada numérica do teclado
  const handleKeyPress = (value: string) => {
    if (value === "C") {
      setDepositAmount("");
      form.setValue("amount", 0);
      return;
    }

    if (value === "←") {
      const newValue = depositAmount.slice(0, -1);
      setDepositAmount(newValue);
      form.setValue("amount", parseMoneyValue(newValue));
      return;
    }

    // Permitir apenas um ponto decimal
    if (value === "," && depositAmount.includes(",")) {
      return;
    }

    // Limitar a 2 casas decimais após a vírgula
    if (depositAmount.includes(",")) {
      const parts = depositAmount.split(",");
      if (parts[1] && parts[1].length >= 2) {
        return;
      }
    }

    const newValue = depositAmount + value;
    setDepositAmount(newValue);
    form.setValue("amount", parseMoneyValue(newValue));
  };

  // Converter string de valor para número (considerando formato brasileiro)
  const parseMoneyValue = (value: string): number => {
    if (!value) return 0;
    
    // Limpar formatação, manter apenas números e vírgula
    const cleanValue = value.replace(/[^\d,]/g, "");
    
    // Verificar se o valor tem vírgula
    if (cleanValue.includes(",")) {
      // Se tiver vírgula, converter de formato brasileiro para número
      const parts = cleanValue.split(",");
      const intPart = parts[0] || "0";
      // Garantir que a parte decimal tenha o tamanho correto
      const decPart = parts.length > 1 ? parts[1].substring(0, 2).padEnd(2, '0') : "00";
      
      // Montar o número com a formatação correta para parseFloat
      const result = parseFloat(`${intPart}.${decPart}`);
      console.log(`Convertendo ${value} (limpo: ${cleanValue}) para número: ${result}`);
      return isNaN(result) ? 0 : result;
    } else {
      // Se não tiver vírgula, é um número inteiro em reais
      const result = parseFloat(cleanValue);
      console.log(`Convertendo ${value} (limpo: ${cleanValue}) para número inteiro: ${result}`);
      return isNaN(result) ? 0 : result;
    }
  };

  // Renderizar o conteúdo dependendo do status
  const renderContent = () => {
    // Tela de carregamento
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // Sem métodos de pagamento disponíveis
    if (gateways.length === 0) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Indisponível</AlertTitle>
          <AlertDescription>
            Nenhum método de pagamento está disponível no momento. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Status de processamento - aguardando confirmação
    if (transactionStatus === 'processing') {
      // Verificar se há uma transação relacionada no histórico
      const currentTransaction = transactionDetail ? 
        transactions.find((t: any) => t.id === transactionDetail.transactionId) : null;
      
      // Se a transação foi concluída, mostrar tela de sucesso
      if (currentTransaction && currentTransaction.status === 'completed') {
        setTransactionStatus('success');
        return null; // Será redirecionado para a tela de sucesso na próxima renderização
      }
      
      return (
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Timer className="h-5 w-5 mr-2 text-primary" />
                Pagamento via PIX
              </CardTitle>
              <CardDescription>
                Realize o pagamento com o código PIX abaixo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="qrcode" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="qrcode">QR Code</TabsTrigger>
                  <TabsTrigger value="code">Código PIX</TabsTrigger>
                </TabsList>
                <TabsContent value="qrcode" className="mt-4">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    {transactionDetail?.paymentDetails?.qr_code_base64 ? (
                      <>
                        <div className="border p-2 rounded-md bg-white">
                          <img 
                            src={transactionDetail.paymentDetails.qr_code_base64.startsWith('data:') 
                              ? transactionDetail.paymentDetails.qr_code_base64 
                              : `data:image/png;base64,${transactionDetail.paymentDetails.qr_code_base64}`}
                            alt="QR Code PIX" 
                            className="w-48 h-48"
                          />
                        </div>
                        <div className="text-sm text-center text-muted-foreground">
                          Escaneie o QR Code com o aplicativo do seu banco
                        </div>
                      </>
                    ) : transactionDetail?.qrCodeUrl ? (
                      <>
                        <div className="border p-2 rounded-md bg-white">
                          <img 
                            src={transactionDetail.qrCodeUrl.startsWith('data:') 
                              ? transactionDetail.qrCodeUrl 
                              : `data:image/png;base64,${transactionDetail.qrCodeUrl.replace('data:image/png;base64,', '')}`} 
                            alt="QR Code PIX" 
                            className="w-48 h-48"
                          />
                        </div>
                        <div className="text-sm text-center text-muted-foreground">
                          Escaneie o QR Code com o aplicativo do seu banco
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-center py-4">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="code" className="mt-4">
                  <div className="flex flex-col space-y-4">
                    <div className="relative">
                      <div className="bg-muted p-3 rounded-md text-xs font-mono break-all border">
                        {transactionDetail?.paymentDetails?.qr_code || transactionDetail?.pixCopyPasteCode || "Carregando código PIX..."}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute right-2 top-2"
                        onClick={() => {
                          const pixCode = transactionDetail?.paymentDetails?.qr_code || transactionDetail?.pixCopyPasteCode;
                          if (pixCode) {
                            navigator.clipboard.writeText(pixCode);
                            toast({
                              title: "Código copiado!",
                              description: "O código PIX foi copiado para a área de transferência.",
                            });
                          }
                        }}
                        disabled={!(transactionDetail?.paymentDetails?.qr_code || transactionDetail?.pixCopyPasteCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-center text-muted-foreground">
                      Copie e cole o código acima no aplicativo do seu banco
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Valor:</div>
                <div className="text-right font-medium">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(transactionDetail?.amount || 0)}
                </div>
                <div className="text-muted-foreground">Expira em:</div>
                <div className="text-right font-medium flex items-center justify-end">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>30 minutos</span>
                </div>
                <div className="text-muted-foreground">Status:</div>
                <div className="text-right font-medium">
                  {currentTransaction?.status === 'pending' ? 'Pendente' : 
                  currentTransaction?.status === 'processing' ? 'Processando' : 
                  currentTransaction?.status === 'failed' ? 'Falhou' : 'Aguardando'}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-sm text-muted-foreground text-center px-4">
            Após realizar o pagamento, aguarde alguns instantes para a confirmação.
            Esta tela atualizará automaticamente quando o pagamento for processado.
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full justify-center">
            <Button 
              variant="outline"
              onClick={() => window.open(transactionDetail?.qrCodeUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir QR Code
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => {
                setTransactionStatus('idle');
                setTransactionDetail(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      );
    }
    
    // Status de erro ao processar o pagamento
    if (transactionStatus === 'error') {
      return (
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <Card className="w-full border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                Erro no pagamento
              </CardTitle>
              <CardDescription>
                Ocorreu um erro ao processar o seu pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Falha na transação</AlertTitle>
                <AlertDescription>
                  Não foi possível completar a operação. Por favor, tente novamente ou escolha outro método de pagamento.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={() => {
                  setTransactionStatus('idle');
                  setTransactionDetail(null);
                }}
              >
                Tentar novamente
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    // Status de sucesso após confirmação
    if (transactionStatus === 'success') {
      return (
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <Card className="w-full border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg text-green-600">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Pagamento confirmado
              </CardTitle>
              <CardDescription>
                Seu depósito foi processado com sucesso!
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Valor:</div>
                <div className="text-right font-medium">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(transactionDetail?.amount || 0)}
                </div>
                <div className="text-muted-foreground">Data:</div>
                <div className="text-right font-medium">
                  {new Date().toLocaleDateString('pt-BR')}
                </div>
                <div className="text-muted-foreground">Status:</div>
                <div className="text-right font-medium text-green-600">
                  Concluído
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  setTransactionStatus('idle');
                  setTransactionDetail(null);
                }}
              >
                Concluir
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    // Formulário para realizar novo depósito (estado padrão 'idle')
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <MoneyInput
                    value={depositAmount}
                    onChange={(value) => {
                      setDepositAmount(value);
                      field.onChange(parseMoneyValue(value));
                    }}
                    onFocus={() => setShowKeyboard(true)}
                    placeholder="R$ 0,00"
                    className="text-2xl font-bold text-center"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showKeyboard && (
            <Card className="mb-4">
              <CardContent className="p-2">
                <NumericKeyboard onKeyPress={handleKeyPress} showDecimal />
              </CardContent>
            </Card>
          )}

          <FormField
            control={form.control}
            name="gatewayId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pagamento</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um método de pagamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {gateways.map((gateway) => (
                      <SelectItem
                        key={gateway.id}
                        value={gateway.id.toString()}
                      >
                        {gateway.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Escolha como deseja fazer seu depósito
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Continuar
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CreditCard className="h-4 w-4" />
          Depositar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {transactionStatus === 'processing' ? 'Status do Pagamento' :
             transactionStatus === 'success' ? 'Pagamento Confirmado' :
             transactionStatus === 'error' ? 'Erro no Pagamento' :
             'Realizar Depósito'}
          </DialogTitle>
          <DialogDescription>
            {transactionStatus === 'processing' ? 'Acompanhe o status do seu pagamento.' :
             transactionStatus === 'success' ? 'Seu pagamento foi processado com sucesso!' :
             transactionStatus === 'error' ? 'Houve um problema com seu pagamento.' :
             'Escolha o valor e o método de pagamento para fazer um depósito.'}
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}