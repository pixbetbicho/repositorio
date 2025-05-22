// Arquivo obsoleto, não utilizado no aplicativo
// Substituído por bet-wizard-dialog.tsx que utiliza o componente MobileBetWizardNew existente

interface UserBetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Esquema para validação usando Zod
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
  }).min(0.1, {
    message: "Valor mínimo de R$ 0,10",
  }),
  type: z.enum(["group", "duque_grupo", "terno_grupo", "quadra_duque", "quina_grupo", 
            "dozen", "duque_dezena", "terno_dezena", "hundred", "thousand", 
            "passe_ida", "passe_ida_volta"], {
    required_error: "Tipo de aposta é obrigatório",
  }),
  animalId: z.number().optional(),
  betNumber: z.string().optional(),
  betNumbers: z.array(z.string()).optional(),
  potentialWinAmount: z.number().optional()
});

// Determinar a categoria básica da modalidade (igual ao BettingPanel)
function getCategoryFromMode(modeName: string): string {
  const lowerName = modeName.toLowerCase();
  
  if (lowerName.includes("grupo") || lowerName.includes("passe")) return "groups";
  if (lowerName.includes("dezena")) return "dozens";  
  if (lowerName.includes("centena")) return "hundreds";
  if (lowerName.includes("milhar")) return "thousands";
  
  return "groups"; // Padrão
}

