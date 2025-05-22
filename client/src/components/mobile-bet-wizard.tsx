// mobile-bet-wizard.tsx - Componente de apostas rápidas (refeito do zero)
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, parseMoneyValue } from "@/lib/utils";
import { Animal, DrawWithDetails, BetFormData, GameMode, BetType } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getAnimalEmoji } from "@/lib/animal-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check, Info, DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const formSchema = z.object({
  drawId: z.number({
    required_error: "Selecione um sorteio",
  }),
  gameModeId: z.number({
    required_error: "Selecione uma modalidade",
  }),
  premioType: z.enum(["1", "2", "3", "4", "5", "1-5"], {
    required_error: "Selecione o prêmio",
  }),
  amount: z.number({
    required_error: "Digite o valor da aposta",
  }).min(1, {
    message: "Valor mínimo de R$ 1,00",
  }),
  type: z.enum(["group", "duque_grupo", "terno_grupo", "quadra_duque", "quina_grupo", 
                "dozen", "duque_dezena", "terno_dezena", "hundred", "thousand", 
                "passe_ida", "passe_ida_volta"], {
    required_error: "Tipo de aposta é obrigatório",
  }),
  animalId: z.number().optional(),
  betNumber: z.string().optional(),
  betNumbers: z.array(z.string()).optional(),
})
.refine(data => {
  // Se for aposta por grupo, exigir animalId
  if (data.type === "group" && !data.animalId) {
    return false;
  }
  return true;
}, {
  message: "Selecione um animal para apostar",
  path: ["animalId"],
})
.refine(data => {
  // Se for aposta por dezena, verificar que betNumber tem o tamanho correto
  if (data.type === "dozen" && data.betNumber && data.betNumber.length !== 2) {
    return false;
  }
  return true;
}, {
  message: "A dezena deve ter exatamente 2 dígitos",
  path: ["betNumber"],
})
.refine(data => {
  // Se for aposta por centena, verificar que betNumber tem o tamanho correto
  if (data.type === "hundred" && data.betNumber && data.betNumber.length !== 3) {
    return false;
  }
  return true;
}, {
  message: "A centena deve ter exatamente 3 dígitos",
  path: ["betNumber"],
})
.refine(data => {
  // Se for aposta por milhar, verificar que betNumber tem o tamanho correto
  if (data.type === "thousand" && data.betNumber && data.betNumber.length !== 4) {
    return false;
  }
  return true;
}, {
  message: "A milhar deve ter exatamente 4 dígitos",
  path: ["betNumber"],
});

interface MobileBetWizardProps {
  draws: DrawWithDetails[];
  animals: Animal[];
  gameModes: GameMode[];
  systemSettings: any;
}

