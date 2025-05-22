import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Bet, Animal, Draw, GameMode, User } from "@/types";
import { BarChart3, Download, FileDown, Filter, LineChart, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

export function SalesReport() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  
  const [activeTab, setActiveTab] = useState("summary");
  const [filteredBets, setFilteredBets] = useState<Bet[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterValue, setFilterValue] = useState<string>("");
  
  // Atualizando para a nova estrutura de dados com paginação com parâmetros de consulta
  const { data: betsData } = useQuery<{ data: Bet[], meta: { total: number, page: number, pageSize: number, totalPages: number } }>({
    queryKey: ["/api/admin/bets", { page: 1, pageSize: 500, sortOrder: "desc" }],
  });
  
  // Criando uma referência para os dados das apostas para manter compatibilidade com o código existente
  const bets = betsData?.data || [];
  
  const { data: animals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });
  
  const { data: draws } = useQuery<Draw[]>({
    queryKey: ["/api/draws"],
  });
  
  const { data: gameModes } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });
  
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  useEffect(() => {
    if (bets) {
      let filtered = bets.filter(bet => {
        const betDate = new Date(bet.createdAt);
        return isWithinInterval(betDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to)
        });
      });

      // Aplicar filtros adicionais
      if (filterType !== "all" && filterValue) {
        switch (filterType) {
          case "animal":
            filtered = filtered.filter(bet => bet.animalId === parseInt(filterValue));
            break;
          case "draw":
            filtered = filtered.filter(bet => bet.drawId === parseInt(filterValue));
            break;
          case "user":
            filtered = filtered.filter(bet => bet.userId === parseInt(filterValue));
            break;
          case "gameMode":
            filtered = filtered.filter(bet => bet.gameModeId === parseInt(filterValue));
            break;
          case "status":
            filtered = filtered.filter(bet => bet.status === filterValue);
            break;
        }
      }
      
      setFilteredBets(filtered);
    }
  }, [bets, dateRange, filterType, filterValue]);
  
  // Cálculos para o relatório
  const totalBets = filteredBets.length;
  const totalAmount = filteredBets.reduce((acc, bet) => acc + bet.amount, 0);
  const totalPaidOut = filteredBets.reduce((acc, bet) => {
    if (bet.status === "won" && bet.winAmount) {
      return acc + bet.winAmount;
    }
    return acc;
  }, 0);
  const profit = totalAmount - totalPaidOut;
  const profitMargin = totalAmount > 0 ? (profit / totalAmount * 100).toFixed(2) : "0";
  
  // Estatísticas por animal
  const betsByAnimal = animals && filteredBets.length > 0
    ? animals.map(animal => {
        const animalBets = filteredBets.filter(bet => bet.animalId === animal.id);
        return {
          id: animal.id,
          name: animal.name,
          count: animalBets.length,
          amount: animalBets.reduce((acc, bet) => acc + bet.amount, 0),
          percentage: totalBets > 0 ? (animalBets.length / totalBets * 100).toFixed(2) : "0"
        };
      }).sort((a, b) => b.count - a.count)
    : [];
  
  // Estatísticas por status
  const betsByStatus = {
    pending: filteredBets.filter(bet => bet.status === "pending").length,
    won: filteredBets.filter(bet => bet.status === "won").length,
    lost: filteredBets.filter(bet => bet.status === "lost").length
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Relatório de Vendas
        </CardTitle>
        <CardDescription>
          Analise as apostas e resultados financeiros em períodos específicos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-1/3">
              <Label htmlFor="date-range" className="mb-2 block">Período</Label>
              <DateRangePicker 
                dateRange={dateRange} 
                onChange={(range: DateRange | undefined) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }} 
              />
            </div>
            
            <div className="w-full md:w-1/3">
              <Label htmlFor="filter-type" className="mb-2 block">Filtrar por</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um filtro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="animal">Animal</SelectItem>
                  <SelectItem value="draw">Sorteio</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="gameMode">Modalidade</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/3">
              <Label htmlFor="filter-value" className="mb-2 block">Valor do filtro</Label>
              {filterType === "all" ? (
                <Input value="" disabled placeholder="Filtro não necessário" />
              ) : filterType === "animal" ? (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um animal" />
                  </SelectTrigger>
                  <SelectContent>
                    {animals?.map(animal => (
                      <SelectItem key={animal.id} value={animal.id.toString()}>
                        {animal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : filterType === "draw" ? (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um sorteio" />
                  </SelectTrigger>
                  <SelectContent>
                    {draws?.map(draw => (
                      <SelectItem key={draw.id} value={draw.id.toString()}>
                        {draw.name} - {format(new Date(draw.date), "dd/MM/yyyy HH:mm")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : filterType === "user" ? (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : filterType === "gameMode" ? (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameModes?.map(mode => (
                      <SelectItem key={mode.id} value={mode.id.toString()}>
                        {mode.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="won">Ganhou</SelectItem>
                    <SelectItem value="lost">Perdeu</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {totalBets}
                </div>
                <p className="text-sm text-muted-foreground">Total de apostas</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-muted-foreground">Valor apostado</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  R$ {totalPaidOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-muted-foreground">Total pago</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className={cn(
                  "text-2xl font-bold",
                  profit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-sm ml-2">({profitMargin}%)</span>
                </div>
                <p className="text-sm text-muted-foreground">Lucro/Prejuízo</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Guias de detalhamento */}
          <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="summary" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-1">
                <LineChart className="h-4 w-4" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="distribution" className="flex items-center gap-1">
                <PieChart className="h-4 w-4" />
                Distribuição
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Status das Apostas</h3>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-xl font-bold text-orange-500">
                        {betsByStatus.pending}
                      </div>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-xl font-bold text-green-500">
                        {betsByStatus.won}
                      </div>
                      <p className="text-sm text-muted-foreground">Ganhas</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-xl font-bold text-red-500">
                        {betsByStatus.lost}
                      </div>
                      <p className="text-sm text-muted-foreground">Perdidas</p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Top 5 Animais Mais Jogados</h3>
                  
                  {/* Visão Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Animal</TableHead>
                          <TableHead>Apostas</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead className="text-right">% do Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {betsByAnimal.slice(0, 5).map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell>R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">{item.percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Visão Mobile */}
                  <div className="grid grid-cols-1 gap-3 md:hidden">
                    {betsByAnimal.slice(0, 5).map(item => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-base">{item.name}</span>
                          <Badge variant="outline" className="bg-primary/10 text-primary">
                            {item.percentage}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-500">Apostas:</div>
                          <div className="text-right font-medium">{item.count}</div>
                          <div className="text-gray-500">Valor Total:</div>
                          <div className="text-right font-medium">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Lista de Apostas</h3>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <FileDown className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
                
                {/* Visão Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Animal</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Sorteio</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ganho</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBets.slice(0, 10).map(bet => (
                        <TableRow key={bet.id}>
                          <TableCell>#{bet.id}</TableCell>
                          <TableCell>{format(new Date(bet.createdAt), "dd/MM/yy HH:mm")}</TableCell>
                          <TableCell>
                            {users?.find(u => u.id === bet.userId)?.username || 'Desconhecido'}
                          </TableCell>
                          <TableCell>
                            {animals?.find(a => a.id === bet.animalId)?.name || 'Desconhecido'}
                          </TableCell>
                          <TableCell>R$ {bet.amount.toLocaleString('pt-BR')}</TableCell>
                          <TableCell>
                            {draws?.find(d => d.id === bet.drawId)?.name || 'Desconhecido'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                bet.status === "pending" && "bg-orange-100 text-orange-800 border-orange-300",
                                bet.status === "won" && "bg-green-100 text-green-800 border-green-300",
                                bet.status === "lost" && "bg-red-100 text-red-800 border-red-300"
                              )}
                            >
                              {bet.status === "pending" && "Pendente"}
                              {bet.status === "won" && "Ganhou"}
                              {bet.status === "lost" && "Perdeu"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {bet.status === "won" && bet.winAmount 
                              ? `R$ ${bet.winAmount.toLocaleString('pt-BR')}` 
                              : "-"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Visão Mobile */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filteredBets.slice(0, 10).map(bet => (
                    <div key={bet.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-sm text-gray-500">#{bet.id} • {format(new Date(bet.createdAt), "dd/MM/yy HH:mm")}</div>
                          <div className="font-medium mt-1">
                            {users?.find(u => u.id === bet.userId)?.username || 'Desconhecido'}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            bet.status === "pending" && "bg-orange-100 text-orange-800 border-orange-300",
                            bet.status === "won" && "bg-green-100 text-green-800 border-green-300",
                            bet.status === "lost" && "bg-red-100 text-red-800 border-red-300"
                          )}
                        >
                          {bet.status === "pending" && "Pendente"}
                          {bet.status === "won" && "Ganhou"}
                          {bet.status === "lost" && "Perdeu"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-gray-500">Animal:</div>
                        <div className="text-right font-medium">
                          {animals?.find(a => a.id === bet.animalId)?.name || 'Desconhecido'}
                        </div>
                        
                        <div className="text-gray-500">Valor:</div>
                        <div className="text-right font-medium">
                          R$ {bet.amount.toLocaleString('pt-BR')}
                        </div>
                        
                        <div className="text-gray-500">Sorteio:</div>
                        <div className="text-right font-medium">
                          {draws?.find(d => d.id === bet.drawId)?.name || 'Desconhecido'}
                        </div>
                        
                        {bet.status === "won" && bet.winAmount && (
                          <>
                            <div className="text-gray-500">Ganho:</div>
                            <div className="text-right font-medium text-green-600">
                              R$ {bet.winAmount.toLocaleString('pt-BR')}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredBets.length > 10 && (
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    Mostrando 10 de {filteredBets.length} apostas
                  </div>
                )}
                
                {filteredBets.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    Nenhuma aposta encontrada para os filtros selecionados.
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="distribution">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Distribuição por Animal</h3>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                </div>
                
                {/* Visão Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Animal</TableHead>
                        <TableHead>Apostas</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead className="text-right">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {betsByAnimal.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{animals?.find(a => a.id === item.id)?.group || '?'}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.count}</TableCell>
                          <TableCell>R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{item.percentage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Visão Mobile */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {betsByAnimal.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 rounded-md w-8 h-8 flex items-center justify-center text-primary font-bold">
                            {animals?.find(a => a.id === item.id)?.group || '?'}
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {item.percentage}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Apostas:</div>
                        <div className="text-right font-medium">{item.count}</div>
                        <div className="text-gray-500">Valor Total:</div>
                        <div className="text-right font-medium">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}