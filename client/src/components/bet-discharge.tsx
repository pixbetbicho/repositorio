import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bet, Draw, Animal } from "@/types";
import { AlertCircle, ArrowUpRight, CheckCircle, Clock, Loader2, ReceiptText, SendHorizontal } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export function BetDischarge() {
  const { toast } = useToast();
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [targetDrawId, setTargetDrawId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Buscar apostas pendentes
  // Atualizando para a nova estrutura de dados com paginação
  const { data: betsData, isLoading: betsLoading } = useQuery<{ 
    data: Bet[], 
    meta: { total: number, page: number, pageSize: number, totalPages: number } 
  }>({
    queryKey: ["/api/admin/bets"],
  });
  
  // Criando uma referência para os dados das apostas para manter compatibilidade com o código existente
  const bets = betsData?.data || [];

  const pendingBets = bets?.filter(bet => bet.status === "pending") || [];

  // Buscar sorteios pendentes
  const { data: draws, isLoading: drawsLoading } = useQuery<Draw[]>({
    queryKey: ["/api/draws"],
  });

  const upcomingDraws = draws?.filter(draw => draw.status === "pending") || [];

  // Buscar animais para exibição dos detalhes
  const { data: animals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  // Mutação para descarregar a aposta
  const dischargeMutation = useMutation({
    mutationFn: async (data: { betId: number; drawId: number; note: string }) => {
      const res = await apiRequest("POST", "/api/admin/bets/discharge", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Aposta descarregada com sucesso",
        description: "A aposta foi transferida para o novo sorteio.",
        variant: "default",
      });
      
      // Atualizar as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      
      // Limpar formulário
      setSelectedBet(null);
      setTargetDrawId("");
      setNote("");
      setConfirmDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao descarregar aposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectBet = (bet: Bet) => {
    setSelectedBet(bet);
    setTargetDrawId(""); // Limpar seleção anterior
    setNote("");
  };

  const handleDischarge = () => {
    if (!selectedBet || !targetDrawId) {
      toast({
        title: "Dados incompletos",
        description: "Selecione uma aposta e um sorteio de destino.",
        variant: "destructive",
      });
      return;
    }

    dischargeMutation.mutate({
      betId: selectedBet.id,
      drawId: parseInt(targetDrawId),
      note: note,
    });
  };

  // Formatação e funções auxiliares
  // Usando a função formatCurrency comum em toda a aplicação
  // Substituindo a antiga formatMoney que usava Intl.NumberFormat

  const getAnimalName = (animalId: number | undefined) => {
    if (!animalId) return "Desconhecido";
    return animals?.find(animal => animal.id === animalId)?.name || "Desconhecido";
  };

  const getDrawName = (drawId: number | undefined) => {
    if (!drawId) return "Desconhecido";
    const draw = draws?.find(draw => draw.id === drawId);
    if (!draw) return "Desconhecido";
    
    return `${draw.name} - ${format(new Date(draw.date), "dd/MM HH:mm", { locale: ptBR })}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SendHorizontal className="h-5 w-5" />
          Descarregar Apostas
        </CardTitle>
        <CardDescription>
          Transfira apostas entre sorteios diferentes para gerenciar a carga da banca.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Lista de apostas pendentes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Apostas Pendentes</h3>
              {pendingBets && pendingBets.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {pendingBets.length} apostas
                </Badge>
              )}
            </div>
            
            {betsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingBets.length === 0 ? (
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Não há apostas pendentes para descarregar.</p>
              </div>
            ) : (
              <div className="border rounded-md max-h-[350px] md:max-h-[500px] overflow-y-auto">
                {/* Versão para desktop */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Animal</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Sorteio</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingBets.map((bet) => (
                        <TableRow 
                          key={bet.id}
                          className={cn(
                            selectedBet?.id === bet.id && "bg-primary/10"
                          )}
                        >
                          <TableCell className="font-medium">#{bet.id}</TableCell>
                          <TableCell>{getAnimalName(bet.animalId)}</TableCell>
                          <TableCell>{formatCurrency(bet.amount || 0)}</TableCell>
                          <TableCell>{getDrawName(bet.drawId)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSelectBet(bet)}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Versão para mobile - Layout de cards */}
                <div className="sm:hidden">
                  <div className="divide-y">
                    {pendingBets.map((bet) => (
                      <div 
                        key={bet.id} 
                        className={cn(
                          "p-3 flex flex-col space-y-2 cursor-pointer hover:bg-gray-50", 
                          selectedBet?.id === bet.id && "bg-primary/10"
                        )}
                        onClick={() => handleSelectBet(bet)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Badge variant="secondary" className="mr-2">#{bet.id}</Badge>
                            <span className="font-medium">{getAnimalName(bet.animalId)}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Valor:</span>
                          <span className="font-medium">{formatCurrency(bet.amount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sorteio:</span>
                          <span className="font-medium truncate max-w-[180px]">{getDrawName(bet.drawId)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Formulário de descarregamento */}
          <div className="space-y-6 mt-6 md:mt-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Detalhes da Transferência</h3>
              
              {selectedBet && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="md:hidden" 
                  onClick={() => setSelectedBet(null)}
                >
                  Voltar
                </Button>
              )}
            </div>
            
            {selectedBet ? (
              <>
                <div className="grid gap-4">
                  <div className="bg-primary/5 p-3 sm:p-4 rounded-lg">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
                      <dt className="text-muted-foreground">ID da Aposta:</dt>
                      <dd className="font-medium">#{selectedBet.id}</dd>
                      
                      <dt className="text-muted-foreground">Animal:</dt>
                      <dd className="font-medium">{getAnimalName(selectedBet.animalId)}</dd>
                      
                      <dt className="text-muted-foreground">Valor:</dt>
                      <dd className="font-medium">{formatCurrency(selectedBet.amount || 0)}</dd>
                      
                      <dt className="text-muted-foreground">Sorteio Atual:</dt>
                      <dd className="font-medium truncate">{getDrawName(selectedBet.drawId)}</dd>
                      
                      <dt className="text-muted-foreground">Data da Aposta:</dt>
                      <dd className="font-medium">
                        {format(new Date(selectedBet.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </dd>
                    </dl>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target-draw">Sorteio de Destino</Label>
                    <Select value={targetDrawId} onValueChange={setTargetDrawId}>
                      <SelectTrigger id="target-draw">
                        <SelectValue placeholder="Selecione o sorteio de destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {upcomingDraws
                          .filter(draw => draw.id !== selectedBet.drawId) // Exclui o sorteio atual
                          .map((draw) => (
                            <SelectItem key={draw.id} value={draw.id.toString()}>
                              {draw.name} - {format(new Date(draw.date), "dd/MM HH:mm", { locale: ptBR })}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="discharge-note">Observação (opcional)</Label>
                    <Textarea 
                      id="discharge-note" 
                      placeholder="Informe o motivo da transferência" 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-yellow-800">
                        Ao transferir uma aposta, ela será vinculada ao novo sorteio e 
                        continuará válida com as mesmas características.
                      </p>
                    </div>
                  </div>
                  
                  <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full mt-2" 
                        disabled={!targetDrawId || dischargeMutation.isPending}
                      >
                        {dischargeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando
                          </>
                        ) : (
                          <>
                            <SendHorizontal className="mr-2 h-4 w-4" />
                            Transferir Aposta
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Confirmar Transferência</DialogTitle>
                        <DialogDescription>
                          Você está prestes a transferir uma aposta para outro sorteio.
                          Esta ação não pode ser desfeita.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-2 border-b pb-2">
                          <p className="text-sm font-medium">Aposta:</p>
                          <p className="text-sm">#{selectedBet.id} - {getAnimalName(selectedBet.animalId)}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 border-b pb-2">
                          <p className="text-sm font-medium">De:</p>
                          <p className="text-sm">{getDrawName(selectedBet.drawId)}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <p className="text-sm font-medium">Para:</p>
                          <p className="text-sm">
                            {targetDrawId ? getDrawName(parseInt(targetDrawId)) : "Não selecionado"}
                          </p>
                        </div>
                      </div>
                      
                      <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setConfirmDialogOpen(false)}
                          className="w-full sm:w-auto"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleDischarge}
                          className="gap-2 w-full sm:w-auto"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Confirmar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            ) : (
              <div className="bg-muted/50 rounded-lg p-6 h-[250px] sm:h-72 flex flex-col items-center justify-center text-center">
                <ReceiptText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium mb-1">Nenhuma aposta selecionada</h4>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Selecione uma aposta na lista {window.innerWidth < 768 ? "acima" : "ao lado"} para transferi-la.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}