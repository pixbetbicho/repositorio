import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Animal, Draw, GameMode } from "@/types";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AnimalCard } from "@/components/animal-card";
import { Trophy, CalendarDays, Award, Check, DollarSign, Info } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BetFormData } from "@/types";

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Redirecionar para a página inicial com seção de apostas
  useEffect(() => {
    navigate("/#betting-section");
  }, [navigate]);

  // Estados para controlar a seleção
  const [activeModalityId, setActiveModalityId] = useState<string>("");
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [activeTab, setActiveTab] = useState<string>("betting");

  // Queries para dados
  const { data: animals, isLoading: isLoadingAnimals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: upcomingDraws, isLoading: isLoadingDraws } = useQuery<Draw[]>({
    queryKey: ["/api/draws/upcoming"],
  });

  const { data: draws } = useQuery<Draw[]>({
    queryKey: ["/api/draws"],
  });

  const { data: gameModes, isLoading: isLoadingGameModes } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });

  const { data: systemSettings } = useQuery<any>({
    queryKey: ["/api/admin/settings"],
  });

  // Get next draw time for display
  const nextDraw = upcomingDraws && upcomingDraws.length > 0 ? upcomingDraws[0] : null;
  
  // Get last 5 completed draws
  const completedDraws = draws?.filter(draw => draw.status === "completed").slice(0, 5) || [];
  
  // Format draws to include animal details
  const formattedDraws = upcomingDraws?.map(draw => {
    const resultAnimal = draw.resultAnimalId ? animals?.find(a => a.id === draw.resultAnimalId) : undefined;
    return { ...draw, animal: resultAnimal };
  }) || [];

  // Ordenar os animais por grupo
  const sortedAnimals = animals ? [...animals].sort((a, b) => a.group - b.group) : [];
  
  // Encontrar a modalidade ativa
  const activeMode = gameModes?.find(mode => mode.id.toString() === activeModalityId);
  
  // Determinar a categoria da modalidade atual
  const getCurrentCategory = (): "group" | "dozen" | "hundred" | "thousand" => {
    if (!activeMode) return "group";
    
    const lowerName = activeMode.name.toLowerCase();
    if (lowerName.includes("grupo") || lowerName.includes("passe")) return "group";
    if (lowerName.includes("dezena")) return "dozen";
    if (lowerName.includes("centena")) return "hundred";
    if (lowerName.includes("milhar")) return "thousand";
    
    return "group";
  };
  
  // Ordenar modos de jogo - colocando Grupo no início
  const orderedGameModes = gameModes ? [...gameModes].sort((a, b) => {
    const aIsGroup = a.name.toLowerCase().includes("grupo") && 
                    !a.name.toLowerCase().includes("duque") && 
                    !a.name.toLowerCase().includes("terno");
    const bIsGroup = b.name.toLowerCase().includes("grupo") && 
                    !b.name.toLowerCase().includes("duque") && 
                    !b.name.toLowerCase().includes("terno");
    
    if (aIsGroup && !bIsGroup) return -1;
    if (!aIsGroup && bIsGroup) return 1;
    return 0;
  }).filter(mode => mode.active) : [];
  
  const category = getCurrentCategory();
  const showAnimals = category === "group";

  // Configuração do formulário de apostas
  const formSchema = z.object({
    drawId: z.number().positive("Selecione um sorteio válido"),
    animalId: showAnimals ? z.number().positive("Selecione um animal para apostar") : z.number().optional(),
    amount: z.number()
      .min(1, "Valor mínimo da aposta é 1")
      .max(systemSettings?.maxBetAmount || 1000, `Valor máximo da aposta é ${systemSettings?.maxBetAmount || 1000}`),
    gameModeId: z.number(),
    type: z.enum(["group", "dozen", "hundred", "thousand"]),
    premioType: z.enum(["1", "2", "3", "4", "5", "1-5"], {
      required_error: "Selecione um prêmio",
    }),
    numbers: z.string().optional()
  });

  // Inicializar formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drawId: selectedDraw || undefined,
      animalId: undefined,
      amount: 5,
      gameModeId: activeMode?.id || undefined,
      type: category,
      premioType: "1",
      numbers: undefined
    },
  });
  
  // Watch para valores do formulário
  const formValues = form.watch();
  
  // Calcular ganho potencial
  let multiplier = activeMode ? activeMode.odds / 100 : 0;
  if (formValues.premioType === "1-5") {
    multiplier = multiplier / 5;
  }
  
  const potentialWinAmount = Math.floor(formValues.amount * multiplier);
  
  // Verificar se o valor excede o máximo
  const exceedsMaxPayout = systemSettings?.maxPayout ? potentialWinAmount > systemSettings.maxPayout : false;
  
  // Mutation para registro de apostas
  const betMutation = useMutation({
    mutationFn: async (betData: BetFormData) => {
      const response = await apiRequest("POST", "/api/bets", betData);
      return response.json();
    },
    onSuccess: () => {
      // Limpar formulário e seleção de animal
      form.reset({
        drawId: selectedDraw || undefined,
        animalId: undefined,
        amount: 2.00,
        gameModeId: formValues.gameModeId,
        type: category,
        premioType: formValues.premioType,
        numbers: undefined
      });
      setSelectedAnimal(null);
      
      // Atualizar dados do usuário
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
  
  // Funções de manipulação
  const handleModalityChange = (modalityId: string) => {
    setActiveModalityId(modalityId);
    setSelectedAnimal(null);
    
    // Atualizar o type do formulário baseado na nova modalidade
    const mode = gameModes?.find(m => m.id.toString() === modalityId);
    if (mode) {
      const newCategory = getCurrentCategory();
      form.setValue("gameModeId", mode.id);
      form.setValue("type", newCategory);
      form.setValue("animalId", undefined);
      form.setValue("numbers", undefined);
    }
  };
  
  const handleAnimalSelect = (animal: Animal) => {
    setSelectedAnimal(animal);
    form.setValue("animalId", animal.id);
  };
  
  const handleSelectDraw = (drawId: number) => {
    setSelectedDraw(drawId);
    form.setValue("drawId", drawId);
  };
  
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
    
    const betData: BetFormData = {
      ...data,
      potentialWinAmount
    };
    
    betMutation.mutate(betData);
  };
  
  // Helper para obter nome de animais
  const getAnimalName = (animalId: number | null) => {
    if (!animalId || !animals) return "-";
    const animal = animals.find(a => a.id === animalId);
    return animal ? `Grupo ${String(animal.group).padStart(2, "0")} - ${animal.name}` : "-";
  };
  
  // Efeitos para seleção automática
  useEffect(() => {
    if (formattedDraws.length > 0 && selectedDraw === null) {
      setSelectedDraw(formattedDraws[0].id);
      form.setValue("drawId", formattedDraws[0].id);
    }
  }, [formattedDraws, selectedDraw, form]);
  
  useEffect(() => {
    if (gameModes && gameModes.length > 0 && !activeModalityId) {
      // Seleções a modalidade grupo por padrão
      const grupoMode = gameModes.find(mode => 
        mode.active && mode.name.toLowerCase().includes("grupo") && 
        !mode.name.toLowerCase().includes("duque") && 
        !mode.name.toLowerCase().includes("terno")
      );
      
      if (grupoMode) {
        setActiveModalityId(grupoMode.id.toString());
        form.setValue("gameModeId", grupoMode.id);
        form.setValue("type", "group");
      } else {
        // Fallback para a primeira modalidade ativa
        const activeGameModes = gameModes.filter(mode => mode.active);
        if (activeGameModes.length > 0) {
          setActiveModalityId(activeGameModes[0].id.toString());
          form.setValue("gameModeId", activeGameModes[0].id);
        }
      }
    }
  }, [gameModes, activeModalityId, form]);

  // Loading state
  if (isLoadingAnimals || isLoadingDraws || isLoadingGameModes) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-4">
            <div className="flex justify-center mb-4">
              <Skeleton className="h-8 w-80" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // No data state
  if (!animals || !upcomingDraws || upcomingDraws.length === 0 || !gameModes) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-6 text-center">
            <p className="text-gray-500">
              Não há jogos disponíveis no momento. Por favor, tente novamente mais tarde.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-gray-800">Jogo do Bicho</h2>
              <Button 
                variant="link" 
                className="ml-4 text-primary" 
                onClick={() => navigate("/")}
              >
                Voltar para a página inicial
              </Button>
            </div>
            {nextDraw && (
              <div className="text-sm bg-gray-100 rounded-full px-4 py-2">
                Próximo sorteio: <span className="font-semibold">{nextDraw.time}h</span> - {nextDraw.name}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 mb-6">
            <Tabs defaultValue="betting" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="betting">Faça sua Aposta</TabsTrigger>
                <TabsTrigger value="results">Últimos Resultados</TabsTrigger>
              </TabsList>
              
              <TabsContent value="betting" className="mt-4">
                <div className="space-y-6">
                  {/* Seleção de modalidade */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Modalidades de Apostas</CardTitle>
                      <CardDescription>
                        Escolha o tipo de aposta que deseja realizar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {orderedGameModes.map(mode => (
                          <div key={mode.id} className="flex items-center">
                            <Button
                              variant={activeModalityId === mode.id.toString() ? "default" : "outline"}
                              className="w-full h-14 justify-start"
                              onClick={() => handleModalityChange(mode.id.toString())}
                            >
                              <div className="text-center w-full">
                                <div className="text-sm font-medium">{mode.name}</div>
                                <div className="text-xs opacity-75">{mode.odds / 100}x</div>
                              </div>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Seleção de animais (apenas para modalidades tipo "grupo") */}
                  {showAnimals && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Escolha o Bicho</CardTitle>
                        <CardDescription>
                          Selecione o animal para sua aposta
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2">
                          {sortedAnimals.map(animal => (
                            <AnimalCard 
                              key={animal.id}
                              animal={animal}
                              selected={selectedAnimal?.id === animal.id}
                              onClick={handleAnimalSelect}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Formulário de apostas */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detalhes da Aposta</CardTitle>
                      <CardDescription>
                        Complete os detalhes da sua aposta
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                    handleSelectDraw(Number(value));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um sorteio" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {formattedDraws.map(draw => (
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
                          
                          {/* Números para modalidades centena, dezena, milhar */}
                          {!showAnimals && (
                            <FormField
                              control={form.control}
                              name="numbers"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {category === "dozen" ? "Dezena" : 
                                     category === "hundred" ? "Centena" : 
                                     category === "thousand" ? "Milhar" : "Número"}
                                  </FormLabel>
                                  <FormControl>
                                    <div className="space-y-2">
                                      <div className="border rounded-md p-2 text-center font-mono text-lg h-10 flex items-center justify-center bg-white">
                                        {field.value || (
                                          <span className="text-gray-400">
                                            {category === "dozen" ? "00" : 
                                             category === "hundred" ? "000" : 
                                             category === "thousand" ? "0000" : ""}
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-5 gap-1">
                                        {['0','1','2','3','4','5','6','7','8','9'].map(num => (
                                          <button
                                            key={num}
                                            type="button"
                                            className="p-2 bg-white border rounded-md hover:bg-gray-100 text-sm font-medium"
                                            onClick={() => {
                                              const currentValue = field.value || '';
                                              const maxLength = category === "dozen" ? 2 :
                                                               category === "hundred" ? 3 : 4;
                                              if (currentValue.length < maxLength) {
                                                field.onChange(currentValue + num);
                                              }
                                            }}
                                          >
                                            {num}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="grid grid-cols-2 gap-1">
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
                          )}
                          
                          {/* Valor da aposta e potencial retorno */}
                          <div className="flex gap-4 items-end">
                            <FormField
                              control={form.control}
                              name="amount"
                              render={({ field }) => (
                                <FormItem className="flex-1">
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
                                    
                                    {/* Valores pré-definidos para desktop */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {[0.5, 1, 2, 5, 10, 50].map((value) => (
                                        <Button
                                          key={value}
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="px-2 py-1 h-auto text-xs bg-white"
                                          onClick={() => field.onChange(value)}
                                        >
                                          R${value.toString().replace('.', ',')}
                                        </Button>
                                      ))}
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
                                {potentialWinAmount.toFixed(2)}
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
                          
                          <div className="pt-2">
                            <Button 
                              type="submit" 
                              className="w-full" 
                              disabled={
                                (showAnimals && !selectedAnimal) || 
                                !formValues.drawId || 
                                !formValues.gameModeId || 
                                betMutation.isPending || 
                                exceedsMaxPayout
                              }
                            >
                              {betMutation.isPending ? (
                                "Registrando Aposta..."
                              ) : (
                                <>
                                  <Check className="mr-2 h-4 w-4" /> 
                                  Confirmar Aposta
                                  {selectedAnimal && ` no ${selectedAnimal.name}`}
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {selectedAnimal && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-center gap-3">
                              <div className="text-2xl">{selectedAnimal.group}</div>
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
              </TabsContent>
              
              <TabsContent value="results" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Últimos Resultados</CardTitle>
                    <CardDescription>
                      Confira os resultados dos últimos sorteios realizados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {completedDraws.length > 0 ? (
                      <div className="grid gap-4">
                        {completedDraws.map(draw => (
                          <Card key={draw.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="p-2 bg-primary/10 rounded-full">
                                    <Trophy className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-semibold">{draw.name}</h4>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <CalendarDays className="h-3.5 w-3.5 mr-1" />
                                      {format(new Date(draw.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} - {draw.time}h
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">Resultado</div>
                                  <div className="font-bold text-primary">
                                    {getAnimalName(draw.resultAnimalId)}
                                  </div>
                                  {draw.resultAnimalId2 && (
                                    <div className="text-sm">2º: {getAnimalName(draw.resultAnimalId2)}</div>
                                  )}
                                  {draw.resultAnimalId3 && (
                                    <div className="text-sm">3º: {getAnimalName(draw.resultAnimalId3)}</div>
                                  )}
                                  {draw.resultAnimalId4 && (
                                    <div className="text-sm">4º: {getAnimalName(draw.resultAnimalId4)}</div>
                                  )}
                                  {draw.resultAnimalId5 && (
                                    <div className="text-sm">5º: {getAnimalName(draw.resultAnimalId5)}</div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum resultado disponível no momento
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
