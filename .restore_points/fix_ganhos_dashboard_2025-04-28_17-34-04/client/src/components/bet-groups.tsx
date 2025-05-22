import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DrawWithDetails, Animal, BetFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AnimalCard } from "@/components/animal-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAnimalEmoji } from "@/lib/animal-icons";
import { formatCurrency, parseMoneyValue } from "@/lib/utils";
import { MoneyInput } from "@/components/money-input";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, DollarSign, Award, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

interface BetGroupsProps {
  draws: DrawWithDetails[];
  animals: Animal[];
  selectedDraw: number | null;
  onSelectDraw: (drawId: number) => void;
  gameModes: any[];
  systemSettings: any;
}

export function BetGroups({ 
  draws,
  animals, 
  selectedDraw,
  onSelectDraw,
  gameModes,
  systemSettings
}: BetGroupsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  
  // Não precisamos mais filtrar os animais por grupos, vamos mostrar todos de uma vez
  const sortedAnimals = [...animals].sort((a, b) => a.group - b.group);
  
  // Usar a modalidade que foi passada diretamente
  const groupGameMode = gameModes && gameModes.length > 0 ? gameModes[0] : undefined;

  // Define form validation schema
  const formSchema = z.object({
    drawId: z.number().positive("Selecione um sorteio válido"),
    animalId: z.number().positive("Selecione um animal para apostar"),
    amount: z.number()
      .min(1, "Valor mínimo da aposta é 1")
      .max(systemSettings?.maxBetAmount || 1000, 
        `Valor máximo da aposta é ${systemSettings?.maxBetAmount || 1000}`),
    gameModeId: z.number(),
    type: z.literal("group"),
    premioType: z.enum(["1", "2", "3", "4", "5", "1-5"], {
      required_error: "Selecione um prêmio",
    })
  });

  // Initialize form - valor initial (amount) DEVE ser undefined
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drawId: selectedDraw || undefined,
      animalId: undefined,
      amount: undefined, // IMPORTANTE: Deve ser undefined para começar realmente vazio
      gameModeId: groupGameMode?.id || (gameModes && gameModes.length > 0 ? gameModes[0].id : undefined),
      type: "group",
      premioType: "1"
    },
  });
  
  // Forçar o valor para vazio na inicialização
  useEffect(() => {
    // Este código é executado apenas uma vez na montagem do componente
    console.log("bet-groups: Forçando valor inicial para vazio");
    form.setValue("amount", "" as any);
  }, []);
  
  // Watch for form value changes
  const formValues = form.watch();
  
  // Calculate potential win
  const selectedGameMode = gameModes?.find(mode => mode.id === formValues.gameModeId);
  
  // Aplica divisão de prêmio quando apostando em todos os prêmios (1-5)
  let multiplier = selectedGameMode ? selectedGameMode.odds : 0;
  if (formValues.premioType === "1-5") {
    multiplier = multiplier / 5;
  }
  
  const potentialWinAmount = Math.floor(formValues.amount * multiplier);
  
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
      // Clear form and animal selection
      form.reset({
        drawId: selectedDraw || undefined,
        animalId: undefined,
        amount: 0,
        gameModeId: formValues.gameModeId,
        type: "group",
        premioType: formValues.premioType
      });
      setSelectedAnimal(null);
      
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
  
  // Handle submit
  const onSubmit = (data: z.infer<typeof formSchema>) => {
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
        description: `O prêmio máximo permitido é de R$ ${systemSettings.maxPayout}. Por favor, reduza o valor da aposta.`,
        variant: "destructive",
      });
      return;
    }
    
    // Verificação adicional para garantir que um animal foi selecionado
    if (!data.animalId) {
      toast({
        title: "Animal não selecionado",
        description: "Por favor, selecione um animal para realizar a aposta.",
        variant: "destructive",
      });
      return;
    }
    
    // Animal selecionado para o grupo
    const animal = animals.find(a => a.id === data.animalId);
    
    // Criar o objeto da mesma forma que é feito no mobile-bet-wizard
    const betData: BetFormData = {
      drawId: data.drawId,
      amount: data.amount,
      gameModeId: data.gameModeId,
      type: data.type,
      premioType: data.premioType,
      potentialWinAmount,
      animalId: data.animalId,
      // Formatação correta para o backend - mesmo que no mobile-bet-wizard
      betNumbers: []
    };
    
    betMutation.mutate(betData);
  };
  
  const handleAnimalSelect = (animal: Animal) => {
    setSelectedAnimal(animal);
    form.setValue("animalId", animal.id);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Selecione um Grupo</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[500px] overflow-y-auto pr-2">
          {sortedAnimals.map(animal => (
            <AnimalCard 
              key={animal.id}
              animal={animal}
              selected={selectedAnimal?.id === animal.id}
              onClick={handleAnimalSelect}
            />
          ))}
        </div>
      </div>
      
      <div>
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                
                {/* A modalidade é determinada pela aba - neste caso "Grupo" */}
                {selectedGameMode && (
                  <div className="bg-primary/5 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">Modalidade:</p>
                    <p className="font-semibold text-primary flex items-center">
                      <span className="mr-2">Grupo</span>
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
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-700">Possível Retorno:</p>
                    <p className={`text-xl font-bold flex items-center ${exceedsMaxPayout ? 'text-red-500' : 'text-green-600'}`}>
                      <DollarSign className="h-5 w-5 mr-1" />
                      {formatCurrency(potentialWinAmount).replace('R$ ', '')}
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
                            <RadioGroupItem value="1" id="premio-1" className="peer sr-only" />
                            <Label
                              htmlFor="premio-1"
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
                            <RadioGroupItem value="2" id="premio-2" className="peer sr-only" />
                            <Label
                              htmlFor="premio-2"
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
                            <RadioGroupItem value="3" id="premio-3" className="peer sr-only" />
                            <Label
                              htmlFor="premio-3"
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
                            <RadioGroupItem value="4" id="premio-4" className="peer sr-only" />
                            <Label
                              htmlFor="premio-4"
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
                            <RadioGroupItem value="5" id="premio-5" className="peer sr-only" />
                            <Label
                              htmlFor="premio-5"
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
                            <RadioGroupItem value="1-5" id="premio-1-5" className="peer sr-only" />
                            <Label
                              htmlFor="premio-1-5"
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
                      Valor máximo de prêmio excedido (R$ {systemSettings.maxPayout}). Reduza o valor da aposta.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!selectedAnimal || !formValues.drawId || !formValues.gameModeId || betMutation.isPending || exceedsMaxPayout}
                  >
                    {betMutation.isPending ? (
                      "Registrando Aposta..."
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Confirmar Aposta no {selectedAnimal?.name || "Grupo"}
                      </>
                    )}
                  </Button>
                </div>
                
                {selectedAnimal && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-center gap-3">
                    <div className="text-4xl">{getAnimalEmoji(selectedAnimal.name)}</div>
                    <div>
                      <p className="text-sm text-gray-500">Grupo selecionado:</p>
                      <p className="font-bold">{selectedAnimal.name} ({selectedAnimal.group})</p>
                      <p className="text-xs text-gray-500">Números: {selectedAnimal.numbers.join(', ')}</p>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}