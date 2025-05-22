import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 5,
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

  // Get the selected game mode
  const selectedGameMode = activeGameModes.find(mode => mode.id.toString() === activeModality);

  // Calculate potential win amount
  let multiplier = selectedGameMode ? selectedGameMode.odds / 100 : 0;
  if (formValues.premioType === "1-5") {
    multiplier = multiplier / 5;
  }
  
  const potentialWinAmount = Math.floor((formValues.amount || 0) * multiplier);
  
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
    form.reset({
      drawId: draws[0]?.id,
      gameModeId: Number(activeModality),
      amount: 2.00,
      premioType: "1",
      type: selectedCategory === "groups" ? "group" : 
            selectedCategory === "dozens" ? "dozen" :
            selectedCategory === "hundreds" ? "hundred" : "thousand",
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

    // Criar objeto de aposta garantindo que os tipos estejam corretos
    const betType = data.type as BetType;
    const betData: BetFormData = {
      drawId: data.drawId,
      gameModeId: data.gameModeId,
      amount: data.amount,
      type: betType,
      premioType: data.premioType,
      potentialWinAmount,
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
                    {mode.odds / 100}x
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
                      <FormLabel>Valor da Aposta (R$)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0.5}
                            step={0.5}
                            max={systemSettings?.maxBetAmount || 1000}
                            value={field.value === 0 ? "" : field.value}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              field.onChange(val);
                            }}
                            className="pl-8 font-medium"
                            placeholder="0.00"
                          />
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
                        </div>
                      </FormControl>
                      
                      {/* Valores pré-definidos */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[0.5, 1, 2, 5, 10, 50].map((value) => (
                          <Button
                            key={value}
                            type="button"
                            variant="outline"
                            className="px-2 py-1 h-auto text-xs bg-white"
                            onClick={() => field.onChange(value)}
                          >
                            R${value.toString().replace('.', ',')}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Possível Retorno:</p>
                  <p className={`text-xl font-bold flex items-center ${exceedsMaxPayout ? 'text-red-500' : 'text-green-600'}`}>
                    <DollarSign className="h-5 w-5 mr-1" />
                    {potentialWinAmount.toFixed(2)}
                  </p>
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