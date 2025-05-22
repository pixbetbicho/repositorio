import { useState, useEffect, useRef } from "react";
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
import { RefreshCw, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// Schema para o formulário de depósito
const depositFormSchema = z.object({
  amount: z.number().min(1, { message: "O valor mínimo é R$1,00" }),
  gatewayId: z.string({ required_error: "Selecione um método de pagamento" }),
  useBonus: z.boolean().optional().default(false)
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
  triggerRef?: React.RefObject<HTMLButtonElement>;
  renderAsButton?: boolean;
  buttonText?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function DepositDialog({
  onSuccess,
  open,
  onOpenChange,
  triggerRef,
  renderAsButton = false,
  buttonText = "Depositar",
  buttonVariant = "default"
}: DepositDialogProps) {
  // Estados locais
  const [isOpen, setIsOpen] = useState(false);
  const [currentDepositValue, setCurrentDepositValue] = useState<number | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [currentBonusAmount, setCurrentBonusAmount] = useState(0);
  
  // Buscar configurações do sistema
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/system-settings"],
    queryFn: () => apiRequest("GET", "/api/system-settings").then(res => res.json()),
  });

  // Buscar gateways de pagamento
  const { data: gateways = [] } = useQuery<PaymentGateway[]>({
    queryKey: ["/api/payment-gateways"],
    queryFn: () => apiRequest("GET", "/api/payment-gateways").then(res => res.json()),
  });

  // Verificar histórico de depósitos (para determinar se é primeiro depósito)
  const { data: depositHistory = [] } = useQuery<string[]>({
    queryKey: ["/api/user/deposit-history"],
    queryFn: () => apiRequest("GET", "/api/user/deposit-history").then(res => res.json()),
  });

  // Obter valores de bônus das configurações do sistema ou usar valores padrão
  const BONUS_PERCENTAGE = systemSettings?.firstDepositBonusPercentage || 100;
  const BONUS_MAX_AMOUNT = systemSettings?.firstDepositBonusMaxAmount || 300;
  const BONUS_ENABLED = systemSettings?.firstDepositBonusEnabled !== false;

  // Verificar se é o primeiro depósito
  const isFirstDeposit = depositHistory?.length === 0;

  // Referências e utilidades
  const { toast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Abertura/fechamento controlado externamente ou internamente
  const controlledOpen = open !== undefined;
  const isDialogOpen = controlledOpen ? open : isOpen;

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    setIsOpen(open);
  };

  // Formulário
  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: 0,
      useBonus: false,
    },
  });

  // Mutation para criar intenção de depósito
  const depositMutation = useMutation({
    mutationFn: async (values: DepositFormValues) => {
      return await apiRequest("POST", "/api/deposit", values).then(res => res.json());
    },
    onSuccess: (data) => {
      // Redirecionar para a URL do gateway ou exibir informações de PIX
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.pixCode || data.pixQrCode) {
        // Lidar com pagamento PIX - este fluxo seria tratado em outro componente
        handleOpenChange(false);
        
        // Chama o callback de sucesso se fornecido
        if (onSuccess) onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao processar depósito",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Calcular valor do bônus com base no valor do depósito e nas configurações de bônus
  useEffect(() => {
    if (!depositAmount || !isFirstDeposit || !BONUS_ENABLED) {
      setCurrentBonusAmount(0);
      return;
    }

    try {
      const numericValue = parseFloat(depositAmount.replace(',', '.'));
      if (isNaN(numericValue) || numericValue <= 0) {
        setCurrentBonusAmount(0);
        return;
      }

      const bonusValue = Math.min(
        (numericValue * BONUS_PERCENTAGE) / 100, 
        BONUS_MAX_AMOUNT
      );
      
      console.log("Calculando bônus com valores finais:", {
        depositAmount: numericValue,
        percentage: BONUS_PERCENTAGE,
        maxAmount: BONUS_MAX_AMOUNT,
        enabled: BONUS_ENABLED,
        forceEnabled: true,
        fromAdmin: systemSettings ? true : false,
        fromSystem: true,
        usingDefault: !systemSettings
      });
      
      console.log("Valor atual do depósito:", numericValue, "Valor calculado do bônus:", bonusValue);
      
      setCurrentBonusAmount(bonusValue);
    } catch (error) {
      console.error("Erro ao calcular bônus:", error);
      setCurrentBonusAmount(0);
    }
  }, [depositAmount, BONUS_PERCENTAGE, BONUS_MAX_AMOUNT, BONUS_ENABLED, systemSettings, isFirstDeposit]);

  // Atualizar valor do depósito quando o formulário mudar
  useEffect(() => {
    const amount = form.watch("amount");
    if (amount !== undefined && amount !== null) {
      setDepositAmount(amount.toString());
    }
  }, [form.watch("amount")]);

  // Lidar com envio do formulário
  const onSubmit = (values: DepositFormValues) => {
    depositMutation.mutate(values);
  };

  // Estado de submissão
  const isSubmitting = depositMutation.isPending;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {renderAsButton ? (
        <DialogTrigger asChild>
          <Button variant={buttonVariant} ref={triggerRef}>
            <CreditCard className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-md" ref={dialogRef}>
        <DialogHeader>
          <DialogTitle>Depósito</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Depósito</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={depositAmount}
                      onChange={(value) => {
                        setDepositAmount(value);
                        field.onChange(parseFloat(value.replace(',', '.')));
                      }}
                      onFocus={() => setShowKeyboard(true)}
                      className="text-2xl font-bold text-center"
                    />
                  </FormControl>
                  
                  {/* Valores pré-definidos para seleção rápida */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[10, 30, 50, 100].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={currentDepositValue === value ? "default" : "outline"}
                        className="w-full"
                        onClick={() => {
                          const formattedValue = value.toString();
                          setDepositAmount(formattedValue);
                          field.onChange(value);
                          setCurrentDepositValue(value);
                        }}
                      >
                        R$ {value},00
                      </Button>
                    ))}
                  </div>
                  
                  <FormMessage />
                </FormItem>
              )}
            />

            {showKeyboard && (
              <Card className="mb-4">
                <NumericKeyboard
                  onKeyPress={(key) => {
                    let newValue = depositAmount;
                    
                    if (key === "C") {
                      newValue = "";
                    } else if (key === "←") {
                      newValue = newValue.slice(0, -1);
                    } else {
                      newValue += key;
                    }
                    
                    setDepositAmount(newValue);
                    const numericValue = parseFloat(newValue.replace(',', '.')) || 0;
                    form.setValue("amount", numericValue);
                  }}
                />
                <div className="flex justify-center p-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowKeyboard(false)}
                    className="w-full"
                  >
                    Fechar teclado
                  </Button>
                </div>
              </Card>
            )}

            <FormField
              control={form.control}
              name="gatewayId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            
            {/* Opção de bônus de primeiro depósito - só aparece se for elegível */}
            {isFirstDeposit && BONUS_ENABLED && (
              <FormField
                control={form.control}
                name="useBonus"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-2 rounded-md border p-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-medium text-base">
                        Ativar Bônus de Primeiro Depósito
                      </FormLabel>
                    </div>
                    
                    <FormDescription className="pl-6">
                      Receba <span className="font-bold text-primary">{BONUS_PERCENTAGE}%</span> de bônus até{" "}
                      <span className="font-bold text-primary">R$ {BONUS_MAX_AMOUNT.toFixed(2).replace(".", ",")}</span>
                    </FormDescription>
                    
                    {/* Valor calculado do bônus em destaque */}
                    <div className="mt-1 pl-6">
                      <div className="font-medium">
                        Receba{" "}
                        <span className="text-primary font-bold">
                          R$ {currentBonusAmount.toFixed(2).replace(".", ",")}
                        </span>{" "}
                        de bônus
                      </div>
                      <div className="text-xs text-amber-500 mt-1">
                        Rollover de <span className="font-semibold">2x</span> necessário para saque.
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}

// Função auxiliar para abrir o diálogo de depósito a partir de qualquer componente
export function requestOpenDepositDialog() {
  const event = new CustomEvent('open-deposit-dialog');
  window.dispatchEvent(event);
}