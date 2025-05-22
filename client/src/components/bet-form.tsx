import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, X, Info, Award } from "lucide-react";
import { Animal, Draw, BetFormData, GameMode, PremioType, BetType } from "@/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, parseMoneyValue } from "@/lib/utils";
import { SelectableBetAmounts } from "@/components/selectable-bet-amounts";
import { BetConfirmationDialog } from "@/components/bet-confirmation-dialog";

// Interface para as configurações do sistema
interface SystemSettings {
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
}

interface BetFormProps {
  selectedAnimal: Animal | null;
  upcomingDraws: Draw[];
  onClearSelection: () => void;
}

export function BetForm({ selectedAnimal, upcomingDraws, onClearSelection }: BetFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  // Inicializar com valor padrão R$5
  const [betAmount, setBetAmount] = useState<string>("5,00");
  const [betType, setBetType] = useState<BetType>("simple");
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<string>("");
  const [potentialWinAmount, setPotentialWinAmount] = useState<number>(0);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>("");
  // Novo estado para selecionar qual prêmio a aposta será feita
  const [premioType, setPremioType] = useState<PremioType>("1");
  // Estado para controlar a exibição do modal de confirmação
  const [confirmationOpen, setConfirmationOpen] = useState<boolean>(false);
  
  // Fetch system settings
  const { data: systemSettings } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  // Fetch available game modes
  const { data: gameModes, isLoading: isLoadingGameModes } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });

  // Não definir o valor padrão automaticamente para permitir que o usuário digite o valor desejado
  // useEffect(() => {
  //   if (systemSettings && systemSettings.defaultBetAmount) {
  //     // Usar valor real diretamente (sem conversão)
  //     setBetAmount(systemSettings.defaultBetAmount);
  //     console.log(`Valor padrão de aposta definido: ${formatCurrency(systemSettings.defaultBetAmount)}`);
  //   }
  // }, [systemSettings]);

  useEffect(() => {
    // Set the first upcoming draw as default
    if (upcomingDraws && upcomingDraws.length > 0 && !selectedDraw) {
      setSelectedDraw(upcomingDraws[0].id);
    }

    // Set the first game mode as default
    if (gameModes && gameModes.length > 0 && !selectedGameMode) {
      setSelectedGameMode(gameModes[0].name);
    }
  }, [upcomingDraws, gameModes]);

  // Calculate potential win amount when bet amount or game mode changes
  useEffect(() => {
    if (gameModes && selectedGameMode && systemSettings) {
      const gameMode = gameModes.find(mode => mode.name === selectedGameMode);
      if (gameMode) {
        // Converter a string de aposta para número para cálculos
        const betAmountNum = parseMoneyValue(betAmount);
        
        // Calcular ganho potencial usando valores reais
        // Corrigindo para valores em centavos (dividindo por 100)
        const realBetAmount = betAmountNum / 100;
        // Multiplica pelo odds e converte o resultado de volta para centavos
        const winAmount = realBetAmount * gameMode.odds * 100;
        setPotentialWinAmount(winAmount);
        
        console.log(`Calculando potentialWinAmount: ${betAmountNum} * ${gameMode.odds} = ${winAmount}`);
        
        // Verificar limites de aposta e premiação
        setShowWarning(false);
        setWarningMessage("");
        
        // Verificar se a aposta excede o limite máximo
        if (systemSettings.maxBetAmount && betAmountNum > systemSettings.maxBetAmount) {
          setShowWarning(true);
          setWarningMessage(`A aposta máxima permitida é de ${formatCurrency(systemSettings.maxBetAmount)}`);
        }
        
        // Verificar se o prêmio potencial excede o limite máximo
        if (systemSettings.maxPayout && winAmount > systemSettings.maxPayout) {
          setShowWarning(true);
          const maxBetForMode = systemSettings.maxPayout / gameMode.odds;
          setWarningMessage(`O prêmio máximo permitido é de ${formatCurrency(systemSettings.maxPayout)}. Reduza sua aposta para no máximo ${formatCurrency(maxBetForMode)}`);
        }
      }
    }
  }, [betAmount, selectedGameMode, gameModes, systemSettings]);

  const betMutation = useMutation({
    mutationFn: async (betData: BetFormData) => {
      const res = await apiRequest("POST", "/api/bets", betData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aposta realizada com sucesso!",
        description: `Você apostou ${formatCurrency(betAmount)} no ${selectedAnimal?.name} com potencial de ganho de ${formatCurrency(potentialWinAmount)}`,
      });
      onClearSelection();
      
      // Invalidar todas as queries relacionadas para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao realizar aposta",
        description: error.message || "Verifique seu saldo e tente novamente",
        variant: "destructive",
      });
    },
  });

  // Função para validar e abrir o modal de confirmação
  const handleBet = () => {
    if (!selectedAnimal) {
      toast({
        title: "Selecione um animal",
        description: "Você precisa selecionar um animal para apostar",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDraw) {
      toast({
        title: "Selecione um sorteio",
        description: "Você precisa selecionar um sorteio para apostar",
        variant: "destructive",
      });
      return;
    }

    if (!selectedGameMode) {
      toast({
        title: "Selecione uma modalidade",
        description: "Você precisa selecionar uma modalidade de jogo",
        variant: "destructive",
      });
      return;
    }

    // Converter string para número para validações
    const betAmountNum = parseMoneyValue(betAmount);
    
    if (betAmountNum <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor da aposta deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    // Verificar o valor mínimo de aposta
    if (systemSettings && systemSettings.minBetAmount) {
      if (betAmountNum < systemSettings.minBetAmount) {
        toast({
          title: "Valor abaixo do mínimo",
          description: `O valor mínimo de aposta é ${formatCurrency(systemSettings.minBetAmount)}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (user && user.balance < betAmountNum) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para realizar esta aposta",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar limites de aposta máxima e prêmio máximo
    if (systemSettings) {
      // Verificar limite de aposta máxima
      if (systemSettings.maxBetAmount && betAmountNum > systemSettings.maxBetAmount) {
        toast({
          title: "Limite de aposta excedido",
          description: `A aposta máxima permitida é de ${formatCurrency(systemSettings.maxBetAmount)}`,
          variant: "destructive",
        });
        return;
      }
      
      // Verificar limite de prêmio máximo
      const selectedMode = gameModes?.find(mode => mode.name === selectedGameMode);
      if (selectedMode && systemSettings.maxPayout) {
        // Calcular potencial de vitória com valores reais (corrigindo para centavos)
        const realBetAmount = betAmountNum / 100;
        const potentialWin = realBetAmount * selectedMode.odds * 100;
        if (potentialWin > systemSettings.maxPayout) {
          // O valor máximo de aposta é calculado em centavos e já considerando a divisão por 100
          const maxBetForThisMode = (systemSettings.maxPayout / selectedMode.odds);
          toast({
            title: "Limite de prêmio excedido",
            description: `O prêmio máximo permitido é de ${formatCurrency(systemSettings.maxPayout)}. Reduza o valor da aposta para no máximo ${formatCurrency(maxBetForThisMode)}.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Encontrar o ID da modalidade selecionada
    const selectedMode = gameModes?.find(mode => mode.name === selectedGameMode);
    if (!selectedMode) {
      toast({
        title: "Modalidade não encontrada",
        description: "A modalidade selecionada não está disponível",
        variant: "destructive",
      });
      return;
    }

    // Se todas as validações passaram, podemos abrir o modal de confirmação
    setConfirmationOpen(true);
  };
  
  // Função que será chamada quando o usuário confirmar a aposta no modal
  const confirmBet = () => {
    if (!selectedAnimal || !selectedDraw || !selectedGameMode) return;
    
    const selectedMode = gameModes?.find(mode => mode.name === selectedGameMode);
    if (!selectedMode) return;
    
    // Calcular valor potencial com base no tipo de prêmio
    let finalPotentialWinAmount = potentialWinAmount;
    
    // Se a aposta for para todos os prêmios (1-5), dividimos o potencial de ganho por 5
    if (premioType === "1-5") {
      finalPotentialWinAmount = Math.floor(potentialWinAmount / 5);
    }
    
    // Criar objeto de dados da aposta incluindo o tipo de prêmio
    const betData: BetFormData = {
      animalId: selectedAnimal.id,
      drawId: selectedDraw,
      amount: parseMoneyValue(betAmount), // Convertemos para número
      type: betType,
      gameModeId: selectedMode.id,
      potentialWinAmount: finalPotentialWinAmount,
      premioType: premioType // Adicionar o tipo de prêmio selecionado
    };

    betMutation.mutate(betData);
    // Fechar o modal após submeter
    setConfirmationOpen(false);
  };

  if (!selectedAnimal) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-500">Selecione um animal para fazer sua aposta</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
      <div className="flex justify-between items-center mb-4">
        <div className="font-medium">
          Grupo {String(selectedAnimal.group).padStart(2, '0')} - {selectedAnimal.name}
        </div>
        <button 
          className="text-red-500 hover:text-red-700"
          onClick={onClearSelection}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="block text-sm text-gray-500 mb-2">
            Valor da aposta
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={betAmount === "0,50" ? "default" : "outline"}
              className={betAmount === "0,50" ? "bg-primary text-white" : "bg-white hover:bg-gray-50"}
              onClick={() => setBetAmount("0,50")}
            >
              R$0,50
            </Button>
            <Button
              type="button"
              variant={betAmount === "1,00" ? "default" : "outline"}
              className={betAmount === "1,00" ? "bg-primary text-white" : "bg-white hover:bg-gray-50"}
              onClick={() => setBetAmount("1,00")}
            >
              R$1
            </Button>
            <Button
              type="button"
              variant={betAmount === "2,00" ? "default" : "outline"}
              className={betAmount === "2,00" ? "bg-primary text-white" : "bg-white hover:bg-gray-50"}
              onClick={() => setBetAmount("2,00")}
            >
              R$2
            </Button>
            <Button
              type="button"
              variant={betAmount === "5,00" ? "default" : "outline"}
              className={betAmount === "5,00" ? "bg-primary text-white" : "bg-white hover:bg-gray-50"}
              onClick={() => setBetAmount("5,00")}
            >
              R$5
            </Button>
            <Button
              type="button"
              variant={betAmount === "10,00" ? "default" : "outline"}
              className={betAmount === "10,00" ? "bg-primary text-white" : "bg-white hover:bg-gray-50"}
              onClick={() => setBetAmount("10,00")}
            >
              R$10
            </Button>
            <Button
              type="button"
              variant={betAmount === "50,00" ? "default" : "outline"}
              className={betAmount === "50,00" ? "bg-primary text-white" : "bg-white hover:bg-gray-50"}
              onClick={() => setBetAmount("50,00")}
            >
              R$50
            </Button>
          </div>
        </div>
        
        <div>
          <Label htmlFor="bet-type" className="block text-sm text-gray-500 mb-1">
            Tipo de jogo
          </Label>
          <Select value={betType} onValueChange={(value) => setBetType(value as BetType)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simples</SelectItem>
              <SelectItem value="head">Cabeça</SelectItem>
              <SelectItem value="group">Grupo</SelectItem>
              <SelectItem value="dozen">Dezena</SelectItem>
              <SelectItem value="hundred">Centena</SelectItem>
              <SelectItem value="thousand">Milhar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <Label htmlFor="draw-select" className="block text-sm text-gray-500 mb-1">
            Sorteio
          </Label>
          <Select 
            value={selectedDraw ? selectedDraw.toString() : undefined} 
            onValueChange={(value) => setSelectedDraw(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o sorteio" />
            </SelectTrigger>
            <SelectContent>
              {upcomingDraws.map((draw) => (
                <SelectItem key={draw.id} value={draw.id.toString()}>
                  {draw.name} - {draw.time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="game-mode" className="block text-sm text-gray-500 mb-1">
            Modalidade
          </Label>
          <Select 
            value={selectedGameMode} 
            onValueChange={setSelectedGameMode}
            disabled={isLoadingGameModes}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingGameModes ? "Carregando..." : "Selecione a modalidade"} />
            </SelectTrigger>
            <SelectContent>
              {gameModes?.filter(mode => mode.active).map((mode) => (
                <SelectItem key={mode.id} value={mode.name}>
                  {mode.name} - {mode.odds}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Seletor de prêmios (1° ao 5°) */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm text-gray-500">Prêmio</Label>
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
        
        <RadioGroup
          value={premioType}
          onValueChange={(value) => setPremioType(value as PremioType)}
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
          
          {/* Opção para todos os prêmios (1° ao 5°) */}
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1-5" id="premio-todos" className="peer sr-only" />
            <Label
              htmlFor="premio-todos"
              className="flex flex-col items-center justify-center w-full h-14 rounded-md border-2 border-muted 
                         bg-popover p-1 hover:bg-accent hover:text-accent-foreground 
                         peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                         cursor-pointer text-center"
            >
              <Award className="h-4 w-4 mb-1" />
              <span className="text-xs font-medium">1° ao 5°</span>
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      {showWarning && (
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-800">Limite atingido</AlertTitle>
          <AlertDescription className="text-amber-700">
            {warningMessage}
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="mb-4 bg-gray-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Sua aposta:</p>
              <p className="text-lg font-semibold">{formatCurrency(betAmount)}</p>
              {systemSettings?.maxBetAmount && (
                <p className="text-xs text-gray-400">Máximo: {formatCurrency(systemSettings.maxBetAmount)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Ganho potencial:</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(premioType === "1-5" ? potentialWinAmount / 5 : potentialWinAmount)}
                {premioType === "1-5" && (
                  <span className="ml-1 text-xs text-gray-500">(por prêmio)</span>
                )}
              </p>
              {premioType === "1-5" && (
                <p className="text-xs text-gray-500">
                  Total: até {formatCurrency(potentialWinAmount)} (5 prêmios)
                </p>
              )}
              {systemSettings?.maxPayout && (
                <p className="text-xs text-gray-400">
                  Máximo: {formatCurrency(systemSettings.maxPayout)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">
          Total: <span className="text-primary">{formatCurrency(betAmount)}</span>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={onClearSelection}>
            Limpar
          </Button>
          <Button 
            onClick={handleBet}
            disabled={
              betMutation.isPending || 
              showWarning || 
              !!(systemSettings?.maxBetAmount && parseMoneyValue(betAmount) > systemSettings.maxBetAmount) ||
              !!(gameModes && selectedGameMode && systemSettings?.maxPayout && 
                (() => {
                  const mode = gameModes.find(mode => mode.name === selectedGameMode);
                  return mode ? parseMoneyValue(betAmount) * mode.odds > systemSettings.maxPayout : false;
                })()
              )
            }
          >
            {betMutation.isPending ? "Processando..." : "Fazer aposta"}
          </Button>
        </div>
      </div>
      
      {/* Modal de confirmação da aposta */}
      {selectedAnimal && selectedDraw && gameModes && (
        <BetConfirmationDialog
          open={confirmationOpen}
          onOpenChange={setConfirmationOpen}
          betAmount={betAmount}
          potentialReturn={
            premioType === "1-5" 
              ? Math.floor(potentialWinAmount / 5)
              : potentialWinAmount
          }
          animalName={selectedAnimal.name}
          animalGroup={selectedAnimal.group}
          drawName={upcomingDraws.find(d => d.id === selectedDraw)?.name || ""}
          premioType={premioType}
          gameMode={selectedGameMode}
          onConfirm={confirmBet}
          isSubmitting={betMutation.isPending}
        />
      )}
    </div>
  );
}