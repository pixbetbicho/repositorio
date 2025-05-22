// simple-bet-dialog.tsx - Versão simplificada do formulário de apostas
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Animal, Draw, GameMode } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface SimpleBetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Formulário de apostas simplificado
const formSchema = z.object({
  drawId: z.number().min(1, "Selecione um sorteio"),
  gameModeId: z.number().min(1, "Escolha uma modalidade"),
  amount: z.number().min(1, "Valor mínimo de aposta é R$1"),
  animalId: z.number().optional(),
  betNumbers: z.string().optional(),
  premioType: z.enum(["1", "1-5"]).default("1"),
  useBonusBalance: z.boolean().default(false),
});

type BetFormValues = z.infer<typeof formSchema>;

export function SimpleBetDialog({ open, onOpenChange }: SimpleBetDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("animal");
  const [betNumber, setBetNumber] = useState<string>("");

  // Buscar dados necessários
  const { data: animals = [] } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: upcomingDraws = [] } = useQuery<Draw[]>({
    queryKey: ["/api/draws/upcoming"],
  });

  const { data: gameModes = [] } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });

  // Buscar configurações do sistema
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/system-settings"],
  });

  // Inicializar formulário
  const form = useForm<BetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      drawId: upcomingDraws[0]?.id || 0,
      gameModeId: 0,
      amount: systemSettings?.defaultBetAmount || 2,
      premioType: "1",
      useBonusBalance: false,
    },
  });

  // Observar valores do formulário
  const formValues = form.watch();

  // Definir valores iniciais quando os dados carregarem
  useEffect(() => {
    if (upcomingDraws.length > 0 && !form.getValues("drawId")) {
      form.setValue("drawId", upcomingDraws[0].id);
    }
    
    if (gameModes.length > 0 && !form.getValues("gameModeId")) {
      // Buscar modalidade "Grupo"
      const grupoMode = gameModes.find(mode => {
        const name = mode.name.toLowerCase();
        return name.includes("grupo") && !name.includes("duque") && !name.includes("terno");
      });
      
      if (grupoMode) {
        form.setValue("gameModeId", grupoMode.id);
      } else if (gameModes.length > 0) {
        form.setValue("gameModeId", gameModes[0].id);
      }
    }
  }, [upcomingDraws, gameModes, form]);

  // Obter o modo de jogo selecionado
  const selectedGameMode = gameModes.find(mode => mode.id === formValues.gameModeId);

  // Cálculo de ganho potencial
  const calculatePotentialWin = () => {
    if (!selectedGameMode || !formValues.amount) return 0;

    const adjustedMultiplier = formValues.premioType === "1-5" ? 
      selectedGameMode.odds / 5 : selectedGameMode.odds;
    
    return Math.floor(formValues.amount * adjustedMultiplier);
  };

  // Mutação para enviar aposta
  const betMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/bets", data);
      return response.json();
    },
    onSuccess: () => {
      // Resetar formulário e fechar diálogo
      form.reset();
      onOpenChange(false);
      
      // Atualizar dados do usuário e apostas
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      
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

  // Processar envio do formulário
  const onSubmit = (data: BetFormValues) => {
    if (!user) {
      toast({
        title: "Você precisa estar logado",
        description: "Por favor, faça login para realizar uma aposta.",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite de pagamento
    if (systemSettings?.maxPayout && calculatePotentialWin() > systemSettings.maxPayout) {
      toast({
        title: "Valor máximo excedido",
        description: `O ganho potencial excede o limite máximo de ${formatCurrency(systemSettings.maxPayout)}. Reduza o valor da aposta.`,
        variant: "destructive",
      });
      return;
    }

    // Preparar dados para envio
    const betData: any = {
      drawId: data.drawId,
      gameModeId: data.gameModeId,
      amount: data.amount,
      premioType: data.premioType,
      potentialWinAmount: calculatePotentialWin(),
      useBonusBalance: data.useBonusBalance,
    };

    // Adicionar ID do animal ou número de aposta dependendo do tipo
    if (selectedTab === "animal" && selectedAnimal) {
      betData.animalId = selectedAnimal.id;
      betData.type = "group";
    } else if (selectedTab === "number" && betNumber) {
      betData.betNumbers = [betNumber];
      
      // Determinar tipo baseado no tamanho do número
      if (betNumber.length === 2) {
        betData.type = "dozen";
      } else if (betNumber.length === 3) {
        betData.type = "hundred";
      } else if (betNumber.length === 4) {
        betData.type = "thousand";
      }
    } else {
      toast({
        title: "Informação incompleta",
        description: "Selecione um animal ou digite um número para apostar.",
        variant: "destructive",
      });
      return;
    }

    // Enviar aposta
    betMutation.mutate(betData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-md p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fazer Aposta</DialogTitle>
          <DialogDescription>
            Escolha as opções de aposta
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de Aposta (Animal ou Número) */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-2">
                <TabsTrigger value="animal">Apostar no Bicho</TabsTrigger>
                <TabsTrigger value="number">Apostar no Número</TabsTrigger>
              </TabsList>

              <TabsContent value="animal" className="space-y-4">
                <FormItem>
                  <FormLabel>Selecione o Bicho</FormLabel>
                  <div className="grid grid-cols-5 gap-2">
                    {animals.slice(0, 10).map((animal) => (
                      <Card 
                        key={animal.id}
                        className={`cursor-pointer text-center p-2 ${selectedAnimal?.id === animal.id ? 'border-primary bg-primary/10' : ''}`}
                        onClick={() => setSelectedAnimal(animal)}
                      >
                        <CardContent className="p-0 pb-2">
                          <div className="text-xl mb-1">{animal.emoji || "🐾"}</div>
                          <div className="text-xs font-medium">{animal.name}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </FormItem>
              </TabsContent>

              <TabsContent value="number" className="space-y-4">
                <FormItem>
                  <FormLabel>Digite o número</FormLabel>
                  <Input 
                    type="text" 
                    placeholder="Digite o número (2-4 dígitos)" 
                    value={betNumber}
                    onChange={(e) => setBetNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dezena (2 dígitos), Centena (3 dígitos) ou Milhar (4 dígitos)
                  </p>
                </FormItem>
              </TabsContent>
            </Tabs>

            {/* Sorteio */}
            <FormField
              control={form.control}
              name="drawId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sorteio</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o sorteio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {upcomingDraws.map((draw) => (
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

            {/* Modalidade */}
            <FormField
              control={form.control}
              name="gameModeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modalidade</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a modalidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gameModes.map((mode) => (
                        <SelectItem key={mode.id} value={mode.id.toString()}>
                          {mode.name} ({mode.odds}x)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Opção de usar saldo de bônus - só exibir se as apostas com bônus estiverem habilitadas nas configurações */}
            {systemSettings?.allowBonusBets && (
              <FormField
                control={form.control}
                name="useBonusBalance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Usar saldo de bônus</FormLabel>
                      <FormDescription>
                        Use seu saldo de bônus para esta aposta. 
                        {field.value ? " ✓ Saldo de bônus será usado." : ""}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Prêmio (1º ou 1º-5º) */}
            <FormField
              control={form.control}
              name="premioType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prêmio</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de prêmio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1º Prêmio</SelectItem>
                      <SelectItem value="1-5">1º ao 5º Prêmio</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor da Aposta */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor da Aposta (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      min={systemSettings?.minBetAmount || 1}
                      max={systemSettings?.maxBetAmount || 10000}
                      step="0.5"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Potencial de Ganho */}
            <div className="bg-muted p-3 rounded-md">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Ganho Potencial:</span>
                <span className="text-sm font-bold text-green-600">
                  R$ {calculatePotentialWin().toFixed(2)}
                </span>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="w-full sm:w-auto"
                disabled={betMutation.isPending}
              >
                {betMutation.isPending ? "Enviando..." : "Confirmar Aposta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
