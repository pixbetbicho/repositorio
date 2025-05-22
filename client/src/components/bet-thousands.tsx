import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DrawWithDetails, BetFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, parseMoneyValue } from "@/lib/utils";
import { MoneyInput } from "@/components/money-input";
import { BetAmountPresets } from "@/components/bet-amount-presets";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, DollarSign, Hash, Award, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

interface BetThousandsProps {
  draws: DrawWithDetails[];
  selectedDraw: number | null;
  onSelectDraw: (drawId: number) => void;
  gameModes: any[];
  systemSettings: any;
}

export function BetThousands({ 
  draws,
  selectedDraw,
  onSelectDraw,
  gameModes,
  systemSettings
}: BetThousandsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Encontrar a modalidade específica para Milhar
  const thousandGameMode = gameModes?.find(mode => 
    mode.name.toLowerCase().includes("milhar")
  );

  // Define form validation schema
  const formSchema = z.object({
    drawId: z.number().positive("Selecione um sorteio válido"),
    amount: z.number()
      .min(1, "Valor mínimo da aposta é 1")
      .max(systemSettings?.maxBetAmount || 1000, 
        `Valor máximo da aposta é ${systemSettings?.maxBetAmount || 1000}`),
    gameModeId: z.literal(1),
    type: z.literal("thousand"),
    betNumber: z.string()
      .min(4, "A milhar deve ter exatamente 4 dígitos")
      .max(4, "A milhar deve ter exatamente 4 dígitos")
      .regex(/^[0-9]{4}$/, "A milhar deve conter exatamente 4 dígitos numéricos"),
    premioType: z.enum(["1", "2", "3", "4", "5", "1-5"], {
      required_error: "Selecione um prêmio",
    })
  });

  // Initialize form - SEMPRE usa o ID 1 da Milhar
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drawId: selectedDraw || undefined,
      amount: undefined, // IMPORTANTE: Deve ser undefined para começar realmente vazio
      gameModeId: 1, // ID fixo para Milhar
      type: "thousand",
      betNumber: "",
      premioType: "1"
    },
  });
  
  // Forçar o valor para vazio na inicialização
  useEffect(() => {
    // Este código é executado apenas uma vez na montagem do componente
    console.log("bet-thousands: Forçando valor inicial para vazio");
    form.setValue("amount", "" as any);
  }, []);
  
  // Watch for form value changes
  const formValues = form.watch();
  
  // Verificação adicional para número exato de dígitos
  const isBetNumberValid = formValues.betNumber && formValues.betNumber.length === 4;
  
  // Calculate potential win
  const selectedGameMode = gameModes?.find(mode => mode.id === formValues.gameModeId);
  // Cálculo do potencial de ganho usando o valor real da aposta e o multiplicador do modo de jogo
  const basePotentialWin = selectedGameMode 
    ? formValues.amount * selectedGameMode.odds 
    : 0;
    
  // Ajusta o potencial de ganho baseado no tipo de prêmio selecionado
  const potentialWinAmount = formValues.premioType === "1-5" 
    ? Math.floor(basePotentialWin / 5) // Divide por 5 para apostas em todos os prêmios
    : basePotentialWin; // Valor integral para apostas em prêmios específicos
  
  // Check if bet exceeds maximum payout
  const exceedsMaxPayout = systemSettings?.maxPayout 
    ? potentialWinAmount > systemSettings.maxPayout 
    : false;
  
  // Create mutation for placing bets
  const betMutation = useMutation({
    mutationFn: async (betData: BetFormData) => {
      const response = await apiRequest("POST", "/api/bets", betData);
      return response.json();
    },
    onSuccess: () => {
      // Clear form
      form.reset({
        drawId: selectedDraw || undefined,
        amount: 0,
        gameModeId: formValues.gameModeId,
        type: "thousand",
        betNumber: "",
        premioType: formValues.premioType
      });
      
      // Refresh user data to update balance
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Aposta Registrada!",
        description: "Sua aposta foi registrada com sucesso. Boa sorte!",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Registrar Aposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle submit - com validação estrita desde a primeira tentativa
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Sempre validar número de dígitos primeiro, antes de qualquer outro processamento
    if (!data.betNumber || data.betNumber.length !== 4) {
      toast({
        title: "Número incompleto",
        description: "Apostas de milhar exigem exatamente 4 dígitos. Por favor, complete o número.",
        variant: "destructive",
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Você precisa estar logado",
        description: "Por favor, faça login para realizar uma aposta.",
        variant: "destructive",
      });
      return;
    }
    
    if (exceedsMaxPayout) {
      toast({
        title: "Valor da aposta muito alto",
        description: `O prêmio máximo permitido é de ${formatCurrency(systemSettings.maxPayout)}. Por favor, reduza o valor da aposta.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validação extra como garantia dupla antes de criar o objeto
    if (data.betNumber.length !== 4) {
      toast({
        title: "Número incompleto",
        description: "Apostas de milhar exigem exatamente 4 dígitos. Por favor, complete o número.",
        variant: "destructive",
      });
      return;
    }
    
    // Usar a mesma estrutura do objeto que é usada no mobile-bet-wizard
    const betData: BetFormData = {
      drawId: data.drawId,
      amount: data.amount,
      gameModeId: 1, // Força o ID correto para Milhar
      type: "thousand", // Força o tipo correto consistente com o ID
      premioType: data.premioType,
      potentialWinAmount,
      betNumbers: [data.betNumber], // Array com o número exato (sem preenchimento com zeros)
    };
    
    console.log("Enviando aposta de milhar:", betData);
    betMutation.mutate(betData);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary/10 p-3 rounded-full">
              <Hash className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold ml-3">Apostar na Milhar</h3>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="betNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milhar (4 dígitos)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="border rounded-md p-2 text-center font-mono text-lg h-10 flex items-center justify-center bg-white">
                          {field.value || <span className="text-gray-400">0000</span>}
                          {field.value && field.value.length < 4 && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {field.value.length}/4
                            </div>
                          )}
                        </div>
                        
                        {/* Indicador de validação */}
                        <div className="mt-1 text-xs">
                          <span className={`${field.value && field.value.length === 4 ? 'text-green-500' : 'text-gray-400'}`}>
                            {field.value && field.value.length === 4 ? '✓' : '○'} Deve ter exatamente 4 dígitos
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-5 gap-1">
                          {['0','1','2','3','4','5','6','7','8','9'].map(num => (
                            <button
                              key={num}
                              type="button"
                              className="p-2 bg-white border rounded-md hover:bg-gray-100 text-sm font-medium"
                              onClick={() => {
                                const currentValue = field.value || '';
                                if (currentValue.length < 4) {
                                  field.onChange(currentValue + num);
                                } else {
                                  toast({
                                    title: "Limite de dígitos atingido",
                                    description: "Apostas de milhar devem ter exatamente 4 dígitos.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            className="p-2 bg-white border rounded-md hover:bg-gray-100 text-sm font-medium"
                            onClick={() => field.onChange('')}
                          >
                            Limpar
                          </button>
                          <button
                            type="button"
                            className="p-2 bg-white border rounded-md hover:bg-gray-100 text-sm font-medium"
                            onClick={() => {
                              const currentValue = field.value || '';
                              if (currentValue.length > 0) {
                                field.onChange(currentValue.slice(0, -1));
                              }
                            }}
                          >
                            Apagar
                          </button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="drawId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sorteio</FormLabel>
                    <Select 
                      value={field.value?.toString() || ''} 
                      onValueChange={value => {
                        field.onChange(Number(value));
                        onSelectDraw(Number(value));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um sorteio" />
                      </SelectTrigger>
                      <SelectContent>
                        {draws.map(draw => (
                          <SelectItem key={draw.id} value={draw.id.toString()}>
                            {draw.name} - {new Date(draw.date).toLocaleDateString()} ({draw.time}h)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* A modalidade é determinada pela aba - neste caso "Milhar" */}
              {selectedGameMode && (
                <div className="bg-primary/5 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">Modalidade:</p>
                  <p className="font-semibold text-primary flex items-center">
                    <span className="mr-2">Milhar</span>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                      {selectedGameMode.odds}x
                    </span>
                  </p>
                </div>
              )}
              
              <div className="flex gap-4 items-end">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Valor da Aposta</FormLabel>
                      <FormControl>
                        <div>
                          <MoneyInput
                            value={field.value === undefined || field.value === 0 ? "" : field.value.toString()}
                            onChange={(value) => {
                              const val = value === "" ? 0 : parseMoneyValue(value);
                              field.onChange(val);
                            }}
                            min={systemSettings?.minBetAmount || 1}
                            max={systemSettings?.maxBetAmount || 1000}
                            placeholder="0,00"
                          />
                          
                          {/* Não precisamos de valores pré-definidos aqui pois já existem no formulário principal */}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-700">Possível Retorno:</p>
                  <p className={`text-xl font-bold flex items-center ${exceedsMaxPayout ? 'text-red-500' : 'text-green-600'}`}>
                    <DollarSign className="h-5 w-5 mr-1" />
                    {formatCurrency(potentialWinAmount, false).replace('R$ ', '')}
                  </p>
                </div>
              </div>
              
              {/* Seleção de Prêmio */}
              <FormField
                control={form.control}
                name="premioType"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel>Prêmio</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center text-xs text-blue-600 cursor-help">
                              <Info className="h-3.5 w-3.5 mr-1" />
                              <span>Sobre os prêmios</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>Escolha em qual prêmio deseja apostar:</p>
                            <ul className="mt-1 pl-4 list-disc">
                              <li className="text-xs">1° Prêmio: Paga o valor integral</li>
                              <li className="text-xs">2° Prêmio: Paga o valor integral</li>
                              <li className="text-xs">3° Prêmio: Paga o valor integral</li>
                              <li className="text-xs">4° Prêmio: Paga o valor integral</li>
                              <li className="text-xs">5° Prêmio: Paga o valor integral</li>
                              <li className="text-xs">1° ao 5° Prêmio: Paga 1/5 do valor para cada acerto</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-3 sm:grid-cols-6 gap-1"
                      >
                        {/* Opção para 1° prêmio */}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="premio-1-thousands" className="peer sr-only" />
                          <Label
                            htmlFor="premio-1-thousands"
                            className="flex flex-col items-center justify-center w-full h-14 rounded-md border-2 border-muted 
                                     bg-popover p-1 hover:bg-accent hover:text-accent-foreground 
                                     peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                                     cursor-pointer text-center"
                          >
                            <Award className="h-4 w-4 mb-1" />
                            <span className="text-xs font-medium">1° Prêmio</span>
                          </Label>
                        </div>
                        
                        {/* Opção para 2° prêmio */}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="2" id="premio-2-thousands" className="peer sr-only" />
                          <Label
                            htmlFor="premio-2-thousands"
                            className="flex flex-col items-center justify-center w-full h-14 rounded-md border-2 border-muted 
                                     bg-popover p-1 hover:bg-accent hover:text-accent-foreground 
                                     peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                                     cursor-pointer text-center"
                          >
                            <Award className="h-4 w-4 mb-1" />
                            <span className="text-xs font-medium">2° Prêmio</span>
                          </Label>
                        </div>
                        
                        {/* Opção para 3° prêmio */}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="3" id="premio-3-thousands" className="peer sr-only" />
                          <Label
                            htmlFor="premio-3-thousands"
                            className="flex flex-col items-center justify-center w-full h-14 rounded-md border-2 border-muted 
                                     bg-popover p-1 hover:bg-accent hover:text-accent-foreground 
                                     peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                                     cursor-pointer text-center"
                          >
                            <Award className="h-4 w-4 mb-1" />
                            <span className="text-xs font-medium">3° Prêmio</span>
                          </Label>
                        </div>
                        
                        {/* Opção para 4° prêmio */}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="4" id="premio-4-thousands" className="peer sr-only" />
                          <Label
                            htmlFor="premio-4-thousands"
                            className="flex flex-col items-center justify-center w-full h-14 rounded-md border-2 border-muted 
                                     bg-popover p-1 hover:bg-accent hover:text-accent-foreground 
                                     peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                                     cursor-pointer text-center"
                          >
                            <Award className="h-4 w-4 mb-1" />
                            <span className="text-xs font-medium">4° Prêmio</span>
                          </Label>
                        </div>
                        
                        {/* Opção para 5° prêmio */}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="5" id="premio-5-thousands" className="peer sr-only" />
                          <Label
                            htmlFor="premio-5-thousands"
                            className="flex flex-col items-center justify-center w-full h-14 rounded-md border-2 border-muted 
                                     bg-popover p-1 hover:bg-accent hover:text-accent-foreground 
                                     peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                                     cursor-pointer text-center"
                          >
                            <Award className="h-4 w-4 mb-1" />
                            <span className="text-xs font-medium">5° Prêmio</span>
                          </Label>
                        </div>
                        
                        {/* Opção para todos os prêmios (1-5) */}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1-5" id="premio-1-5-thousands" className="peer sr-only" />
                          <Label
                            htmlFor="premio-1-5-thousands"
                            className="flex flex-col items-center justify-center w-full h-14 rounded-md border-2 border-muted 
                                     bg-popover p-1 hover:bg-accent hover:text-accent-foreground 
                                     peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                                     cursor-pointer text-center"
                          >
                            <div className="flex justify-center">
                              <Award className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium">Todos</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {exceedsMaxPayout && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Valor máximo de prêmio excedido ({formatCurrency(systemSettings.maxPayout)}). Reduza o valor da aposta.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!isBetNumberValid || !formValues.drawId || !formValues.gameModeId || betMutation.isPending || exceedsMaxPayout}
                >
                  {betMutation.isPending ? (
                    "Registrando Aposta..."
                  ) : !isBetNumberValid ? (
                    <>Digite exatamente 4 dígitos</>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Confirmar Aposta na Milhar {formValues.betNumber}
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Como Funciona:</h4>
                <p className="text-sm text-gray-600">
                  Aposte no número completo de 4 dígitos do resultado. Por exemplo, se o número sorteado for 1234, você ganha se apostou exatamente no <strong>1234</strong>.
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}