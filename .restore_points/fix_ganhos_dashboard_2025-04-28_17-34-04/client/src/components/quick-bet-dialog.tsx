import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getAnimalEmoji } from "@/lib/animal-icons";
import { formatCurrency, parseMoneyValue } from "@/lib/utils";
import { NumericKeyboard } from "@/components/numeric-keyboard";
import { 
  Animal, 
  Draw as DrawType, 
  GameMode as GameModeType, 
  BetFormData 
} from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, 
  Check, 
  DollarSign, 
  ArrowRight, 
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface QuickBetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickBetDialog({ open, onOpenChange }: QuickBetDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("grupo");
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number | undefined>(undefined);
  const [rawInputValue, setRawInputValue] = useState<string>("");
  const [betNumber, setBetNumber] = useState<string>("");
  const [premioType, setPremioType] = useState<string>("1");
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch data
  const { data: animals, isLoading: animalsLoading } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: draws, isLoading: drawsLoading } = useQuery<DrawType[]>({
    queryKey: ["/api/draws/upcoming"],
  });

  const { data: gameModes, isLoading: gameModesLoading } = useQuery<GameModeType[]>({
    queryKey: ["/api/game-modes"],
  });

  const { data: systemSettings } = useQuery<{
    maxBetAmount: number;
    maxPayout: number;
    mainColor: string;
    secondaryColor: string;
    accentColor: string;
    allowUserRegistration: boolean;
    allowDeposits: boolean;
    allowWithdrawals: boolean;
    maintenanceMode: boolean;
  }>({
    queryKey: ["/api/admin/settings"],
  });

  // Set defaults when data loads
  useEffect(() => {
    if (draws && draws.length > 0 && !selectedDraw) {
      setSelectedDraw(draws[0].id);
    }
  }, [draws, selectedDraw]);

  // Filter active game modes and get the selected one
  const activeGameModes = gameModes?.filter(mode => mode.active) || [];
  const selectedGameMode = activeGameModes.find(
    mode => mode.name.toLowerCase().includes(activeTab.toLowerCase())
  );

  // Calculate potential win amount
  const multiplier = selectedGameMode ? selectedGameMode.odds / 100 : 0;
  const adjustedMultiplier = premioType === "1-5" ? multiplier / 5 : multiplier;
  const betAmountValue = betAmount || 0; // Valor seguro para cálculos
  const potentialWinAmount = Math.floor(betAmountValue * adjustedMultiplier);
  
  // Check if exceeds max payout
  const exceedsMaxPayout = systemSettings?.maxPayout 
    ? potentialWinAmount > systemSettings.maxPayout 
    : false;
  
  // Get expected number length based on bet type
  const getExpectedNumberLength = () => {
    if (activeTab === "dezena") return 2;
    if (activeTab === "centena") return 3;
    if (activeTab === "milhar") return 4;
    return 0;
  };

  // Validate if the bet can proceed
  const canProceed = () => {
    if (!selectedDraw) return false;
    if (!selectedGameMode) return false;
    
    // Animal selection required for grupo bet
    if (activeTab === "grupo" && !selectedAnimal) return false;
    
    // Number validation for number-based bets
    if (["dezena", "centena", "milhar"].includes(activeTab)) {
      const expectedLength = getExpectedNumberLength();
      if (betNumber.length !== expectedLength) return false;
    }
    
    return true;
  };

  // Create mutation for placing bets
  const betMutation = useMutation({
    mutationFn: async (betData: BetFormData) => {
      const response = await apiRequest("POST", "/api/bets", betData);
      return response.json();
    },
    onSuccess: () => {
      // Reset form and close dialog
      resetForm();
      onOpenChange(false);
      
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

  // Funções para o teclado numérico
  const handleKeyPress = (key: string) => {
    setRawInputValue(prev => prev + key);
  };
  
  const handleBackspace = () => {
    setRawInputValue(prev => prev.slice(0, -1));
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setSelectedAnimal(null);
    setBetNumber("");
    setBetAmount(undefined);
    setRawInputValue("");
    setPremioType("1");
    setActiveTab("grupo");
    setShowKeyboard(false);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedAnimal(null);
    setBetNumber("");
  };
  
  // Handle animal selection
  const handleAnimalSelect = (animal: Animal) => {
    setSelectedAnimal(animal);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!user) {
      toast({
        title: "Você precisa estar logado",
        description: "Por favor, faça login para realizar uma aposta.",
        variant: "destructive",
      });
      return;
    }
    
    if (!canProceed()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos necessários.",
        variant: "destructive",
      });
      return;
    }
    
    if (exceedsMaxPayout && systemSettings) {
      toast({
        title: "Valor da aposta muito alto",
        description: `O prêmio máximo permitido é de ${formatCurrency(systemSettings.maxPayout)}. Por favor, reduza o valor da aposta.`,
        variant: "destructive",
      });
      return;
    }
    
    const currentBetAmount = betAmount || 0;
    if (user.balance < currentBetAmount) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para fazer essa aposta. Faça um depósito primeiro.",
        variant: "destructive",
      });
      return;
    }

    // Create bet data object
    let betType: string;
    if (activeTab === "grupo") betType = "group";
    else if (activeTab === "dezena") betType = "dozen";
    else if (activeTab === "centena") betType = "hundred";
    else betType = "thousand";

    // Se betAmount for undefined, usa 0 como fallback (não deveria ocorrer pois validamos antes)
    const safeBetAmount = betAmount || 0;

    const betData: BetFormData = {
      drawId: selectedDraw!,
      gameModeId: selectedGameMode!.id,
      amount: safeBetAmount,
      type: betType as any,
      premioType: premioType as any,
      potentialWinAmount,
    };
    
    // Add animal ID for group bets
    if (activeTab === "grupo" && selectedAnimal) {
      betData.animalId = selectedAnimal.id;
    }
    
    // Add bet number for number-based bets
    if (["dezena", "centena", "milhar"].includes(activeTab) && betNumber) {
      betData.betNumber = betNumber;
    }
    
    betMutation.mutate(betData);
  };

  // Sort animals by group
  const sortedAnimals = [...(animals || [])].sort((a, b) => a.group - b.group);

  // Loading state
  if (animalsLoading || drawsLoading || gameModesLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-48" />
            <Skeleton className="w-full h-8" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // No game modes available
  if (!activeGameModes || activeGameModes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Apostas Indisponíveis</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-6">
            <p className="text-center text-muted-foreground">
              Não há modalidades de apostas disponíveis no momento.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Group betting modes by category for tabs
  const grupoModes = activeGameModes.filter(mode => 
    mode.name.toLowerCase().includes("grupo")
  );
  
  const dezenaModes = activeGameModes.filter(mode => 
    mode.name.toLowerCase().includes("dezena")
  );
  
  const centenaModes = activeGameModes.filter(mode => 
    mode.name.toLowerCase().includes("centena")
  );
  
  const milharModes = activeGameModes.filter(mode => 
    mode.name.toLowerCase().includes("milhar")
  );

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl p-0 rounded-lg overflow-hidden shadow-xl">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <DialogTitle className="text-xl flex items-center">
              <span className="bg-primary text-white p-1.5 rounded-full flex items-center justify-center mr-2">
                <DollarSign className="h-5 w-5" />
              </span>
              Fazer Aposta
            </DialogTitle>
            <DialogDescription>
              Selecione o tipo de aposta e os detalhes
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto max-h-[70vh]">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="p-4 border-b bg-gray-50 sticky top-0 z-10">
                <TabsList className="grid w-full grid-cols-4">
                  {grupoModes.length > 0 && (
                    <TabsTrigger value="grupo" className="text-sm">
                      Grupo
                    </TabsTrigger>
                  )}
                  {dezenaModes.length > 0 && (
                    <TabsTrigger value="dezena" className="text-sm">
                      Dezena
                    </TabsTrigger>
                  )}
                  {centenaModes.length > 0 && (
                    <TabsTrigger value="centena" className="text-sm">
                      Centena
                    </TabsTrigger>
                  )}
                  {milharModes.length > 0 && (
                    <TabsTrigger value="milhar" className="text-sm">
                      Milhar
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="p-4">
                {/* Grupo Tab */}
                <TabsContent value="grupo" className="mt-0">
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 gap-1">
                      {sortedAnimals.map(animal => (
                        <Button
                          key={animal.id}
                          variant={selectedAnimal?.id === animal.id ? "default" : "outline"}
                          className="flex flex-col items-center justify-center h-16 p-1 aspect-square"
                          onClick={() => handleAnimalSelect(animal)}
                        >
                          <span className="text-xl">{getAnimalEmoji(animal.name)}</span>
                          <span className="text-xs font-medium truncate w-full text-center">{animal.name}</span>
                          <span className="text-xs">{animal.group}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Dezena Tab */}
                <TabsContent value="dezena" className="mt-0">
                  <div className="space-y-4">
                    <div className="border p-4 rounded-lg bg-slate-50">
                      <div className="text-center text-3xl font-mono tracking-wider mb-4 h-10 border bg-white rounded-md flex items-center justify-center">
                        {betNumber ? betNumber : (
                          <span className="text-gray-400">00</span>
                        )}
                      </div>
                      
                      {/* Teclado virtual */}
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                          <button
                            key={num}
                            type="button"
                            className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                            onClick={() => {
                              if (betNumber.length < 2) {
                                setBetNumber(betNumber + num.toString());
                              }
                            }}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            if (betNumber.length > 0) {
                              setBetNumber(betNumber.slice(0, -1));
                            }
                          }}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            if (betNumber.length < 2) {
                              setBetNumber(betNumber + "0");
                            }
                          }}
                        >
                          0
                        </button>
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            setBetNumber("");
                          }}
                        >
                          C
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                      Aposte nos últimos 2 dígitos do número sorteado.
                    </p>
                  </div>
                </TabsContent>

                {/* Centena Tab */}
                <TabsContent value="centena" className="mt-0">
                  <div className="space-y-4">
                    <div className="border p-4 rounded-lg bg-slate-50">
                      <div className="text-center text-3xl font-mono tracking-wider mb-4 h-10 border bg-white rounded-md flex items-center justify-center">
                        {betNumber ? betNumber : (
                          <span className="text-gray-400">000</span>
                        )}
                      </div>
                      
                      {/* Teclado virtual */}
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                          <button
                            key={num}
                            type="button"
                            className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                            onClick={() => {
                              if (betNumber.length < 3) {
                                setBetNumber(betNumber + num.toString());
                              }
                            }}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            if (betNumber.length > 0) {
                              setBetNumber(betNumber.slice(0, -1));
                            }
                          }}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            if (betNumber.length < 3) {
                              setBetNumber(betNumber + "0");
                            }
                          }}
                        >
                          0
                        </button>
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            setBetNumber("");
                          }}
                        >
                          C
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                      Aposte nos últimos 3 dígitos do número sorteado.
                    </p>
                  </div>
                </TabsContent>

                {/* Milhar Tab */}
                <TabsContent value="milhar" className="mt-0">
                  <div className="space-y-4">
                    <div className="border p-4 rounded-lg bg-slate-50">
                      <div className="text-center text-3xl font-mono tracking-wider mb-4 h-10 border bg-white rounded-md flex items-center justify-center">
                        {betNumber ? betNumber : (
                          <span className="text-gray-400">0000</span>
                        )}
                      </div>
                      
                      {/* Teclado virtual */}
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                          <button
                            key={num}
                            type="button"
                            className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                            onClick={() => {
                              if (betNumber.length < 4) {
                                setBetNumber(betNumber + num.toString());
                              }
                            }}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            if (betNumber.length > 0) {
                              setBetNumber(betNumber.slice(0, -1));
                            }
                          }}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            if (betNumber.length < 4) {
                              setBetNumber(betNumber + "0");
                            }
                          }}
                        >
                          0
                        </button>
                        <button
                          type="button"
                          className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                          onClick={() => {
                            setBetNumber("");
                          }}
                        >
                          C
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                      Aposte no número completo de 4 dígitos.
                    </p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="p-4 border-t bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="draw-select">Sorteio</Label>
                    <Select 
                      value={selectedDraw?.toString() || ''} 
                      onValueChange={(value) => setSelectedDraw(Number(value))}
                    >
                      <SelectTrigger id="draw-select">
                        <SelectValue placeholder="Selecione um sorteio" />
                      </SelectTrigger>
                      <SelectContent>
                        {draws?.map(draw => (
                          <SelectItem key={draw.id} value={draw.id.toString()}>
                            {draw.name} ({draw.time}h)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bet-amount">Valor da Aposta</Label>
                    <div className="relative">
                      <Input
                        id="bet-amount"
                        type="text"
                        inputMode="none"
                        readOnly
                        min={0.5}
                        max={systemSettings?.maxBetAmount ?? 1000}
                        value={rawInputValue}
                        onChange={(e) => {
                          // Permitir dígitos e vírgula na entrada
                          let inputValue = e.target.value.replace(/[^\d,]/g, '');
                          
                          // Garantir que só tenha uma vírgula
                          const commaCount = (inputValue.match(/,/g) || []).length;
                          if (commaCount > 1) {
                            // Se houver mais de uma vírgula, manter apenas a primeira
                            const parts = inputValue.split(',');
                            inputValue = parts[0] + ',' + parts.slice(1).join('');
                          }
                          
                          setRawInputValue(inputValue);
                        }}
                        onFocus={(e) => {
                          // Ao entrar no campo, mostra o teclado numérico
                          setShowKeyboard(true);
                          
                          // Se houver um valor formatado, remover apenas pontos de milhar
                          if (rawInputValue && rawInputValue.includes('.')) {
                            // Manter dígitos e vírgula, remover apenas os pontos de milhar
                            setRawInputValue(rawInputValue.replace(/\./g, ''));
                          }
                        }}
                        onBlur={() => {
                          // Se o campo estiver vazio, define betAmount como undefined
                          if (!rawInputValue) {
                            setBetAmount(undefined);
                            return;
                          }
                          
                          // Converter conforme a lógica quando sair do campo
                          const val = parseMoneyValue(rawInputValue);
                          setBetAmount(val);
                          
                          // Formatar para exibição
                          if (val > 0) {
                            setRawInputValue(formatCurrency(val).replace('R$ ', ''));
                          }
                        }}
                        className="pl-8 font-medium cursor-pointer"
                        placeholder="0,00"
                        ref={inputRef}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    </div>
                    
                    {/* Valores pré-definidos */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["0,50", "1,00", "2,00", "5,00", "10,00", "50,00"].map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant="outline"
                          className="px-2 py-1 h-auto text-xs bg-white"
                          onClick={() => {
                            setRawInputValue(value);
                            setBetAmount(parseMoneyValue(value));
                          }}
                        >
                          R${value}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Teclado numérico */}
                    {showKeyboard && (
                      <div className="mt-3">
                        <NumericKeyboard 
                          onKeyPress={handleKeyPress}
                          onBackspace={handleBackspace}
                          onClose={() => setShowKeyboard(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Prêmio</Label>
                    <RadioGroup
                      value={premioType}
                      onValueChange={setPremioType}
                      className="grid grid-cols-3 gap-2 mt-2"
                    >
                      <Label className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                        premioType === "1" ? 'border-primary bg-primary/10' : ''
                      }`}>
                        <RadioGroupItem value="1" id="premio-1" className="sr-only" />
                        <span>1º</span>
                      </Label>
                      
                      <Label className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                        premioType === "2" ? 'border-primary bg-primary/10' : ''
                      }`}>
                        <RadioGroupItem value="2" id="premio-2" className="sr-only" />
                        <span>2º</span>
                      </Label>
                      
                      <Label className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                        premioType === "3" ? 'border-primary bg-primary/10' : ''
                      }`}>
                        <RadioGroupItem value="3" id="premio-3" className="sr-only" />
                        <span>3º</span>
                      </Label>
                      
                      <Label className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                        premioType === "4" ? 'border-primary bg-primary/10' : ''
                      }`}>
                        <RadioGroupItem value="4" id="premio-4" className="sr-only" />
                        <span>4º</span>
                      </Label>
                      
                      <Label className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                        premioType === "5" ? 'border-primary bg-primary/10' : ''
                      }`}>
                        <RadioGroupItem value="5" id="premio-5" className="sr-only" />
                        <span>5º</span>
                      </Label>
                      
                      <Label className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                        premioType === "1-5" ? 'border-primary bg-primary/10' : ''
                      }`}>
                        <RadioGroupItem value="1-5" id="premio-all" className="sr-only" />
                        <span>Todos</span>
                      </Label>
                    </RadioGroup>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Possível Retorno:</p>
                      <p className={`text-xl font-bold flex items-center ${exceedsMaxPayout ? 'text-red-500' : 'text-green-600'}`}>
                        <DollarSign className="h-4 w-4 mr-1" />
                        {formatCurrency(potentialWinAmount).replace('R$ ', '')}
                      </p>
                    </div>
                    {user && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">Seu Saldo:</p>
                        <p className={`text-lg font-bold ${betAmount !== undefined && user.balance < betAmount ? 'text-red-500' : 'text-blue-600'}`}>
                          {formatCurrency(user.balance)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(exceedsMaxPayout && systemSettings) && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Valor máximo de prêmio excedido ({formatCurrency(systemSettings.maxPayout)}). Reduza o valor da aposta.
                  </AlertDescription>
                </Alert>
              )}

              {user && betAmount !== undefined && user.balance < betAmount && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Saldo insuficiente para essa aposta. Faça um depósito primeiro.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t mt-auto">
            <div className="flex w-full gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1 rounded-full py-5 text-base font-medium"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!canProceed() || betMutation.isPending || !!exceedsMaxPayout || (user && betAmount !== undefined && user.balance < betAmount)}
                onClick={handleSubmit}
                className="flex-1 rounded-full py-5 text-base font-medium shadow-md transition-all hover:shadow-lg bg-green-600 hover:bg-green-700"
              >
                {betMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" /> Apostar
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}