import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MoneyInput } from "./money-input";
import { NumericKeyboard } from "./numeric-keyboard";
import { useAuth } from "@/hooks/use-auth";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  ExternalLink, 
  ArrowDownCircle, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Timer,
  Clock,
  Copy
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Definir schema para o formulário
const withdrawFormSchema = z.object({
  amount: z.number()
    .min(1, { message: "O valor mínimo é R$1,00" }),
  pixKey: z.string()
    .optional(),
  pixKeyType: z.enum(["cpf", "email", "phone", "random"], {
    required_error: "Selecione o tipo de chave"
  }).optional()
});

type WithdrawFormValues = z.infer<typeof withdrawFormSchema>;

// Tipos de chave PIX disponíveis
const pixKeyTypes = [
  { id: "cpf", name: "CPF" },
  { id: "email", name: "Email" },
  { id: "phone", name: "Telefone" },
  { id: "random", name: "Chave Aleatória" }
];

interface WithdrawDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WithdrawDialog({ onSuccess, open: controlledOpen, onOpenChange }: WithdrawDialogProps) {
  const [open, setOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'success' | 'processing' | 'error'>('idle');
  const [withdrawDetail, setWithdrawDetail] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Gerenciar estado aberto/fechado
  const isOpen = controlledOpen !== undefined ? controlledOpen : open;
  const setIsOpen = onOpenChange || setOpen;
  
  // Reseta o estado quando o diálogo é fechado
  useEffect(() => {
    if (!isOpen) {
      setWithdrawStatus('idle');
      setWithdrawDetail(null);
      form.reset();
      setWithdrawAmount("");
    }
  }, [isOpen]);
  
  // Buscar retiradas pendentes do usuário
  const { data: withdrawals = [], refetch: refetchWithdrawals } = useQuery({
    queryKey: ["/api/withdrawals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/withdrawals");
      return await res.json();
    },
    enabled: isOpen,
  });
  