export function UserBetDialog({ open, onOpenChange }: UserBetDialogProps) {
  // Estados básicos
  const [activeModalityId, setActiveModalityId] = useState<string>("");
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [betNumber, setBetNumber] = useState<string>("");
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Buscar dados necessários
  const { data: animals, isLoading: isLoadingAnimals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: upcomingDraws, isLoading: isLoadingDraws } = useQuery<Draw[]>({
    queryKey: ["/api/draws/upcoming"],
  });

  const { data: gameModes, isLoading: isLoadingGameModes } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });

  const { data: systemSettings } = useQuery<{
    maxBetAmount: number;
    maxPayout: number;
    minBetAmount: number;
    defaultBetAmount: number;
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

  // Formatar sorteios para incluir detalhes dos animais
  const formattedDraws = upcomingDraws?.map(draw => {
    const resultAnimal = draw.resultAnimalId 
      ? animals?.find(a => a.id === draw.resultAnimalId) 
      : undefined;
    
    return {
      ...draw,
      animal: resultAnimal
    };
  }) || [];

  // Selecionar o primeiro sorteio por padrão
  useEffect(() => {
    if (formattedDraws.length > 0 && selectedDraw === null) {
      setSelectedDraw(formattedDraws[0].id);
      form.setValue("drawId", formattedDraws[0].id);
    }
  }, [formattedDraws, selectedDraw]);

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

  // Inicializar formulário com resolver do Zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: systemSettings?.defaultBetAmount || 2,
      premioType: "1",
      type: "group"
    }
  });

  // Observar valores do formulário para cálculos em tempo real
  const formValues = form.watch();

  // Selecionar modalidade Grupo por padrão
  useEffect(() => {
    if (orderedGameModes.length > 0 && !activeModalityId) {
      // Seleciona a modalidade de grupo por padrão
      const grupoMode = orderedGameModes.find(mode => 
        mode.name.toLowerCase().includes("grupo") && 
        !mode.name.toLowerCase().includes("duque") && 
        !mode.name.toLowerCase().includes("terno")
      );
      
      if (grupoMode) {
        setActiveModalityId(grupoMode.id.toString());
        form.setValue("gameModeId", grupoMode.id);
        form.setValue("type", "group");
      } else if (orderedGameModes.length > 0) {
        // Fallback para a primeira modalidade ativa
        setActiveModalityId(orderedGameModes[0].id.toString());
        form.setValue("gameModeId", orderedGameModes[0].id);
      }
    }
  }, [orderedGameModes, activeModalityId]);

  // Handlers
  const handleModalityChange = (modalityId: string) => {
    setActiveModalityId(modalityId);
    form.setValue("gameModeId", Number(modalityId));
    
    // Sempre que mudar a modalidade, limpar seleção de animal e números
    setSelectedAnimal(null);
    setBetNumber("");
  };

  const handleSelectDraw = (drawId: number) => {
    setSelectedDraw(drawId);
    form.setValue("drawId", drawId);
  };

  // Encontrar a modalidade ativa
  const activeMode = gameModes?.find(mode => mode.id.toString() === activeModalityId);

  // Determinar qual componente exibir baseado na categoria da modalidade
  const category = activeMode ? getCategoryFromMode(activeMode.name) : "groups";

  // Ajustar tipo de aposta com base na modalidade selecionada
  useEffect(() => {
    if (!activeMode) return;

    const modeName = activeMode.name.toLowerCase();
    let betType: BetType = "group";
    
    // Determinar tipo de aposta com base no nome da modalidade
    if (modeName.includes("grupo")) {
      if (modeName.includes("duque")) {
        betType = "duque_grupo";
      } else if (modeName.includes("terno")) {
        betType = "terno_grupo";
      } else if (modeName.includes("quadra")) {
        betType = "quadra_duque";
      } else if (modeName.includes("quina")) {
        betType = "quina_grupo";
      } else {
        betType = "group";
      }
    } else if (modeName.includes("dezena")) {
      if (modeName.includes("duque")) {
        betType = "duque_dezena";
      } else if (modeName.includes("terno")) {
        betType = "terno_dezena";
      } else {
        betType = "dozen";
      }
    } else if (modeName.includes("centena")) {
      betType = "hundred";
    } else if (modeName.includes("milhar")) {
      betType = "thousand";
    } else if (modeName.includes("passe")) {
      if (modeName.includes("ida") && modeName.includes("volta")) {
        betType = "passe_ida_volta";
      } else {
        betType = "passe_ida";
      }
    }
    
    // Atualizar o formulário
    form.setValue("type", betType);
    
  }, [activeModalityId, form, activeMode]);

  // Manipular seleção de animal
  const handleAnimalSelect = (animal: Animal) => {
    setSelectedAnimal(animal);
    form.setValue("animalId", animal.id);
  };

  // Manipular entrada de número para apostas numéricas
  const handleBetNumberChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "");
    let maxLength = 2; // padrão para dezena
    
    if (category === "hundreds") maxLength = 3;
    if (category === "thousands") maxLength = 4;
    
    setBetNumber(onlyNumbers.slice(0, maxLength));
    
    // Se tiver o tamanho correto, atualiza o formulário
    if (onlyNumbers.length <= maxLength) {
      form.setValue("betNumbers", [onlyNumbers]);
    }
  };

  // Calcular ganho potencial - Corrigido para garantir valor correto
  const calculatePotentialWin = (): number => {
    if (!activeMode || !formValues.amount) return 0;

    // Ajuste para apostas em todos os prêmios (1-5)
    const adjustedOdds = formValues.premioType === "1-5" ? 
      activeMode.odds / 5 : activeMode.odds;
    
    // Cálculo: valor da aposta * multiplicador (arredondado para número inteiro)
    const potentialWin = Math.floor(formValues.amount * adjustedOdds);
    
    console.log("POPUP-BET-DIALOG: Cálculo de ganho potencial", {
      amount: formValues.amount,
      gameMode: activeMode.name,
      odds: activeMode.odds,
      adjustedOdds,
      potentialWin,
      premioType: formValues.premioType
    });
    
    return potentialWin;
  };

  // Atualizar o campo potentialWinAmount sempre que os valores relevantes mudarem
  useEffect(() => {
    if (activeMode && formValues.amount) {
      const potentialWin = calculatePotentialWin();
      form.setValue("potentialWinAmount", potentialWin);
    }
  }, [formValues.amount, activeModalityId, formValues.premioType, activeMode]);

  // Verificar se excede o pagamento máximo
  const exceedsMaxPayout = systemSettings?.maxPayout 
    ? calculatePotentialWin() > systemSettings.maxPayout 
    : false;

  // Mutação para enviar a aposta
  const betMutation = useMutation({
    mutationFn: async (data: BetFormData) => {
      const response = await apiRequest("POST", "/api/bets", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao criar aposta");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Aposta realizada com sucesso!",
        description: "Sua aposta foi realizada e já está na lista de apostas.",
      });
      onOpenChange(false); // Fechar o modal
      setSelectedAnimal(null); // Limpar seleção
      setBetNumber(""); // Limpar número da aposta
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao realizar aposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler para envio do formulário
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Verificar saldo
    if (user.balance < data.amount) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para fazer essa aposta. Faça um depósito primeiro.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar se tem animal selecionado para apostas por grupo
    if (category === "groups" && !selectedAnimal) {
      toast({
        title: "Animal não selecionado",
        description: "Selecione um animal para realizar a aposta.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar se tem número para apostas numéricas
    if (["dozens", "hundreds", "thousands"].includes(category) && !betNumber) {
      toast({
        title: "Número não informado",
        description: "Digite o número para realizar a aposta.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar tamanho do número para apostas numéricas
    if (category === "dozens" && betNumber.length !== 2) {
      toast({
        title: "Número inválido",
        description: "A dezena deve ter 2 dígitos.",
        variant: "destructive",
      });
      return;
    }
    
    if (category === "hundreds" && betNumber.length !== 3) {
      toast({
        title: "Número inválido",
        description: "A centena deve ter 3 dígitos.",
        variant: "destructive",
      });
      return;
    }
    
    if (category === "thousands" && betNumber.length !== 4) {
      toast({
        title: "Número inválido",
        description: "A milhar deve ter 4 dígitos.",
        variant: "destructive",
      });
      return;
    }
    
    // Preparar dados da aposta
    const betType = data.type as BetType;
    
    // Calcular potencial de ganho
    const winAmount = calculatePotentialWin();
    
    // Criar objeto de dados
    const betData: BetFormData = {
      drawId: selectedDraw || data.drawId,
      gameModeId: Number(activeModalityId) || data.gameModeId,
      amount: data.amount,
      type: betType,
      premioType: data.premioType,
      potentialWinAmount: winAmount
    };
    
    // Adicionar ID do animal para apostas por grupo
    if (category === "groups" && selectedAnimal) {
      betData.animalId = selectedAnimal.id;
    }
    
    // Adicionar números para apostas numéricas
    if (["dozens", "hundreds", "thousands"].includes(category) && betNumber) {
      betData.betNumbers = [betNumber];
    }
    
    console.log("Enviando aposta:", betData);
    betMutation.mutate(betData);
  };

  // Verificar se formulário está válido para permitir envio
  const isValid = () => {
    if (category === "groups" && !selectedAnimal) return false;
    
    if (category === "dozens" && betNumber.length !== 2) return false;
    if (category === "hundreds" && betNumber.length !== 3) return false;
    if (category === "thousands" && betNumber.length !== 4) return false;
    
    return true;
  };

  // Estado de carregamento
  if (isLoadingAnimals || isLoadingDraws || isLoadingGameModes) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-48" />
            <Skeleton className="w-full h-12" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Verificar dados disponíveis
  if (!animals || animals.length === 0 || !upcomingDraws || upcomingDraws.length === 0 || !gameModes || gameModes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Não foi possível carregar os dados</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p className="text-gray-500">Não foi possível carregar os dados necessários para fazer uma aposta. Tente novamente mais tarde.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-lg p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle>Aposta Rápida</DialogTitle>
          <DialogDescription>
            Escolha a modalidade, sorteio e defina os detalhes da sua aposta.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Modalidades em botões */}
            <div className="flex overflow-x-auto pb-2 no-scrollbar">
              {orderedGameModes.map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  className={`flex-shrink-0 px-3 py-1 mr-2 text-sm rounded-full border 
                    ${activeModalityId === mode.id.toString() 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-white border-gray-300 text-gray-700'}`}
                  onClick={() => handleModalityChange(mode.id.toString())}
                >
                  {mode.name}
                </button>
              ))}
            </div>

            {/* Cards de seleção de sorteio e prêmio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Seleção de sorteio */}
              <Card className="p-3">
                <div className="text-sm font-medium mb-2">Selecione o sorteio:</div>
                <div className="flex flex-wrap gap-2">
                  {formattedDraws.map(draw => (
                    <button
                      key={draw.id}
                      type="button"
                      onClick={() => handleSelectDraw(draw.id)}
                      className={`px-3 py-1 text-xs rounded-full border 
                        ${selectedDraw === draw.id 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-white border-gray-300 text-gray-700'}`}
                    >
                      {draw.name} - {draw.time}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Seleção de prêmio */}
              <Card className="p-3">
                <div className="text-sm font-medium mb-2">Selecione o prêmio:</div>
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "1-5"].map((premio) => (
                    <button
                      key={premio}
                      type="button"
                      onClick={() => form.setValue("premioType", premio as any)}
                      className={`px-2 py-1 text-xs rounded-full border 
                        ${formValues.premioType === premio 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                    >
                      {premio === "1-5" ? "1º-5º" : `${premio}º`}
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Área principal de aposta */}
            <Card className="p-3">
              {/* Grupos */}
              {category === "groups" && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Escolha um animal:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {animals.sort((a, b) => a.group - b.group).map(animal => (
                      <button
                        type="button"
                        key={animal.id}
                        className={`flex items-center p-2 border rounded-md bg-white ${selectedAnimal?.id === animal.id ? 'bg-primary/10 border-primary' : 'hover:bg-slate-50'}`}
                        onClick={() => handleAnimalSelect(animal)}
                      >
                        <span className="text-xl mr-2">{getAnimalEmoji(animal.name)}</span>
                        <span className="text-sm font-medium">{animal.name} <span className="text-xs text-gray-500">({animal.group})</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dezenas */}
              {category === "dozens" && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Digite o número da dezena:</h3>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-mono mb-2 p-2 bg-slate-50 border rounded w-16 text-center">
                      {betNumber || "00"}
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                        <button 
                          key={num}
                          type="button"
                          className="p-2 border rounded-md hover:bg-gray-50"
                          onClick={() => {
                            if (betNumber.length < 2) {
                              handleBetNumberChange(betNumber + num);
                            }
                          }}
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="p-2 border rounded-md hover:bg-gray-50"
                        onClick={() => setBetNumber("")}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Centenas */}
              {category === "hundreds" && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Digite o número da centena:</h3>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-mono mb-2 p-2 bg-slate-50 border rounded w-20 text-center">
                      {betNumber || "000"}
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                        <button 
                          key={num}
                          type="button"
                          className="p-2 border rounded-md hover:bg-gray-50"
                          onClick={() => {
                            if (betNumber.length < 3) {
                              handleBetNumberChange(betNumber + num);
                            }
                          }}
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="p-2 border rounded-md hover:bg-gray-50"
                        onClick={() => setBetNumber("")}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Milhares */}
              {category === "thousands" && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Digite o número da milhar:</h3>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-mono mb-2 p-2 bg-slate-50 border rounded w-24 text-center">
                      {betNumber || "0000"}
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                        <button 
                          key={num}
                          type="button"
                          className="p-2 border rounded-md hover:bg-gray-50"
                          onClick={() => {
                            if (betNumber.length < 4) {
                              handleBetNumberChange(betNumber + num);
                            }
                          }}
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="p-2 border rounded-md hover:bg-gray-50"
                        onClick={() => setBetNumber("")}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Valores de aposta e ganho potencial */}
            <Card className="p-3">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-sm font-medium mb-1">Valor:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[2, 5, 10, 20].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => form.setValue("amount", amount)}
                        className={`py-1 px-2 text-sm border rounded-md ${formValues.amount === amount ? 'bg-primary/20 border-primary' : 'bg-white'}`}
                      >
                        R$ {amount}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Input
                      type="number"
                      min={systemSettings?.minBetAmount || 0.1}
                      max={systemSettings?.maxBetAmount || 1000}
                      step="0.1"
                      placeholder="Outro valor"
                      value={formValues.amount || ''}
                      onChange={(e) => form.setValue("amount", Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="border-l pl-3">
                  <div className="text-sm font-medium mb-1">Resumo:</div>
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span>Modalidade:</span>
                      <span className="font-medium">{activeMode?.name || "--"}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>Multiplicador:</span>
                      <span className="font-medium">
                        {activeMode ? `${formValues.premioType === "1-5" ? (activeMode.odds / 5).toFixed(1) : activeMode.odds}x` : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>Valor apostado:</span>
                      <span className="font-medium">{formatCurrency(formValues.amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t font-medium">
                      <span>Potencial ganho:</span>
                      <span className="text-primary">{formatCurrency(calculatePotentialWin())}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Aviso de limite */}
              {exceedsMaxPayout && (
                <Alert variant="destructive" className="mt-2 py-2 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription>
                    O ganho potencial excede o limite máximo de {formatCurrency(systemSettings?.maxPayout || 0)}.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Botão de apostar */}
              <Button 
                type="submit" 
                className="w-full mt-3"
                disabled={!isValid() || betMutation.isPending || exceedsMaxPayout}
              >
                {betMutation.isPending ? "Apostando..." : "Confirmar Aposta"}
              </Button>
            </Card>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}