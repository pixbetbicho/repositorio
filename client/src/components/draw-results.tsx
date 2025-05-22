import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Draw, Animal, Bet } from "@/types";
import { Badge } from "@/components/ui/badge";
import { PieChart, Trophy, Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DrawResultSummary = {
  totalBets: number;
  totalAmount: number;
  totalWinners: number;
  totalPaidOut: number;
  participation: {
    animalId: number;
    count: number;
    percentage: number;
  }[];
};

export function DrawResults() {
  const { toast } = useToast();
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);

  const { data: draws } = useQuery<Draw[]>({
    queryKey: ["/api/draws"],
  });

  const { data: animals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  // Atualizando para a nova estrutura de dados com paginação com parâmetros de consulta
  const { data: betsData } = useQuery<{ data: Bet[], meta: { total: number, page: number, pageSize: number, totalPages: number } }>({
    queryKey: ["/api/admin/bets", { page: 1, pageSize: 200, sortOrder: "desc" }],
  });
  
  // Criando uma referência para os dados das apostas para manter compatibilidade com o código existente
  const bets = betsData?.data || [];

  const completedDraws = draws?.filter(draw => draw.status === "completed") || [];

  const showDrawResults = (draw: Draw) => {
    setSelectedDraw(draw);
    setResultsDialogOpen(true);
  };

  const getAnimalName = (animalId: number | null) => {
    if (!animalId || !animals) return "-";
    const animal = animals.find(a => a.id === animalId);
    return animal ? `Grupo ${String(animal.group).padStart(2, '0')} - ${animal.name}` : "-";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getDrawResultSummary = (drawId: number): DrawResultSummary => {
    const drawBets = bets?.filter(bet => bet.drawId === drawId) || [];
    
    const totalBets = drawBets.length;
    const totalAmount = drawBets.reduce((sum, bet) => sum + bet.amount, 0);
    const winners = drawBets.filter(bet => bet.status === "won");
    const totalWinners = winners.length;
    const totalPaidOut = winners.reduce((sum, bet) => sum + (bet.winAmount || 0), 0);
    
    // Calculate participation by animal
    const animalCounts: Record<string, number> = {};
    drawBets.forEach(bet => {
      if (bet.animalId) { // Verificar se animalId não é null ou undefined
        const animalIdStr = bet.animalId.toString();
        animalCounts[animalIdStr] = (animalCounts[animalIdStr] || 0) + 1;
      }
    });
    
    const participation = Object.entries(animalCounts).map(([animalId, count]) => ({
      animalId: parseInt(animalId),
      count,
      percentage: totalBets > 0 ? (count / totalBets * 100) : 0
    }));
    
    // Sort by count descending
    participation.sort((a, b) => b.count - a.count);
    
    return {
      totalBets,
      totalAmount,
      totalWinners,
      totalPaidOut,
      participation
    };
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Resultados dos Sorteios</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Versão Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sorteio</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Total de Apostas</TableHead>
                  <TableHead>Ganhadores</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedDraws.length > 0 ? (
                  completedDraws.map((draw) => {
                    const summary = getDrawResultSummary(draw.id);
                    return (
                      <TableRow key={draw.id}>
                        <TableCell className="font-medium">{draw.name}</TableCell>
                        <TableCell>
                          {new Date(draw.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{draw.time}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Trophy className="h-4 w-4 text-yellow-500 mr-2" />
                            {getAnimalName(draw.resultAnimalId)}
                          </div>
                        </TableCell>
                        <TableCell>{summary.totalBets}</TableCell>
                        <TableCell>{summary.totalWinners}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => showDrawResults(draw)}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Nenhum sorteio finalizado ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Versão Mobile */}
          <div className="md:hidden space-y-4">
            {completedDraws.length > 0 ? (
              completedDraws.map((draw) => {
                const summary = getDrawResultSummary(draw.id);
                return (
                  <Card key={draw.id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-lg">{draw.name}</div>
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {draw.time}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-500" />
                          <span>{new Date(draw.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-gray-500">Apostas:</span>
                          <span className="font-medium">{summary.totalBets}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-3 bg-yellow-50 p-2 rounded-md">
                        <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                        <span className="font-semibold">{getAnimalName(draw.resultAnimalId)}</span>
                        <span className="ml-auto text-gray-500 text-xs">
                          {summary.totalWinners} ganhadores
                        </span>
                      </div>
                      
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => showDrawResults(draw)}
                      >
                        Ver Detalhes
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">
                Nenhum sorteio finalizado ainda
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Draw Results Dialog */}
      <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[625px] p-2 sm:p-6">
          <DialogHeader>
            <DialogTitle>Resultado do Sorteio: {selectedDraw?.name}</DialogTitle>
            <DialogDescription>
              Detalhes completos do resultado e estatísticas do sorteio.
            </DialogDescription>
          </DialogHeader>
          {selectedDraw && (
            <div className="grid gap-4 py-2 sm:gap-6 sm:py-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <Card>
                  <CardContent className="p-2 sm:p-4">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm text-gray-500">Data</span>
                    </div>
                    <div className="text-sm sm:text-lg font-semibold">
                      {new Date(selectedDraw.date).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2 sm:p-4">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm text-gray-500">Horário</span>
                    </div>
                    <div className="text-sm sm:text-lg font-semibold">
                      {selectedDraw.time}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500 mb-1">Animal Vencedor</div>
                      <div className="text-sm sm:text-xl font-semibold flex items-center">
                        <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mr-1 sm:mr-2" />
                        {getAnimalName(selectedDraw.resultAnimalId)}
                      </div>
                    </div>
                    {selectedDraw.resultAnimalId && animals && (
                      <div className="text-3xl sm:text-6xl opacity-80">
                        {animals.find(a => a.id === selectedDraw.resultAnimalId)?.numbers.join(" ")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {(() => {
                const summary = getDrawResultSummary(selectedDraw.id);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <Card>
                        <CardContent className="p-2 sm:p-4">
                          <div className="text-xs sm:text-sm text-gray-500 mb-1">Total de Apostas</div>
                          <div className="text-sm sm:text-xl font-semibold">{summary.totalBets}</div>
                          <div className="text-xs sm:text-sm text-gray-500 mt-1">
                            Volume: {formatCurrency(summary.totalAmount)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-2 sm:p-4">
                          <div className="text-xs sm:text-sm text-gray-500 mb-1">Ganhadores</div>
                          <div className="text-sm sm:text-xl font-semibold">{summary.totalWinners}</div>
                          <div className="text-xs sm:text-sm text-gray-500 mt-1">
                            Pagos: {formatCurrency(summary.totalPaidOut)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-medium mb-2 flex items-center">
                        <PieChart className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Distribuição das Apostas
                      </h4>
                      
                      {/* Versão Desktop */}
                      <div className="hidden sm:block max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Animal</TableHead>
                              <TableHead>Apostas</TableHead>
                              <TableHead>Porcentagem</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.participation.map((item) => (
                              <TableRow key={item.animalId}>
                                <TableCell>{getAnimalName(item.animalId)}</TableCell>
                                <TableCell>{item.count}</TableCell>
                                <TableCell>{item.percentage.toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Versão Mobile */}
                      <div className="sm:hidden max-h-60 overflow-y-auto space-y-2">
                        {summary.participation.map((item) => (
                          <div key={item.animalId} className="bg-gray-50 p-2 rounded-md flex items-center justify-between">
                            <div className="text-xs font-medium">{getAnimalName(item.animalId)}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.count} apostas
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {item.percentage.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter className="mt-2 sm:mt-4">
            <Button onClick={() => setResultsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}