  // Buscar as configurações do sistema para verificar se saques estão permitidos
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/system-settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/system-settings");
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Configuração do formulário com Zod Resolver
  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawFormSchema),
    defaultValues: {
      amount: 0,
      pixKey: user?.defaultPixKey || "",
      pixKeyType: user?.defaultPixKeyType as "cpf" || "cpf"
    },
  });

  // Atualizar os campos do formulário quando o usuário for carregado
  useEffect(() => {
    if (user && user.defaultPixKey && user.defaultPixKeyType) {
      form.setValue("pixKey", user.defaultPixKey);
      form.setValue("pixKeyType", user.defaultPixKeyType as "cpf");
    }
  }, [user, form]);
  
  // Mutation para criar uma solicitação de saque
  const withdrawMutation = useMutation({
    mutationFn: async (data: WithdrawFormValues) => {
      const res = await apiRequest("POST", "/api/withdrawals", { 
        amount: data.amount,
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Solicitação de Saque",
        description: data.status === "approved" 
          ? "Seu saque foi aprovado automaticamente!" 
          : "Sua solicitação de saque foi registrada e está aguardando aprovação.",
      });
      
      // Guardar detalhes da retirada e alterar o estado
      console.log("Withdrawal response:", data);
      setWithdrawDetail(data);
      setWithdrawStatus('success');
      form.reset();
      
      // Atualizar os dados do usuário e histórico de saques
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      
      // Chamar callback de sucesso se existir
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      setWithdrawStatus('error');
      toast({
        title: "Erro ao solicitar saque",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // Handler para o envio do formulário
  const onSubmit = (values: WithdrawFormValues) => {
    setIsSubmitting(true);
    
    // Verificar se o usuário tem chave PIX configurada
    if (!user?.defaultPixKey || !user?.defaultPixKeyType) {
      toast({
        title: "Chave PIX não configurada",
        description: "Você precisa configurar uma chave PIX antes de solicitar um saque.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    // Garantir que o valor está no formato correto
    let amount = values.amount;
    console.log(`Valor original no formulário: ${amount}, tipo: ${typeof amount}`);
    
    // Se não tivermos um valor, usar o valor parseado do campo de texto
    if (amount === undefined || amount === null) {
      amount = parseMoneyValue(withdrawAmount);
      console.log(`Usando valor do campo de texto: ${amount}`);
    }
    
    // Garantir que é um número com 2 casas decimais
    const finalAmount = parseFloat(Number(amount).toFixed(2));
    
    // Verificar se o usuário tem saldo suficiente
    if (user && finalAmount > user.balance) {
      toast({
        title: "Saldo insuficiente",
        description: `Você não possui saldo suficiente para este saque. Saldo atual: R$ ${user.balance.toFixed(2)}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    // Usar sempre a chave PIX do usuário armazenada no banco
    console.log(`Valor final enviado para API: ${finalAmount}, tipo: ${typeof finalAmount}`);
    console.log(`Chave PIX do usuário: ${user.defaultPixKey} (${user.defaultPixKeyType})`);
    
    withdrawMutation.mutate({
      amount: finalAmount,
      pixKey: user.defaultPixKey,
      pixKeyType: user.defaultPixKeyType as "cpf" | "email" | "phone" | "random"
    });
  };

  // Handler para entrada numérica do teclado
  const handleKeyPress = (value: string) => {
    if (value === "C") {
      setWithdrawAmount("");
      form.setValue("amount", 0);
      return;
    }

    if (value === "←") {
      const newValue = withdrawAmount.slice(0, -1);
      setWithdrawAmount(newValue);
      form.setValue("amount", parseMoneyValue(newValue));
      return;
    }

    // Permitir apenas um ponto decimal
    if (value === "," && withdrawAmount.includes(",")) {
      return;
    }

    // Limitar a 2 casas decimais após a vírgula
    if (withdrawAmount.includes(",")) {
      const parts = withdrawAmount.split(",");
      if (parts[1] && parts[1].length >= 2) {
        return;
      }
    }

    const newValue = withdrawAmount + value;
    setWithdrawAmount(newValue);
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
    // Verificar se saques estão permitidos
    if (systemSettings && !systemSettings.allowWithdrawals) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Indisponível</AlertTitle>
          <AlertDescription>
            Saques estão temporariamente desativados. Por favor, tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Status de sucesso - saque solicitado
    if (withdrawStatus === 'success') {
      return (
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
          <h3 className="text-xl font-semibold text-center">
            {withdrawDetail?.status === "approved"
              ? "Saque Aprovado!"
              : withdrawDetail?.status === "processing"
              ? "Saque em Processamento!"
              : "Solicitação Recebida!"}
          </h3>
          <p className="text-center text-muted-foreground">
            {withdrawDetail?.status === "approved"
              ? "Seu saque foi aprovado e o valor já foi debitado da sua conta."
              : withdrawDetail?.status === "processing"
              ? "Seu saque foi aprovado automaticamente e está sendo processado pelo gateway de pagamento PIX. Você receberá o valor em breve."
              : "Sua solicitação de saque foi registrada e está aguardando aprovação pelo administrador."}
          </p>
          
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle>Detalhes do Saque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(withdrawDetail?.amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge 
                    variant={
                      withdrawDetail?.status === "approved" ? "success" : 
                      withdrawDetail?.status === "processing" ? "warning" : 
                      "outline"
                    }
                  >
                    {withdrawDetail?.status === "approved" ? "Aprovado" : 
                     withdrawDetail?.status === "processing" ? "Em Processamento" : 
                     withdrawDetail?.status === "rejected" ? "Rejeitado" : 
                     "Pendente"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chave PIX:</span>
                  <span className="font-medium">{withdrawDetail?.pixKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">
                    {pixKeyTypes.find(t => t.id === withdrawDetail?.pixKeyType)?.name || withdrawDetail?.pixKeyType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {withdrawDetail?.requestedAt 
                      ? new Date(withdrawDetail.requestedAt).toLocaleString('pt-BR')
                      : new Date().toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button 
            onClick={() => {
              setWithdrawStatus('idle');
              setWithdrawDetail(null);
              setIsOpen(false);
            }}
            className="w-full"
          >
            Fechar
          </Button>
        </div>
      );
    }
    
    // Status de erro
    if (withdrawStatus === 'error') {
      return (
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <XCircle className="h-16 w-16 text-red-500 mb-2" />
          <h3 className="text-xl font-semibold text-center">Erro no Saque</h3>
          <p className="text-center text-muted-foreground">
            Ocorreu um erro ao processar sua solicitação de saque. Por favor, tente novamente.
          </p>
          <Button 
            onClick={() => {
              setWithdrawStatus('idle');
              form.reset();
            }}
            className="w-full"
          >
            Tentar Novamente
          </Button>
        </div>
      );
    }
    
    // Status inicial - formulário de saque
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Saque</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MoneyInput
                      id="withdraw-amount"
                      value={withdrawAmount}
                      onChange={(value) => {
                        setWithdrawAmount(value);
                        form.setValue("amount", parseMoneyValue(value));
                      }}
                      onFocus={() => setShowKeyboard(true)}
                      placeholder="R$ 0,00"
                    />
                    {user && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        Saldo: R$ {user.balance.toFixed(2)}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  Insira o valor que deseja sacar
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {showKeyboard && (
            <div className="mb-4">
              <NumericKeyboard 
                onKeyPress={handleKeyPress} 
                withComma={true} 
              />
            </div>
          )}

          {user && user.defaultPixKey && user.defaultPixKeyType ? (
            // Mostrar a chave PIX cadastrada
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <div className="mb-2">
                <h3 className="text-sm font-medium">Chave PIX para pagamento</h3>
                <p className="text-xs text-muted-foreground">
                  O saque será enviado para a chave PIX abaixo
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Tipo:</p>
                  <p className="font-medium">
                    {pixKeyTypes.find(t => t.id === user.defaultPixKeyType)?.name || user.defaultPixKeyType}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Chave:</p>
                  <div className="flex items-center gap-1">
                    <p className="font-medium">{user.defaultPixKey}</p>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(user.defaultPixKey || "");
                        toast({
                          title: "Chave copiada!",
                          description: "A chave PIX foi copiada para a área de transferência."
                        });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-2 flex justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Abrir o diálogo de configurações
                    const event = new CustomEvent('openUserSettings', { 
                      detail: { defaultTab: 'payments' } 
                    });
                    window.dispatchEvent(event);
                    // Fechar o diálogo de saque
                    setIsOpen(false);
                  }}
                >
                  Alterar chave PIX
                </Button>
              </div>
            </div>
          ) : (
            // Usuário não tem chave PIX configurada, mostrar alerta e redirecionar para configurações
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Configuração necessária</h3>
                  <p className="text-xs text-amber-700 mt-1 mb-3">
                    Para realizar saques, você precisa configurar uma chave PIX nas configurações da sua conta.
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="border-amber-300 bg-amber-100 hover:bg-amber-200"
                    onClick={() => {
                      // Abrir o diálogo de configurações
                      const event = new CustomEvent('openUserSettings', { 
                        detail: { defaultTab: 'payments' } 
                      });
                      window.dispatchEvent(event);
                      // Fechar o diálogo de saque
                      setIsOpen(false);
                    }}
                  >
                    Configurar Chave PIX
                  </Button>
                </div>
              </div>
            </div>
          )}

          {withdrawals.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Saques Pendentes</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Você tem {withdrawals.filter((w: any) => w.status === "pending").length} saque(s) pendente(s) de aprovação.
              </p>
              
              <div className="max-h-32 overflow-y-auto">
                {withdrawals
                  .filter((w: any) => w.status === "pending")
                  .map((withdrawal: any) => (
                    <div key={withdrawal.id} className="text-xs border-t py-1">
                      <div className="flex justify-between">
                        <span>
                          {new Date(withdrawal.requestedAt).toLocaleString("pt-BR")}
                        </span>
                        <span className="font-medium">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(withdrawal.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button"
              variant="ghost" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !parseMoneyValue(withdrawAmount)}
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Solicitar Saque
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="secondary">
          <ArrowDownCircle className="h-4 w-4" />
          Sacar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {withdrawStatus === 'success' ? 'Saque Solicitado' :
             withdrawStatus === 'error' ? 'Erro no Saque' :
             'Solicitar Saque'}
          </DialogTitle>
          <DialogDescription>
            {withdrawStatus === 'success' ? 'Sua solicitação de saque foi processada.' :
             withdrawStatus === 'error' ? 'Houve um problema com sua solicitação.' :
             'Informe o valor e os dados para saque via PIX.'}
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}