export function MobileBetWizard({
  draws,
  animals,
  gameModes,
  systemSettings
}: MobileBetWizardProps) {
  const [step, setStep] = useState(1);
  const [open, setOpen] = useState(false);
  const [activeModality, setActiveModality] = useState<string>("");
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("groups");
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [betNumber, setBetNumber] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Filter active game modes
  const activeGameModes = gameModes?.filter(mode => mode.active) || [];

  // Sort animals by group
  const sortedAnimals = [...animals].sort((a, b) => a.group - b.group);

  // Inicializar com valores fixos para evitar o problema
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 2.00, // Valor fixo para evitar problemas
      premioType: "1", // Default to 1st prize
      type: "group", // Default to group
    },
  });

  const formValues = form.watch();

  // Set default draw and game mode when component loads
  useEffect(() => {
    if (draws.length > 0 && !selectedDraw) {
      setSelectedDraw(draws[0].id);
      form.setValue("drawId", draws[0].id);
    }

    if (activeGameModes.length > 0 && !activeModality) {
      // Find a grupo mode by default
      const grupoMode = activeGameModes.find(mode => 
        mode.name.toLowerCase().includes("grupo") && 
        !mode.name.toLowerCase().includes("duque") && 
        !mode.name.toLowerCase().includes("terno")
      );
      
      if (grupoMode) {
        setActiveModality(grupoMode.id.toString());
        form.setValue("gameModeId", grupoMode.id);
      } else {
        setActiveModality(activeGameModes[0].id.toString());
        form.setValue("gameModeId", activeGameModes[0].id);
      }
    }
  }, [draws, activeGameModes, selectedDraw, activeModality, form]);

  // ****** NOVO CÁLCULO DE RETORNO POTENCIAL ******
  // COMPATIBILIZADO COM SERVIDOR E bet-form.tsx
  
  // 1. Identificar o GameMode correto baseado no tipo de aposta
  let betGameMode: GameMode | undefined = undefined;
  
  // Para cada categoria, buscar o modo de jogo adequado
  if (selectedCategory === "groups") {
    // Se temos modalidade ativa selecionada pelo usuário, usamos ela
    if (activeModality) {
      betGameMode = activeGameModes.find(mode => mode.id.toString() === activeModality);
    }
    // Se não encontrou, buscar qualquer modo de grupo (fallback)
    if (!betGameMode) {
      betGameMode = activeGameModes.find(mode => 
        mode.name.toLowerCase().includes("grupo") && 
        !mode.name.toLowerCase().includes("duque") && 
        !mode.name.toLowerCase().includes("terno")
      );
    }
  } 
  else if (selectedCategory === "dozens") {
    betGameMode = activeGameModes.find(mode => mode.name.toLowerCase().includes("dezena"));
  } 
  else if (selectedCategory === "hundreds") {
    betGameMode = activeGameModes.find(mode => mode.name.toLowerCase().includes("centena"));
  } 
  else if (selectedCategory === "thousands") {
    betGameMode = activeGameModes.find(mode => mode.name.toLowerCase().includes("milhar"));
  }
  
  // 2. Calcular o retorno potencial EXATAMENTE como o servidor
  let potentialWinAmount = 0;
  let calculatedOdds = 0;
  
  if (betGameMode && typeof betGameMode.odds === 'number') {
    // Obter o valor da aposta
    const betAmountValue = formValues.amount || 0;
    
    // Aplicar o divisor para apostas em todos os prêmios (1-5)
    const oddsDivisor = formValues.premioType === "1-5" ? 5 : 1;
    calculatedOdds = betGameMode.odds / oddsDivisor;
    
    // SERVIDOR CALCULA: validatedData.amount * gameMode.odds
    // Portanto, devemos fazer exatamente o mesmo:
    potentialWinAmount = betAmountValue * calculatedOdds;
    
    console.log("BET-WIZARD - CÁLCULO EXATO COMO SERVIDOR:", {
      modalidade: betGameMode.name,
      odds: betGameMode.odds,
      oddsDivisor,
      calculatedOdds,
      betAmount: betAmountValue,
      potentialWin: potentialWinAmount
    });
  } else {
    console.error("Erro: Modo de jogo não encontrado ou sem odds válidas");
  }
  
  // 3. Para o registro no debugger, também manter a referência do selectedGameMode
  const selectedGameMode = activeModality ? 
    activeGameModes.find(mode => mode.id.toString() === activeModality) : null;
  
  // Check if bet exceeds maximum payout
  const exceedsMaxPayout = systemSettings?.maxPayout 
    ? potentialWinAmount > systemSettings.maxPayout 
    : false;

  // Determine betting type based on selected modality
  useEffect(() => {
    if (selectedGameMode) {
      const modeName = selectedGameMode.name.toLowerCase();
      
      if (modeName.includes("grupo") || modeName.includes("passe")) {
        setSelectedCategory("groups");
        form.setValue("type", "group");
      } else if (modeName.includes("dezena")) {
        setSelectedCategory("dozens");
        form.setValue("type", "dozen");
        // Resetar o animal selecionado quando mudar para apostas por números
        form.setValue("animalId", undefined);
        setSelectedAnimal(null);
      } else if (modeName.includes("centena")) {
        setSelectedCategory("hundreds");
        form.setValue("type", "hundred");
        // Resetar o animal selecionado quando mudar para apostas por números
        form.setValue("animalId", undefined);
        setSelectedAnimal(null);
      } else if (modeName.includes("milhar")) {
        setSelectedCategory("thousands");
        form.setValue("type", "thousand");
        // Resetar o animal selecionado quando mudar para apostas por números
        form.setValue("animalId", undefined);
        setSelectedAnimal(null);
      }
    }
  }, [selectedGameMode, form]);

  // Create mutation for placing bets
  const betMutation = useMutation({
    mutationFn: async (betData: BetFormData) => {
      const response = await apiRequest("POST", "/api/bets", betData);
      return response.json();
    },
    onSuccess: () => {
      // Reset form and close dialog
      resetForm();
      setOpen(false);
      
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
      
      // Log detalhado do erro para ajudar na depuração
      console.error("Erro ao registrar aposta:", error);
    },
  });

  // Reset form to initial state
  const resetForm = () => {
    console.log("Resetando formulário para valor padrão", systemSettings?.defaultBetAmount || 2);
    
    // Obter valores padrão e garantir que são do tipo correto
    const defaultAmount = systemSettings?.defaultBetAmount || 2;
    const defaultDrawId = draws[0]?.id || 0;
    const defaultGameModeId = Number(activeModality) || 0;
    
    // Resetar para os valores padrão explícitos
    form.reset({
      drawId: defaultDrawId,
      gameModeId: defaultGameModeId, 
      amount: defaultAmount,
      premioType: "1", // Este valor já é compatível com o enum
      type: "group", // Usar um valor seguro que está no enum BetType
    });
    
    setSelectedAnimal(null);
    setBetNumber("");
    setStep(1);
  };
  
  // Verificar se há animal pré-selecionado ou aposta por número solicitada
  useEffect(() => {
    const preSelectedAnimalId = sessionStorage.getItem('preSelectedAnimal');
    const preSelectedModalityId = sessionStorage.getItem('preSelectedModality');
    const openNumberBet = sessionStorage.getItem('openNumberBet');
    const preSelectedDigit = sessionStorage.getItem('preSelectedDigit');
    
    // Verificar se é uma solicitação para abrir diretamente a aposta por números
    if (openNumberBet === 'true' && preSelectedModalityId) {
      if (activeGameModes.some(m => m.id.toString() === preSelectedModalityId)) {
        setActiveModality(preSelectedModalityId);
        form.setValue("gameModeId", Number(preSelectedModalityId));
        
        // Verificar o tipo de modalidade selecionada
        const selectedMode = activeGameModes.find(m => m.id.toString() === preSelectedModalityId);
        if (selectedMode) {
          const modeName = selectedMode.name.toLowerCase();
          
          if (modeName.includes("dezena")) {
            setSelectedCategory("dozens");
            form.setValue("type", "dozen");
            // Iniciar com o dígito pré-selecionado, se houver
            setBetNumber(preSelectedDigit || "");
          } else if (modeName.includes("centena")) {
            setSelectedCategory("hundreds");
            form.setValue("type", "hundred");
            setBetNumber(preSelectedDigit || "");
          } else if (modeName.includes("milhar")) {
            setSelectedCategory("thousands");
            form.setValue("type", "thousand");
            setBetNumber(preSelectedDigit || "");
          }
        }
        
        // Ir direto para tela de números
        setStep(2);
      }
      
      sessionStorage.removeItem('openNumberBet');
      sessionStorage.removeItem('preSelectedModality');
      sessionStorage.removeItem('preSelectedDigit');
      return;
    }
    
    // Caso tenha um animal pré-selecionado
    if (preSelectedAnimalId && animals.length > 0) {
      const animal = animals.find(a => a.id.toString() === preSelectedAnimalId);
      if (animal) {
        // Selecionar o animal e configurar o modo de aposta como "grupo"
        setSelectedAnimal(animal);
        form.setValue("animalId", animal.id);
        form.setValue("type", "group");
        setSelectedCategory("groups");
        
        // Usar a modalidade que estava selecionada na tela inicial
        if (preSelectedModalityId && activeGameModes.some(m => m.id.toString() === preSelectedModalityId)) {
          setActiveModality(preSelectedModalityId);
          form.setValue("gameModeId", Number(preSelectedModalityId));
          
          // Verificar o tipo de modalidade selecionada
          const selectedMode = activeGameModes.find(m => m.id.toString() === preSelectedModalityId);
          if (selectedMode) {
            const modeName = selectedMode.name.toLowerCase();
            
            if (modeName.includes("grupo") || modeName.includes("passe")) {
              setSelectedCategory("groups");
              form.setValue("type", "group");
            } else if (modeName.includes("dezena")) {
              setSelectedCategory("dozens");
              form.setValue("type", "dozen");
              setBetNumber(""); // Limpar qualquer número digitado anteriormente
            } else if (modeName.includes("centena")) {
              setSelectedCategory("hundreds");
              form.setValue("type", "hundred");
              setBetNumber("");
            } else if (modeName.includes("milhar")) {
              setSelectedCategory("thousands");
              form.setValue("type", "thousand");
              setBetNumber("");
            }
          }
        } else {
          // Fallback para modalidade de grupo se não houver modalidade selecionada
          const grupoMode = activeGameModes.find(mode => 
            mode.name.toLowerCase().includes("grupo") && 
            !mode.name.toLowerCase().includes("duque") && 
            !mode.name.toLowerCase().includes("terno")
          );
          
          if (grupoMode) {
            setActiveModality(grupoMode.id.toString());
            form.setValue("gameModeId", grupoMode.id);
          }
        }
        
        // Se for aposta por grupo, avançar direto para os detalhes
        if (selectedCategory === "groups") {
          // Avançar para o passo 3 (detalhes da aposta)
          setStep(3);
        } else {
          // Para apostas por números, ir para o passo 2 para digitar o número
          setStep(2);
        }
      }
      
      // Limpar os itens do sessionStorage após usá-los
      sessionStorage.removeItem('preSelectedAnimal');
      sessionStorage.removeItem('preSelectedModality');
    }
  }, [animals, form, activeGameModes, selectedCategory]);

  // Handle form submission - com validação estrita desde a primeira tentativa
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Validação inicial para apostas numéricas - verificar se tem o número correto de dígitos
    if (["dozens", "hundreds", "thousands"].includes(selectedCategory) && betNumber) {
      // Obter o comprimento esperado baseado no tipo de aposta
      const expectedLength = getExpectedNumberLength();
      
      // Verificar SEMPRE PRIMEIRO se o número tem exatamente o comprimento esperado
      if (betNumber.length !== expectedLength) {
        const mensagem = 
          selectedCategory === "dozens" ? "Apostas de dezena exigem exatamente 2 dígitos." : 
          selectedCategory === "hundreds" ? "Apostas de centena exigem exatamente 3 dígitos." :
          "Apostas de milhar exigem exatamente 4 dígitos.";
        
        toast({
          title: "Número incompleto",
          description: mensagem,
          variant: "destructive",
        });
        return;
      }
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
        description: `O prêmio máximo permitido é de R$ ${systemSettings.maxPayout}. Por favor, reduza o valor da aposta.`,
        variant: "destructive",
      });
      return;
    }

    // Criar objeto de aposta COMPLETAMENTE CORRETO garantindo que os tipos estejam corretos
    // e que o potentialWinAmount seja calculado exatamente como no servidor
    const betType = data.type as BetType;
    
    // Recalcular o potentialWinAmount no momento do submit usando a lógica do servidor
    const selectedMode = betGameMode;
    const adjustedOdds = selectedMode && formValues.premioType === "1-5" ? 
      selectedMode.odds / 5 : // Dividir por 5 apenas se for aposta em todos os prêmios
      selectedMode?.odds || 0;
      
    // Calcular exatamente como o servidor: amount * odds
    const finalPotentialWinAmount = data.amount * adjustedOdds;
    
    console.log("VALORES FINAIS NO MOMENTO DO SUBMIT:", {
      betType,
      gameMode: selectedMode?.name,
      odds: selectedMode?.odds,
      adjustedOdds,
      amount: data.amount,
      potentialWin: finalPotentialWinAmount,
      premioType: data.premioType
    });
    
    const betData: BetFormData = {
      drawId: data.drawId,
      gameModeId: data.gameModeId,
      amount: data.amount, // este é o valor REAL em reais
      type: betType,
      premioType: data.premioType,
      potentialWinAmount: finalPotentialWinAmount, // valor recalculado para garantir
    };
    
    // Adicionar o ID do animal para apostas por grupo
    if (selectedCategory === "groups" && data.animalId) {
      betData.animalId = data.animalId;
    }
    
    // Adicionar números para apostas de dezena, centena ou milhar
    if (["dozens", "hundreds", "thousands"].includes(selectedCategory) && betNumber) {
      // Obter o comprimento esperado baseado no tipo de aposta
      const expectedLength = getExpectedNumberLength();
      
      // Verificar se o número tem exatamente o comprimento esperado
      if (betNumber.length !== expectedLength) {
        toast({
          title: "Formato de número inválido",
          description: `Apostas de ${selectedCategory === "dozens" ? "dezena" : 
                         selectedCategory === "hundreds" ? "centena" : "milhar"} 
                         devem ter exatamente ${expectedLength} dígitos.`,
          variant: "destructive",
        });
        return;
      }
      
      // Se passou na validação, usar o número exato como está
      const formattedNumber = betNumber;
      
      // Adicionar os números formatados e REMOVER o campo betNumber
      betData.betNumbers = [formattedNumber];
      betData.betNumber = undefined;
      
      // Definir o tipo correto de aposta com base na categoria e forçar o ID correto do gameMode
      if (selectedCategory === "dozens") {
        betData.type = "dozen";
        betData.gameModeId = 4;  // ID correto para Dezena
      } else if (selectedCategory === "hundreds") {
        betData.type = "hundred";
        betData.gameModeId = 2;  // ID correto para Centena
      } else if (selectedCategory === "thousands") {
        betData.type = "thousand";
        betData.gameModeId = 1;  // ID correto para Milhar
      }
      
      // Log para depuração
      console.log(`Aposta por número: ${betData.type}, valor: ${formattedNumber}`);
    }

    // Log detalhado para depuração
    console.log("Enviando aposta:", {
      ...betData,
      selectedCategory,
      betNumber
    });
    
    // Log detalhado antes de enviar a aposta
    console.log("DADOS FINAIS DA APOSTA:", {
      betData,
      potentialWinAmount,
      betGameMode: betGameMode?.name,
      odds: calculatedOdds,
      selectedCategory
    });
    
    betMutation.mutate(betData);
  };

  // Handle animal selection
  const handleAnimalSelect = (animal: Animal) => {
    setSelectedAnimal(animal);
    form.setValue("animalId", animal.id);
    // Não avançar automaticamente
  };

  // Handle game mode selection
  const handleModeSelect = (modeId: string) => {
    setActiveModality(modeId);
    form.setValue("gameModeId", Number(modeId));
    // Não avança automaticamente mais, o usuário deve clicar em "Próximo"
  };

  // Handle bet number input
  const handleBetNumberChange = (value: string) => {
    setBetNumber(value);
    // Atualizar também no formulário
    form.setValue("betNumber", value);
    // Removida a parte que avançava automaticamente
  };

  // Get the placeholder text for number inputs based on bet type
  const getNumberPlaceholder = () => {
    switch (selectedCategory) {
      case "dozens":
        return "Digite 2 dígitos (Ex: 12)";
      case "hundreds":
        return "Digite 3 dígitos (Ex: 123)";
      case "thousands":
        return "Digite 4 dígitos (Ex: 1234)";
      default:
        return "";
    }
  };

  // Get the expected number length based on bet type
  const getExpectedNumberLength = () => {
    switch (selectedCategory) {
      case "dozens": return 2;
      case "hundreds": return 3;
      case "thousands": return 4;
      default: return 0;
    }
  };

  // Check if the current step is complete and we can proceed
  const canProceed = () => {
    if (step === 1) return !!selectedGameMode;
    if (step === 2) {
      if (selectedCategory === "groups") return !!selectedAnimal;
      return betNumber.length === getExpectedNumberLength();
    }
    if (step === 3) return !!formValues.premioType && !!formValues.drawId;
    if (step === 4) return !!formValues.amount && !exceedsMaxPayout;
    return false;
  };

  // Handle next step
  const handleNextStep = () => {
    if (canProceed()) {
      setStep(step + 1);
    }
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-center">Escolha a Modalidade</DialogTitle>
              <DialogDescription className="text-center">
                Selecione como você deseja jogar
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-3">
              {activeGameModes.map(mode => (
                <Button
                  key={mode.id}
                  variant={activeModality === mode.id.toString() ? "default" : "outline"}
                  className="flex flex-col items-center justify-center h-20 p-2"
                  onClick={() => handleModeSelect(mode.id.toString())}
                >
                  <span className="font-medium">{mode.name}</span>
                  <span className="text-xs mt-1 bg-primary/10 px-2 py-0.5 rounded-full">
                    {mode.odds}x
                  </span>
                </Button>
              ))}
            </div>
            
            <DialogFooter>
              <Button 
                type="button"
                disabled={!canProceed()}
                onClick={handleNextStep}
                className="w-full mt-4 rounded-full py-5 text-base font-medium shadow-md transition-all hover:shadow-lg"
              >
                Próximo <ArrowRight className="h-4 w-4 ml-2 animate-pulse" />
              </Button>
            </DialogFooter>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-center">
                {selectedCategory === "groups" 
                  ? "Escolha um Animal" 
                  : `Digite o Número (${selectedCategory === "dozens" ? "Dezena" : selectedCategory === "hundreds" ? "Centena" : "Milhar"})`}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCategory === "groups" ? (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pb-2">
                {sortedAnimals.map(animal => (
                  <Button
                    key={animal.id}
                    variant={selectedAnimal?.id === animal.id ? "default" : "outline"}
                    className="flex flex-col items-center justify-center h-24 p-2"
                    onClick={() => handleAnimalSelect(animal)}
                  >
                    <span className="text-2xl mb-1">{getAnimalEmoji(animal.name)}</span>
                    <span className="text-xs font-medium">{animal.name}</span>
                    <span className="text-xs">{animal.group}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border p-4 rounded-lg bg-slate-50">
                  <div className="text-center text-3xl font-mono tracking-wider mb-4 h-10 border bg-white rounded-md flex items-center justify-center">
                    {betNumber ? betNumber : (
                      <span className="text-gray-400">
                        {selectedCategory === "dozens" 
                          ? "00" 
                          : selectedCategory === "hundreds"
                          ? "000"
                          : "0000"}
                      </span>
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
                          const expectedLength = getExpectedNumberLength();
                          // Não permitir digitar mais do que o número esperado de dígitos
                          if (betNumber.length < expectedLength) {
                            handleBetNumberChange(betNumber + num.toString());
                          } else {
                            // Se tentar digitar mais do que o permitido, mostrar toast informativo
                            toast({
                              title: "Limite de dígitos atingido",
                              description: `Apostas de ${selectedCategory === "dozens" ? "dezena" : 
                                            selectedCategory === "hundreds" ? "centena" : "milhar"} 
                                            devem ter exatamente ${expectedLength} dígitos.`,
                              variant: "destructive",
                            });
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
                          handleBetNumberChange(betNumber.slice(0, -1));
                        }
                      }}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                      onClick={() => {
                        const expectedLength = getExpectedNumberLength();
                        // Não permitir digitar mais do que o número esperado de dígitos
                        if (betNumber.length < expectedLength) {
                          handleBetNumberChange(betNumber + "0");
                        } else {
                          // Se tentar digitar mais do que o permitido, mostrar toast informativo
                          toast({
                            title: "Limite de dígitos atingido",
                            description: `Apostas de ${selectedCategory === "dozens" ? "dezena" : 
                                          selectedCategory === "hundreds" ? "centena" : "milhar"} 
                                          devem ter exatamente ${expectedLength} dígitos.`,
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium"
                      onClick={() => {
                        handleBetNumberChange("");
                      }}
                    >
                      C
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  {selectedCategory === "dozens"
                    ? "Aposte nos últimos 2 dígitos do número sorteado."
                    : selectedCategory === "hundreds"
                    ? "Aposte nos últimos 3 dígitos do número sorteado."
                    : "Aposte no número completo de 4 dígitos."}
                </p>
              </div>
            )}
            
            <DialogFooter>
              <div className="flex w-full gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full py-5 text-base font-medium"
                >
                  Voltar
                </Button>
                <Button 
                  type="button"
                  disabled={!canProceed()}
                  onClick={handleNextStep}
                  className="flex-1 rounded-full py-5 text-base font-medium shadow-md transition-all hover:shadow-lg"
                >
                  Próximo <ArrowRight className="h-4 w-4 ml-2 animate-pulse" />
                </Button>
              </div>
            </DialogFooter>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-center">Detalhes da Aposta</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form className="space-y-4">
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
                          setSelectedDraw(Number(value));
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
                
                <FormField
                  control={form.control}
                  name="premioType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center">
                        Tipo de Prêmio
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 ml-1 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs text-xs">
                                Escolha um prêmio específico (1º ao 5º) ou todos os prêmios. 
                                Para todos os prêmios, o potencial de ganho é dividido por 5.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-3 gap-2"
                        >
                          <div>
                            <RadioGroupItem
                              value="1"
                              id="premio-1"
                              className="sr-only"
                            />
                            <Label
                              htmlFor="premio-1"
                              className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                                field.value === "1" ? 'border-primary bg-primary/10' : ''
                              }`}
                            >
                              <span>1º</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="2"
                              id="premio-2"
                              className="sr-only"
                            />
                            <Label
                              htmlFor="premio-2"
                              className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                                field.value === "2" ? 'border-primary bg-primary/10' : ''
                              }`}
                            >
                              <span>2º</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="3"
                              id="premio-3"
                              className="sr-only"
                            />
                            <Label
                              htmlFor="premio-3"
                              className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                                field.value === "3" ? 'border-primary bg-primary/10' : ''
                              }`}
                            >
                              <span>3º</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="4"
                              id="premio-4"
                              className="sr-only"
                            />
                            <Label
                              htmlFor="premio-4"
                              className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                                field.value === "4" ? 'border-primary bg-primary/10' : ''
                              }`}
                            >
                              <span>4º</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="5"
                              id="premio-5"
                              className="sr-only"
                            />
                            <Label
                              htmlFor="premio-5"
                              className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                                field.value === "5" ? 'border-primary bg-primary/10' : ''
                              }`}
                            >
                              <span>5º</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="1-5"
                              id="premio-all"
                              className="sr-only"
                            />
                            <Label
                              htmlFor="premio-all"
                              className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground ${
                                field.value === "1-5" ? 'border-primary bg-primary/10' : ''
                              }`}
                            >
                              <span>Todos</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            
            <DialogFooter>
              <div className="flex w-full gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-full py-5 text-base font-medium"
                >
                  Voltar
                </Button>
                <Button 
                  type="button"
                  disabled={!canProceed()}
                  onClick={handleNextStep}
                  className="flex-1 rounded-full py-5 text-base font-medium shadow-md transition-all hover:shadow-lg"
                >
                  Próximo <ArrowRight className="h-4 w-4 ml-2 animate-pulse" />
                </Button>
              </div>
            </DialogFooter>
          </div>
        );
      
      case 4:
        // Não vamos chamar form.setValue aqui para evitar o loop de renderização
        console.log("Etapa 4 - Valor atual:", form.getValues("amount"));
        
        return (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-center">Finalizar Aposta</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selecione o valor da aposta:</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-3">
                          {[0.5, 1, 2, 5, 10, 20, 50, 100, 200].map((value) => (
                            <Button
                              key={value}
                              type="button"
                              variant={field.value === value ? "default" : "outline"}
                              className={`p-3 h-auto text-sm font-medium ${
                                field.value === value ? "bg-green-600 text-white hover:bg-green-700" : "bg-white"
                              }`}
                              onClick={() => {
                                // Atualizar o valor no campo e no form
                                field.onChange(value);
                                // Garantir que o valor seja imediatamente aplicado no form
                                form.setValue("amount", value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                                console.log("Valor da aposta atualizado para:", value, "- Ganho potencial calculado:", Math.floor(value * calculatedOdds));
                              }}
                            >
                              R$ {value.toString().replace('.', ',')}
                            </Button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Possível Retorno:</p>
                  <p className={`text-xl font-bold flex items-center ${exceedsMaxPayout ? 'text-red-500' : 'text-green-600'}`}>
                    <DollarSign className="h-5 w-5 mr-1" />
                    {formatCurrency(potentialWinAmount, false)}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {formValues.premioType === "1-5" 
                        ? "Valor dividido entre os 5 prêmios" 
                        : `Valor apenas no ${formValues.premioType}º prêmio`}
                    </p>
                    <p className="text-xs font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
                      {calculatedOdds.toFixed(1).replace('.', ',')}x
                    </p>
                  </div>
                </div>
                
                {exceedsMaxPayout && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Valor máximo de prêmio excedido (R$ {systemSettings.maxPayout}). Reduza o valor da aposta.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Resumo da Aposta:</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Modalidade:</span>
                      <span className="font-medium">{selectedGameMode?.name}</span>
                    </li>
                    {selectedCategory === "groups" && selectedAnimal ? (
                      <li className="flex justify-between">
                        <span className="text-gray-600">Animal:</span>
                        <span className="font-medium">{selectedAnimal.name} (Grupo {selectedAnimal.group})</span>
                      </li>
                    ) : (
                      <li className="flex justify-between">
                        <span className="text-gray-600">Número:</span>
                        <span className="font-medium">{betNumber}</span>
                      </li>
                    )}
                    <li className="flex justify-between">
                      <span className="text-gray-600">Prêmio:</span>
                      <span className="font-medium">
                        {formValues.premioType === "1-5" ? "Todos (1º ao 5º)" : `${formValues.premioType}º Prêmio`}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Sorteio:</span>
                      <span className="font-medium">
                        {draws.find(d => d.id === formValues.drawId)?.name || ""}
                      </span>
                    </li>
                  </ul>
                </div>
                
                <DialogFooter>
                  <div className="flex w-full gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(3)}
                      className="flex-1 rounded-full py-5 text-base font-medium"
                    >
                      Voltar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={!canProceed() || betMutation.isPending}
                      className="flex-1 rounded-full py-5 text-base font-medium bg-green-600 hover:bg-green-700 shadow-md transition-all hover:shadow-lg"
                    >
                      {betMutation.isPending ? (
                        <><span className="animate-spin mr-2">↻</span> Registrando...</>
                      ) : (
                        <>
                          <Check className="h-5 w-5 mr-2" /> Apostar
                        </>
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          id="mobile-bet-trigger" 
          className="w-full rounded-full py-5 text-base font-semibold shadow-md transition-all hover:shadow-lg relative overflow-hidden group"
        >
          <span className="absolute inset-0 w-full h-full transition-all duration-300 scale-0 group-hover:scale-100 group-hover:bg-white/10 rounded-full z-0"></span>
          Fazer Aposta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 rounded-lg">
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}