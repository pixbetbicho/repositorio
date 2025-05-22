// mobile-bet-wizard-new.tsx - Componente de apostas rápidas RECRIADO DO ZERO
import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useCustomToast } from "@/components/custom-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check, Info, DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InsufficientBalanceDialog } from "./insufficient-balance-dialog";
import { SimpleInsufficientDialog } from "./simple-insufficient-dialog";
import { DepositDialog } from "./deposit-dialog";
import { requestOpenDepositDialog } from "./direct-deposit-dialog";

// Esquema simplificado para validar os dados da aposta
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
});

interface MobileBetWizardProps {
  draws: DrawWithDetails[];
  animals: Animal[];
  gameModes: GameMode[];
  systemSettings: any;
  inDialog?: boolean; // Indica se está sendo usado dentro de um diálogo
  onComplete?: () => void; // Callback quando a aposta for concluída
}

export function MobileBetWizardNew({
  draws,
  animals,
  gameModes,
  systemSettings,
  inDialog = false,
  onComplete
}: MobileBetWizardProps) {
  // Estados básicos do componente
  const [step, setStep] = useState(1); // Passo atual do wizard
  const [open, setOpen] = useState(false); // Controle do modal
  const [activeModality, setActiveModality] = useState<string>(""); // Modalidade selecionada
  const [selectedCategory, setSelectedCategory] = useState<string>("groups"); // Categoria selecionada (grupos, dezenas, etc)
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null); // Animal selecionado
  const [betNumber, setBetNumber] = useState<string>(""); // Número digitado para apostas numéricas
  
  // Estados separados para diálogo de saldo insuficiente (simplificando a abordagem)
  const [showInsufficientDialog, setShowInsufficientDialog] = useState(false);
  const [showSimpleDialog, setShowSimpleDialog] = useState(false);
  const [requiredAmount, setRequiredAmount] = useState(0);
  const [savedBetData, setSavedBetData] = useState<BetFormData | null>(null);
  const [bonusBalance, setBonusBalance] = useState(0);
  
  // Estado global para diálogo de depósito (não depende de nenhum outro diálogo)
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  
  // Função que realmente limpa/reseta todos os diálogos e estados
  const resetAllDialogs = useCallback(() => {
    console.log("🧹 Limpando todos os diálogos e estados");
    setShowSimpleDialog(false);
    setShowInsufficientDialog(false);
    setShowDepositDialog(false);
    setSavedBetData(null);
    setRequiredAmount(0);
    setBetNumber("");
    if (form && typeof form.reset === 'function') {
      try {
        form.reset();
      } catch (e) {
        console.error("Erro ao resetar formulário:", e);
      }
    }
  }, []);

  // Adicionar event listener global para fechar todos os diálogos
  useEffect(() => {
    const handleCloseAllDialogs = () => {
      resetAllDialogs();
    };
    
    // Registrar listener
    window.addEventListener('close-all-dialogs', handleCloseAllDialogs);
    
    // Limpar listener
    return () => {
      window.removeEventListener('close-all-dialogs', handleCloseAllDialogs);
    };
  }, [resetAllDialogs]);
  
  // Função para abrir o diálogo de depósito global
  const openDepositDialog = useCallback(() => {
    console.log("🏦 Encaminhando para função global de depósito");

    // Limpar este componente imediatamente
    resetAllDialogs();
    
    // Usar a função global que cuida de todo o processo
    try {
      // Importado de direct-deposit-dialog.tsx
      requestOpenDepositDialog();
    } catch (e) {
      console.error("❌ Erro ao abrir diálogo de depósito:", e);
    }
  }, [resetAllDialogs]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const customToast = useCustomToast();

  // Filtrar apenas modos de jogo ativos
  const activeGameModes = gameModes?.filter(mode => mode.active) || [];

  // Ordenar animais por grupo
  const sortedAnimals = [...animals].sort((a, b) => a.group - b.group);

  // Inicializar formulário com o resolver do Zod
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 2.00, // Valor padrão inicial
      premioType: "1", // Prêmio 1 por padrão
      type: "group" // Tipo grupo por padrão
    }
  });

  // Observar valores do formulário para cálculos em tempo real
  const formValues = form.watch();

  // Configurar valores padrão quando o componente é carregado - CORRIGIDO para evitar loops infinitos
  useEffect(() => {
    // Somente se os formularios ainda não tiverem sido setados
    if (draws.length > 0 && !form.getValues("drawId")) {
      console.log("Definindo sorteio padrão:", draws[0].id);
      form.setValue("drawId", draws[0].id);
    }

    if (activeGameModes.length > 0 && !activeModality) {
      // Buscar a modalidade de grupo por padrão
      const grupoMode = activeGameModes.find(mode => {
        const name = mode.name.toLowerCase();
        return name.includes("grupo") && !name.includes("duque") && !name.includes("terno");
      });
      
      if (grupoMode) {
        console.log("Definindo modo de jogo padrão (Grupo):", grupoMode.id);
        setActiveModality(grupoMode.id.toString());
        form.setValue("gameModeId", grupoMode.id);
      } else if (activeGameModes.length > 0) {
        // Fallback para o primeiro modo disponível
        console.log("Definindo modo de jogo padrão (Fallback):", activeGameModes[0].id);
        setActiveModality(activeGameModes[0].id.toString());
        form.setValue("gameModeId", activeGameModes[0].id);
      }
    }
  }, [draws, activeGameModes, form, activeModality]);

  // Função SIMPLIFICADA para encontrar o modo de jogo corrente
  function getCurrentGameMode(): GameMode | undefined {
    if (!activeModality) return undefined;
    return activeGameModes.find(mode => mode.id.toString() === activeModality);
  }

  // Função para cálculo de ganho potencial usando a fórmula unificada
  function calculatePotentialWin(): number {
    const gameMode = getCurrentGameMode();
    if (!gameMode || typeof gameMode.odds !== 'number' || !formValues.amount) {
      return 0;
    }

    // O valor de odds vem diretamente do banco, já na unidade correta para multiplicar
    // Exemplos de odds armazenados no banco:
    // - Grupo: odds = 21 (multiplicador 21x)
    // - Centena: odds = 800 (multiplicador 800x) 
    // - Dezena: odds = 84 (multiplicador 84x)
    
    // Ajuste para apostas em todos os prêmios (1-5)
    const adjustedMultiplier = formValues.premioType === "1-5" ? gameMode.odds / 5 : gameMode.odds;
    
    // Cálculo padrão: valor da aposta * multiplicador ajustado
    // Esta fórmula deve ser IDÊNTICA em todos os componentes de apostas
    const winAmount = Math.floor(formValues.amount * adjustedMultiplier);
    
    console.log("CÁLCULO POTENCIAL DE GANHO (MOBILE-WIZARD):", {
      gameMode: gameMode.name,
      odds: gameMode.odds,
      adjustedMultiplier,
      amount: formValues.amount,
      potentialWin: winAmount
    });
    
    return winAmount;
  }

  // Calcular valor potencial da aposta apenas quando necessário
  // Não guardar em variável para evitar loops infinitos
  
  // Verificar se excede o pagamento máximo
  const exceedsMaxPayout = systemSettings?.maxPayout 
    ? calculatePotentialWin() > systemSettings.maxPayout 
    : false;

  // Ajustar tipo de aposta com base na modalidade selecionada - CORRIGIDO para evitar loop infinito
  useEffect(() => {
    const gameMode = getCurrentGameMode();
    if (gameMode) {
      const modeName = gameMode.name.toLowerCase();
      
      if (modeName.includes("grupo") || modeName.includes("passe")) {
        if (selectedCategory !== "groups") {
          setSelectedCategory("groups");
          form.setValue("type", "group");
        }
      } else if (modeName.includes("dezena")) {
        if (selectedCategory !== "dozens") {
          setSelectedCategory("dozens");
          form.setValue("type", "dozen");
          // Resetar o animal quando mudar para apostas numéricas
          form.setValue("animalId", undefined);
          setSelectedAnimal(null);
        }
      } else if (modeName.includes("centena")) {
        if (selectedCategory !== "hundreds") {
          setSelectedCategory("hundreds");
          form.setValue("type", "hundred");
          form.setValue("animalId", undefined);
          setSelectedAnimal(null);
        }
      } else if (modeName.includes("milhar")) {
        if (selectedCategory !== "thousands") {
          setSelectedCategory("thousands");
          form.setValue("type", "thousand");
          form.setValue("animalId", undefined);
          setSelectedAnimal(null);
        }
      }
    }
  }, [activeModality, form, selectedCategory]);

  // Mutação para enviar a aposta
  const betMutation = useMutation({
    mutationFn: async (betData: BetFormData) => {
      const response = await apiRequest("POST", "/api/bets", betData);
      return response.json();
    },
    onSuccess: () => {
      // Resetar formulário e fechar o modal
      resetForm();
      setOpen(false);
      
      // Atualizar os dados do usuário
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      
      // Usar ambos os sistemas de toast para garantir visibilidade
      toast({
        title: "Aposta Registrada!",
        description: "Sua aposta foi registrada com sucesso. Boa sorte!",
        variant: "default",
      });
      
      // Sistema de toast customizado para garantir a notificação
      customToast.addToast({
        title: "Aposta Registrada!",
        message: "Sua aposta foi registrada com sucesso. Boa sorte!",
        type: "success",
        duration: 3000
      });
      
      // Se estiver em um diálogo e tiver callback de conclusão, executar
      if (inDialog && onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      // Verificar se o erro é de saldo insuficiente
      if (error.message && error.message.includes("Saldo insuficiente")) {
        console.log("Erro de saldo insuficiente detectado na API", error.message);
        const currentAmount = formValues.amount;
        
        // Preparar dados da aposta para o diálogo de saldo insuficiente
        const betType = formValues.type as BetType;
        const gameMode = getCurrentGameMode();
        const adjustedOdds = gameMode && formValues.premioType === "1-5" ? 
          gameMode.odds / 5 : gameMode?.odds || 0;
          
        const finalWinAmount = Math.floor(currentAmount * adjustedOdds);
        
        // Criar dados da aposta para salvar
        const betData: BetFormData = {
          drawId: formValues.drawId,
          gameModeId: formValues.gameModeId,
          amount: currentAmount,
          type: betType,
          premioType: formValues.premioType,
          potentialWinAmount: finalWinAmount
        };
        
        // Adicionar ID do animal para apostas por grupo
        if (selectedCategory === "groups" && formValues.animalId) {
          betData.animalId = formValues.animalId;
        }
        
        // Adicionar números para apostas numéricas
        if (["dozens", "hundreds", "thousands"].includes(selectedCategory) && betNumber) {
          betData.betNumbers = [betNumber];
        }
        
        console.log("🚨 ABRINDO DIÁLOGO DE SALDO INSUFICIENTE:", {
          amount: currentAmount,
          betData
        });
        
        // SOLUÇÃO RADICAL: Forçar a exibição do diálogo com alertas
        console.log("🚫 SALDO INSUFICIENTE DETECTADO! FORÇANDO DIÁLOGO...");
        
        // Forçar abrir o diálogo instantaneamente (nova abordagem com estados separados)
        setRequiredAmount(currentAmount);
        setSavedBetData(betData);
        setShowInsufficientDialog(true);
        
        // Como fallback, também mostrar um toast caso o diálogo falhe
        toast({
          title: "Saldo Insuficiente!",
          description: `Você precisa de R$ ${currentAmount.toFixed(2)} para esta aposta. Selecione uma opção abaixo.`,
          variant: "destructive",
        });
        
        // Usar o sistema de toast customizado como backup
        customToast.addToast({
          title: "Saldo Insuficiente!",
          message: "Use saldo de bônus ou faça um depósito para continuar.",
          type: "error",
          duration: 8000
        });
        
      } else {
        // Usar ambos os sistemas para erro
        toast({
          title: "Erro ao Registrar Aposta",
          description: error.message,
          variant: "destructive",
        });
        
        // Toast personalizado para erros
        customToast.addToast({
          title: "Erro ao Registrar Aposta",
          message: error.message,
          type: "error",
          duration: 5000
        });
      }
    },
  });

  // Resetar o formulário
  const resetForm = () => {
    const defaultAmount = systemSettings?.defaultBetAmount || 2;
    const defaultDrawId = draws[0]?.id || 0;
    const defaultGameModeId = Number(activeModality) || 0;
    
    form.reset({
      drawId: defaultDrawId,
      gameModeId: defaultGameModeId, 
      amount: defaultAmount,
      premioType: "1",
      type: "group"
    });
    
    setSelectedAnimal(null);
    setBetNumber("");
    setStep(1);
  };

  // Verificar se há animal ou modalidade pré-selecionada no sessionStorage
  useEffect(() => {
    const preSelectedAnimalId = sessionStorage.getItem('preSelectedAnimal');
    const preSelectedModalityId = sessionStorage.getItem('preSelectedModality');
    const openNumberBet = sessionStorage.getItem('openNumberBet');
    const preSelectedDigit = sessionStorage.getItem('preSelectedDigit');
    
    // Processar a solicitação de aposta por números
    if (openNumberBet === 'true' && preSelectedModalityId && activeGameModes.length > 0) {
      if (activeGameModes.some(m => m.id.toString() === preSelectedModalityId)) {
        setActiveModality(preSelectedModalityId);
        form.setValue("gameModeId", Number(preSelectedModalityId));
        
        const selectedMode = activeGameModes.find(m => m.id.toString() === preSelectedModalityId);
        if (selectedMode) {
          const modeName = selectedMode.name.toLowerCase();
          
          if (modeName.includes("dezena")) {
            setSelectedCategory("dozens");
            form.setValue("type", "dozen");
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
        
        setStep(2);
      }
      
      // Limpar session storage após processar
      sessionStorage.removeItem('openNumberBet');
      sessionStorage.removeItem('preSelectedModality');
      sessionStorage.removeItem('preSelectedDigit');
      return;
    }
    
    // Processar animal pré-selecionado
    if (preSelectedAnimalId && animals.length > 0) {
      const animal = animals.find(a => a.id.toString() === preSelectedAnimalId);
      if (animal) {
        setSelectedAnimal(animal);
        form.setValue("animalId", animal.id);
        form.setValue("type", "group");
        setSelectedCategory("groups");
        
        if (preSelectedModalityId && activeGameModes.some(m => m.id.toString() === preSelectedModalityId)) {
          setActiveModality(preSelectedModalityId);
          form.setValue("gameModeId", Number(preSelectedModalityId));
        } else {
          // Fallback para grupo
          const grupoMode = activeGameModes.find(mode => {
            const name = mode.name.toLowerCase();
            return name.includes("grupo") && !name.includes("duque") && !name.includes("terno");
          });
          
          if (grupoMode) {
            setActiveModality(grupoMode.id.toString());
            form.setValue("gameModeId", grupoMode.id);
          }
        }
        
        setStep(3); // Ir direto para o passo 3 com animal selecionado
      }
      
      // Limpar session storage após processar
      sessionStorage.removeItem('preSelectedAnimal');
      sessionStorage.removeItem('preSelectedModality');
    }
  }, [animals, activeGameModes, form]);

  // Processar envio do formulário
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Validar tamanho dos números para apostas numéricas
    if (["dozens", "hundreds", "thousands"].includes(selectedCategory) && betNumber) {
      const expectedLength = getExpectedNumberLength();
      if (betNumber.length !== expectedLength) {
        // Notificar o usuário com ambos sistemas
        toast({
          title: "Número incompleto",
          description: `Apostas de ${selectedCategory === "dozens" ? "dezena" : 
                      selectedCategory === "hundreds" ? "centena" : "milhar"} 
                      exigem exatamente ${expectedLength} dígitos.`,
          variant: "destructive",
        });
        
        // Toast personalizado
        customToast.addToast({
          title: "Número incompleto",
          message: `Apostas de ${selectedCategory === "dozens" ? "dezena" : 
                 selectedCategory === "hundreds" ? "centena" : "milhar"} 
                 exigem exatamente ${expectedLength} dígitos.`,
          type: "error",
          duration: 4000
        });
        return;
      }
    }
    
    // Verificar se usuário está logado
    if (!user) {
      toast({
        title: "Você precisa estar logado",
        description: "Por favor, faça login para realizar uma aposta.",
        variant: "destructive",
      });
      
      // Toast personalizado de login
      customToast.addToast({
        title: "Login necessário",
        message: "Por favor, faça login para realizar uma aposta.",
        type: "warning",
        duration: 4000
      });
      return;
    }
    
    // Verificar saldo do usuário
    if (user.balance < data.amount) {
      // ABORDAGEM COMPLETAMENTE NOVA - DIÁLOGO INLINE
      console.log("🚨 SALDO INSUFICIENTE DETECTADO - NOVA ABORDAGEM INLINE", {
        userBalance: user.balance,
        betAmount: data.amount,
        difference: data.amount - user.balance,
      });
      
      // Preparar dados da aposta para salvar
      const betType = data.type as BetType;
      
      // Calcular valor potencial
      const gameMode = getCurrentGameMode();
      const adjustedOdds = gameMode && data.premioType === "1-5" ? 
        gameMode.odds / 5 : gameMode?.odds || 0;
      
      const finalWinAmount = Math.floor(data.amount * adjustedOdds);
      
      // Criar objeto de dados da aposta para salvar
      const betData: BetFormData = {
        drawId: data.drawId,
        gameModeId: data.gameModeId,
        amount: data.amount,
        type: betType,
        premioType: data.premioType,
        potentialWinAmount: finalWinAmount
      };
      
      // Adicionar ID do animal para apostas por grupo
      if (selectedCategory === "groups" && data.animalId) {
        betData.animalId = data.animalId;
      }
      
      // Adicionar números para apostas numéricas
      if (["dozens", "hundreds", "thousands"].includes(selectedCategory) && betNumber) {
        betData.betNumbers = [betNumber];
        
        // Ajustar tipo e ID do modo de jogo baseado na categoria
        if (selectedCategory === "dozens") {
          betData.type = "dozen";
          const dezenaMode = activeGameModes.find(m => m.name.toLowerCase().includes("dezena"));
          if (dezenaMode) betData.gameModeId = dezenaMode.id;
        } 
        else if (selectedCategory === "hundreds") {
          betData.type = "hundred";
          const centenaMode = activeGameModes.find(m => m.name.toLowerCase().includes("centena"));
          if (centenaMode) betData.gameModeId = centenaMode.id;
        } 
        else if (selectedCategory === "thousands") {
          betData.type = "thousand";
          const milharMode = activeGameModes.find(m => m.name.toLowerCase().includes("milhar"));
          if (milharMode) betData.gameModeId = milharMode.id;
        }
      }
      
      // SIMPLIFICANDO: Salvar dados em variável do escopo mais alto
      setRequiredAmount(data.amount);
      setSavedBetData(betData);
      
      // NOVA ABORDAGEM: Usar o dialog simples em vez do complexo
      setRequiredAmount(data.amount);
      setSavedBetData(betData);
      setShowSimpleDialog(true);
      
      // Consultar saldo de bônus do usuário
      apiRequest("GET", "/api/user/bonus-balance")
        .then(response => response.json())
        .then(data => {
          console.log("SALDO DE BÔNUS CARREGADO:", data);
          setBonusBalance(data.bonusBalance || 0);
        })
        .catch(err => {
          console.error("Erro ao carregar saldo de bônus:", err);
          setBonusBalance(0);
        });
      
      // Mostrar também um toast como backup
      toast({
        title: "Saldo insuficiente",
        description: `Você precisa de ${formatCurrency(data.amount)} para fazer esta aposta. Clique em "Depositar" para adicionar fundos.`,
        variant: "destructive",
      });
      
      // Registrar feedback visual para depuração
      console.log("⚠️ ALERTA MOSTRADO! Diálogo deveria aparecer agora:", { 
        showInsufficientDialog: true,
        requiredAmount: data.amount,
        savedBetData: betData
      });
      
      return;
    }
    
    // Verificar limite de pagamento
    if (exceedsMaxPayout) {
      toast({
        title: "Valor máximo excedido",
        description: `O ganho potencial excede o limite máximo de ${formatCurrency(systemSettings.maxPayout)}. Reduza o valor da aposta.`,
        variant: "destructive",
      });
      
      // Toast personalizado para limite excedido
      customToast.addToast({
        title: "Valor máximo excedido",
        message: `O ganho potencial excede o limite máximo de ${formatCurrency(systemSettings.maxPayout)}. Reduza o valor da aposta.`,
        type: "error",
        duration: 5000
      });
      return;
    }
    
    // Preparar dados da aposta
    const betType = data.type as BetType;
    
    // Calcular valor potencial EXATAMENTE como o servidor
    const gameMode = getCurrentGameMode();
    const adjustedOdds = gameMode && data.premioType === "1-5" ? 
      gameMode.odds / 5 : gameMode?.odds || 0;
    
    // IMPORTANTE: Usar a mesma fórmula padrão em todos os componentes
    // Cálculo padrão: valor da aposta * multiplicador ajustado
    const finalWinAmount = Math.floor(data.amount * adjustedOdds);
    
    // Criar objeto de dados da aposta
    const betData: BetFormData = {
      drawId: data.drawId,
      gameModeId: data.gameModeId,
      amount: data.amount,
      type: betType,
      premioType: data.premioType,
      potentialWinAmount: finalWinAmount
    };
    
    // Adicionar ID do animal para apostas por grupo
    if (selectedCategory === "groups" && data.animalId) {
      betData.animalId = data.animalId;
    }
    
    // Adicionar números para apostas numéricas
    if (["dozens", "hundreds", "thousands"].includes(selectedCategory) && betNumber) {
      betData.betNumbers = [betNumber];
      
      // Ajustar tipo e ID do modo de jogo baseado na categoria
      if (selectedCategory === "dozens") {
        betData.type = "dozen";
        // Identificar o ID correto do modo "Dezena"
        const dezenaMode = activeGameModes.find(m => m.name.toLowerCase().includes("dezena"));
        if (dezenaMode) betData.gameModeId = dezenaMode.id;
      } 
      else if (selectedCategory === "hundreds") {
        betData.type = "hundred";
        const centenaMode = activeGameModes.find(m => m.name.toLowerCase().includes("centena"));
        if (centenaMode) betData.gameModeId = centenaMode.id;
      } 
      else if (selectedCategory === "thousands") {
        betData.type = "thousand";
        const milharMode = activeGameModes.find(m => m.name.toLowerCase().includes("milhar"));
        if (milharMode) betData.gameModeId = milharMode.id;
      }
    }
    
    // Log detalhado para depuração
    console.log("APOSTA FINAL (COMPATÍVEL COM SERVIDOR):", {
      ...betData,
      gameMode: gameMode?.name,
      originalOdds: gameMode?.odds,
      adjustedOdds,
      selectedCategory
    });
    
    // Enviar aposta
    betMutation.mutate(betData);
  };

  // Manipular seleção de animal
  const handleAnimalSelect = (animal: Animal) => {
    setSelectedAnimal(animal);
    form.setValue("animalId", animal.id);
  };

  // Manipular seleção de modalidade
  const handleModeSelect = (modeId: string) => {
    setActiveModality(modeId);
    form.setValue("gameModeId", Number(modeId));
  };

  // Manipular entrada de número
  const handleBetNumberChange = (value: string) => {
    setBetNumber(value);
    form.setValue("betNumber", value);
  };

  // Obter placeholder para entrada de números
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

  // Obter tamanho esperado do número com base no tipo de aposta
  const getExpectedNumberLength = () => {
    switch (selectedCategory) {
      case "dozens": return 2;
      case "hundreds": return 3;
      case "thousands": return 4;
      default: return 0;
    }
  };

  // Verificar se o passo atual está completo para prosseguir
  const canProceed = () => {
    if (step === 1) return !!getCurrentGameMode();
    if (step === 2) {
      if (selectedCategory === "groups") return !!selectedAnimal;
      return betNumber.length === getExpectedNumberLength();
    }
    if (step === 3) return !!formValues.premioType && !!formValues.drawId;
    if (step === 4) return !!formValues.amount && !exceedsMaxPayout;
    return false;
  };

  // Avançar para o próximo passo
  const handleNextStep = () => {
    if (canProceed()) {
      setStep(step + 1);
    }
  };

  // Renderizar o conteúdo do passo atual
  const renderStepContent = () => {
    switch (step) {
      case 1: // Seleção de modalidade
        return (
          <div className="space-y-5 px-4 py-3">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-center text-xl">Escolha a Modalidade</DialogTitle>
              <DialogDescription className="text-center">
                Selecione como você deseja jogar
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
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
            
            <DialogFooter className="pb-2">
              <Button 
                type="button"
                disabled={!canProceed()}
                onClick={handleNextStep}
                className="w-full mt-4 mb-2 rounded-full py-5 text-base font-medium shadow-md transition-all hover:shadow-lg"
              >
                Próximo <ArrowRight className="h-4 w-4 ml-2 animate-pulse" />
              </Button>
            </DialogFooter>
          </div>
        );
      
      case 2: // Seleção de animal ou entrada de número
        return (
          <div className="space-y-4 px-4 py-3">
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
                          if (betNumber.length < expectedLength) {
                            handleBetNumberChange(betNumber + num.toString());
                          } else {
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
                        if (betNumber.length < expectedLength) {
                          handleBetNumberChange(betNumber + "0");
                        } else {
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
                      className="p-3 bg-white border rounded-md hover:bg-gray-100 text-lg font-medium col-span-1"
                      onClick={() => {
                        setBetNumber("");
                        form.setValue("betNumber", "");
                      }}
                    >
                      C
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex flex-col gap-2 pb-2">
              <Button 
                type="button"
                disabled={!canProceed()}
                onClick={handleNextStep}
                className="w-full rounded-full py-5 text-base font-medium shadow-md transition-all hover:shadow-lg mb-1"
              >
                Próximo <ArrowRight className="h-4 w-4 ml-2 animate-pulse" />
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full rounded-full py-2 text-sm mb-1"
              >
                Voltar
              </Button>
            </DialogFooter>
          </div>
        );
      
      case 3: // Seleção de sorteio e prêmio
        return (
          <div className="space-y-4 px-4 py-3">
            <DialogHeader>
              <DialogTitle className="text-center">Detalhes da Aposta</DialogTitle>
              <DialogDescription className="text-center">
                Selecione o sorteio e o prêmio
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="drawId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sorteio:</FormLabel>
                      <Select 
                        value={field.value?.toString() || ""} 
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o sorteio" />
                        </SelectTrigger>
                        <SelectContent>
                          {draws.map((draw) => (
                            <SelectItem key={draw.id} value={draw.id.toString()}>
                              {draw.name} - {draw.time}
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
                      <FormLabel>Selecione o Prêmio:</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-3 gap-3"
                        >
                          <Label
                            htmlFor="premio-1"
                            className={`flex flex-col items-center justify-center p-3 rounded-md border ${field.value === "1" ? "bg-primary text-white border-primary" : "bg-white"}`}
                          >
                            <RadioGroupItem value="1" id="premio-1" className="sr-only" />
                            <span className="font-medium">1º Prêmio</span>
                          </Label>
                          <Label
                            htmlFor="premio-2"
                            className={`flex flex-col items-center justify-center p-3 rounded-md border ${field.value === "2" ? "bg-primary text-white border-primary" : "bg-white"}`}
                          >
                            <RadioGroupItem value="2" id="premio-2" className="sr-only" />
                            <span className="font-medium">2º Prêmio</span>
                          </Label>
                          <Label
                            htmlFor="premio-3"
                            className={`flex flex-col items-center justify-center p-3 rounded-md border ${field.value === "3" ? "bg-primary text-white border-primary" : "bg-white"}`}
                          >
                            <RadioGroupItem value="3" id="premio-3" className="sr-only" />
                            <span className="font-medium">3º Prêmio</span>
                          </Label>
                          <Label
                            htmlFor="premio-4"
                            className={`flex flex-col items-center justify-center p-3 rounded-md border ${field.value === "4" ? "bg-primary text-white border-primary" : "bg-white"}`}
                          >
                            <RadioGroupItem value="4" id="premio-4" className="sr-only" />
                            <span className="font-medium">4º Prêmio</span>
                          </Label>
                          <Label
                            htmlFor="premio-5"
                            className={`flex flex-col items-center justify-center p-3 rounded-md border ${field.value === "5" ? "bg-primary text-white border-primary" : "bg-white"}`}
                          >
                            <RadioGroupItem value="5" id="premio-5" className="sr-only" />
                            <span className="font-medium">5º Prêmio</span>
                          </Label>
                          <Label
                            htmlFor="premio-1-5"
                            className={`flex flex-col items-center justify-center p-3 rounded-md border ${field.value === "1-5" ? "bg-primary text-white border-primary" : "bg-white"}`}
                          >
                            <RadioGroupItem value="1-5" id="premio-1-5" className="sr-only" />
                            <span className="font-medium">1º ao 5º</span>
                          </Label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            
            <DialogFooter className="flex flex-col gap-2 pb-2">
              <Button 
                type="button"
                disabled={!canProceed()}
                onClick={handleNextStep}
                className="w-full rounded-full py-5 text-base font-medium shadow-md transition-all hover:shadow-lg mb-1"
              >
                Próximo <ArrowRight className="h-4 w-4 ml-2 animate-pulse" />
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="w-full rounded-full py-2 text-sm mb-1"
              >
                Voltar
              </Button>
            </DialogFooter>
          </div>
        );
      
      case 4: // Valor da aposta e confirmação
        return (
          <div className="space-y-4 px-4 py-3">
            <DialogHeader>
              <DialogTitle className="text-center">Valor da Aposta</DialogTitle>
              <DialogDescription className="text-center">
                Selecione o valor e confirme sua aposta
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
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
                              field.onChange(value);
                            }}
                          >
                            {formatCurrency(value, false)}
                          </Button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Informações da aposta */}
              <div className="mt-4 p-4 rounded-lg bg-gray-50 border">
                <h4 className="font-medium text-center mb-2">Resumo da Aposta</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Modalidade:</p>
                    <p className="font-medium">{getCurrentGameMode()?.name || ""}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Sorteio:</p>
                    <p className="font-medium">
                      {draws.find(d => d.id === formValues.drawId)?.name || ""}
                    </p>
                  </div>
                  {selectedCategory === "groups" && selectedAnimal && (
                    <div>
                      <p className="text-gray-500">Animal:</p>
                      <p className="font-medium">{selectedAnimal.name} ({selectedAnimal.group})</p>
                    </div>
                  )}
                  {["dozens", "hundreds", "thousands"].includes(selectedCategory) && betNumber && (
                    <div>
                      <p className="text-gray-500">Número:</p>
                      <p className="font-medium">{betNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Prêmio:</p>
                    <p className="font-medium">
                      {formValues.premioType === "1-5" ? "1º ao 5º" : `${formValues.premioType}º Prêmio`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Valor da aposta:</p>
                    <p className="font-medium">{formatCurrency(formValues.amount, false)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 flex items-center">
                      Ganho potencial:
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span><Info className="h-4 w-4 ml-1 text-gray-400" /></span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Multiplicação: {formValues.amount} x {getCurrentGameMode()?.odds || 0} = {calculatePotentialWin()}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </p>
                    <p className="font-semibold text-lg text-green-600">
                      {formatCurrency(calculatePotentialWin(), false)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Exibir alerta se exceder o pagamento máximo */}
              {exceedsMaxPayout && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    O valor potencial de ganho excede o limite máximo de {formatCurrency(systemSettings?.maxPayout || 0, false)}.
                    Reduza o valor da aposta.
                  </AlertDescription>
                </Alert>
              )}
              
              <DialogFooter className="flex flex-col gap-2 pt-4">
                <Button 
                  type="button"
                  disabled={!canProceed() || betMutation.isPending}
                  className="w-full rounded-full py-5 text-base font-medium shadow-md transition-all hover:shadow-lg bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.preventDefault(); // Parar a propagação do evento
                    const isValid = form.trigger(); // Validar o formulário manualmente
                    isValid.then(valid => {
                      if (valid) {
                        const data = form.getValues();
                        onSubmit(data); // Chamar o handler de submissão diretamente
                      }
                    });
                  }}
                >
                  {betMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processando...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Confirmar Aposta
                    </span>
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  className="w-full rounded-full py-2 text-sm"
                >
                  Voltar
                </Button>
              </DialogFooter>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Verificar se está sendo usado dentro de um diálogo ou como componente principal
  if (inDialog) {
    // Versão para uso dentro de um diálogo (não inclui o diálogo em si)
    return (
      <>
        <Form {...form}>
          <div>
            {renderStepContent()}
          </div>
        </Form>
        
        {/* NOVA ABORDAGEM: Dialog simples sobreposto diretamente */}
        {showSimpleDialog && (
          <SimpleInsufficientDialog
            requiredAmount={requiredAmount}
            currentBalance={user?.balance || 0}
            hasBonusBalance={bonusBalance >= requiredAmount}
            bonusBalance={bonusBalance}
            onDeposit={() => {
              // A função de abrir o diálogo de depósito agora é
              // tratada internamente pelo SimpleInsufficientDialog
              // com sua própria implementação de DepositDialog
              setShowSimpleDialog(false);
            }}
            onUseBonusBalance={() => {
              // Handler para usar saldo de bônus
              if (savedBetData) {
                console.log("🎯 USANDO SALDO DE BÔNUS COM DIALOG SIMPLES:", savedBetData);
                
                // Criar uma cópia com flag de bônus
                const betDataWithBonus = {
                  ...savedBetData,
                  useBonusBalance: true  // Adicionar flag explícita
                };
                
                console.log("🎮 DADOS FINAIS DA APOSTA COM BÔNUS:", betDataWithBonus);
                
                // Executar a aposta com o flag de bônus
                betMutation.mutate(betDataWithBonus);
                
                // Feedback visual
                toast({
                  title: "Usando saldo de bônus",
                  description: "Processando sua aposta com o saldo de bônus disponível.",
                  variant: "default",
                });
                
                // Fechar o diálogo e limpar dados
                setShowSimpleDialog(false);
                setSavedBetData(null);
                setRequiredAmount(0);
              }
            }}
            onClose={() => {
              setShowSimpleDialog(false);
              // Adicionar qualquer lógica de limpeza necessária
              console.log("Diálogo simples fechado pelo usuário");
            }}
          />
        )}
        
        {/* Diálogo de depósito */}
        <DepositDialog
          open={showDepositDialog}
          onOpenChange={setShowDepositDialog}
          renderAsButton={false}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            
            // Solicitar os dados atualizados do usuário
            const checkDepositAndBet = async () => {
              try {
                // Apenas tenta processar a aposta se tiver dados salvos
                if (savedBetData && user) {
                  const response = await apiRequest("GET", "/api/user");
                  const updatedUser = await response.json();
                  
                  console.log("Verificando saldo após depósito:", {
                    updatedBalance: updatedUser?.balance || 0,
                    requiredAmount: requiredAmount
                  });
                  
                  if (updatedUser && updatedUser.balance >= requiredAmount) {
                    console.log("Saldo após depósito é suficiente, processando aposta salva");
                    // Processar a aposta salva
                    betMutation.mutate(savedBetData);
                    
                    // Limpar dados salvos após o processamento
                    setSavedBetData(null);
                    setRequiredAmount(0);
                    
                    toast({
                      title: "Depósito realizado e aposta processada!",
                      description: "Seu saldo foi atualizado e sua aposta foi registrada automaticamente.",
                      variant: "default",
                    });
                  } else {
                    toast({
                      title: "Depósito realizado com sucesso!",
                      description: "Seu saldo foi atualizado, mas ainda é insuficiente para a aposta.",
                      variant: "default",
                    });
                  }
                } else {
                  toast({
                    title: "Depósito realizado com sucesso!",
                    description: "Seu saldo foi atualizado. Você já pode fazer suas apostas.",
                    variant: "default",
                  });
                }
              } catch (error) {
                console.error("Erro ao verificar saldo após depósito:", error);
                toast({
                  title: "Depósito realizado com sucesso!",
                  description: "Seu saldo foi atualizado. Você já pode fazer suas apostas.",
                  variant: "default",
                });
              }
            };
            
            // Executar a função assíncrona
            checkDepositAndBet();
          }}
        />
      </>
    );
  }
  
  // Versão padrão (componente principal com seu próprio diálogo)
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button id="mobile-bet-trigger" className="w-full p-4 h-auto rounded-full font-medium text-base">
            Aposta Rápida
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <Form {...form}>
            <div>
              {renderStepContent()}
            </div>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* NOVA ABORDAGEM: Dialog simples sobreposto diretamente */}
      {showSimpleDialog && (
        <SimpleInsufficientDialog
          requiredAmount={requiredAmount}
          currentBalance={user?.balance || 0}
          hasBonusBalance={bonusBalance >= requiredAmount}
          bonusBalance={bonusBalance}
          onDeposit={() => {
            // A função de abrir o diálogo de depósito agora é
            // tratada internamente pelo SimpleInsufficientDialog
            // com sua própria implementação de DepositDialog
            setShowSimpleDialog(false);
          }}
          onUseBonusBalance={() => {
            // Handler para usar saldo de bônus
            if (savedBetData) {
              console.log("🎯 USANDO SALDO DE BÔNUS COM DIALOG SIMPLES (STANDALONE):", savedBetData);
              
              // Criar uma cópia com flag de bônus
              const betDataWithBonus = {
                ...savedBetData,
                useBonusBalance: true  // Adicionar flag explícita
              };
              
              console.log("🎮 DADOS FINAIS DA APOSTA COM BÔNUS:", betDataWithBonus);
              
              // Executar a aposta com o flag de bônus
              betMutation.mutate(betDataWithBonus);
              
              // Feedback visual
              toast({
                title: "Usando saldo de bônus",
                description: "Processando sua aposta com o saldo de bônus disponível.",
                variant: "default",
              });
              
              // Fechar o diálogo e limpar dados
              setShowSimpleDialog(false);
              setSavedBetData(null);
              setRequiredAmount(0);
            }
          }}
          onClose={() => {
            setShowSimpleDialog(false);
            // Adicionar qualquer lógica de limpeza necessária
            console.log("Diálogo simples fechado pelo usuário (modo standalone)");
          }}
        />
      )}
      
      {/* Diálogo de depósito */}
      <DepositDialog
        open={showDepositDialog}
        onOpenChange={setShowDepositDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          
          // Solicitar os dados atualizados do usuário
          const checkDepositAndBet = async () => {
            try {
              // Apenas tenta processar a aposta se tiver dados salvos
              if (savedBetData && user) {
                const response = await apiRequest("GET", "/api/user");
                const updatedUser = await response.json();
                
                console.log("Verificando saldo para processar aposta após depósito:", {
                  updatedBalance: updatedUser?.balance || 0,
                  requiredAmount: requiredAmount
                });
                
                if (updatedUser && updatedUser.balance >= requiredAmount) {
                  // Processar a aposta salva
                  console.log("Processando aposta salva após depósito", savedBetData);
                  betMutation.mutate(savedBetData);
                  
                  // Limpar dados de aposta salva (nova abordagem)
                  setSavedBetData(null);
                  setRequiredAmount(0);
                  
                  toast({
                    title: "Depósito realizado e aposta processada!",
                    description: "Seu saldo foi atualizado e sua aposta foi registrada automaticamente.",
                    variant: "default",
                  });
                } else {
                  toast({
                    title: "Depósito realizado com sucesso!",
                    description: "Seu saldo foi atualizado, mas ainda é insuficiente para a aposta.",
                    variant: "default",
                  });
                }
              } else {
                toast({
                  title: "Depósito realizado com sucesso!",
                  description: "Seu saldo foi atualizado. Você já pode fazer suas apostas.",
                  variant: "default",
                });
              }
            } catch (error) {
              console.error("Erro ao verificar saldo após depósito:", error);
              toast({
                title: "Depósito realizado com sucesso!",
                description: "Seu saldo foi atualizado. Você já pode fazer suas apostas.",
                variant: "default",
              });
            }
          };
          
          // Executar a função assíncrona
          checkDepositAndBet();
        }}
      />
    </>
  );
}
