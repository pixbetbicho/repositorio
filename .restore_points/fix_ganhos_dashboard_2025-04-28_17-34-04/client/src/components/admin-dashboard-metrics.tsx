import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { User, Bet, Animal, Draw } from "@/types";
import { 
  BarChart, 
  Bar, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from "recharts";
import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', 
  '#5DADE2', '#45B39D', '#F4D03F', '#EB984E', '#AF7AC5'
];

export function AdminDashboardMetrics() {
  const [timeRange, setTimeRange] = useState<string>("7d");
  
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Atualizando para a nova estrutura de dados com paginação com parâmetros
  const { data: betsData } = useQuery<{ data: Bet[], meta: { total: number, page: number, pageSize: number, totalPages: number } }>({
    queryKey: ["/api/admin/bets", { page: 1, pageSize: 200, sortOrder: "desc" }],
  });
  
  // Criando uma referência para os dados das apostas para manter compatibilidade com o código existente
  const bets = betsData?.data || [];

  const { data: animals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: draws } = useQuery<Draw[]>({
    queryKey: ["/api/draws"],
  });

  const { data: popularAnimals } = useQuery<{animalId: number, count: number}[]>({
    queryKey: ["/api/admin/stats/popular"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAnimalName = (animalId: number) => {
    if (!animals) return "-";
    const animal = animals.find(a => a.id === animalId);
    return animal ? `${animal.name}` : "-";
  };

  const getAnimalGroup = (animalId: number) => {
    if (!animals) return "-";
    const animal = animals.find(a => a.id === animalId);
    return animal ? animal.group : 0;
  };

  // Get filtered data based on time range
  const getFilteredData = () => {
    if (!bets) return [];
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (timeRange) {
      case "7d":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case "all":
        return bets;
      default:
        cutoffDate.setDate(now.getDate() - 7);
    }
    
    return bets.filter(bet => new Date(bet.createdAt) >= cutoffDate);
  };

  // Define a type for the chart data
  type AnimalChartData = {
    name: string;
    group: number;
    count: number;
    amount: number;
  };

  // Calculate bet data by animal
  const getBetsByAnimal = (): AnimalChartData[] => {
    const filteredBets = getFilteredData();
    
    const animalCounts: Record<number, { count: number, amount: number }> = {};
    
    filteredBets.forEach(bet => {
      if (!animalCounts[bet.animalId]) {
        animalCounts[bet.animalId] = { count: 0, amount: 0 };
      }
      animalCounts[bet.animalId].count += 1;
      animalCounts[bet.animalId].amount += bet.amount;
    });
    
    return Object.entries(animalCounts)
      .map(([animalId, data]) => ({
        name: getAnimalName(parseInt(animalId)),
        group: Number(getAnimalGroup(parseInt(animalId))),
        count: data.count,
        amount: data.amount
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  };

  // Calculate daily bet totals for line chart
  const getDailyBetTotals = () => {
    const filteredBets = getFilteredData();
    
    const dailyTotals: Record<string, { date: string, count: number, amount: number, revenue: number }> = {};
    
    filteredBets.forEach(bet => {
      const date = new Date(bet.createdAt).toISOString().split('T')[0];
      
      if (!dailyTotals[date]) {
        dailyTotals[date] = { date, count: 0, amount: 0, revenue: 0 };
      }
      
      dailyTotals[date].count += 1;
      dailyTotals[date].amount += bet.amount;
      
      // Calculate revenue (amount bet minus winnings paid)
      if (bet.status === "won" && bet.winAmount) {
        dailyTotals[date].revenue += bet.amount - bet.winAmount;
      } else {
        dailyTotals[date].revenue += bet.amount;
      }
    });
    
    return Object.values(dailyTotals)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Calculate bet type distribution
  const getBetTypeDistribution = () => {
    const filteredBets = getFilteredData();
    
    const typeCounts: Record<string, number> = {
      simple: 0,
      head: 0,
      group: 0
    };
    
    filteredBets.forEach(bet => {
      typeCounts[bet.type] += 1;
    });
    
    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type === "simple" ? "Simples" : type === "head" ? "Cabeça" : "Grupo",
      value: count
    }));
  };

  // Calculate total metrics
  const getTotalMetrics = () => {
    const filteredBets = getFilteredData();
    
    const totalBets = filteredBets.length;
    const totalBetAmount = filteredBets.reduce((sum, bet) => sum + bet.amount, 0);
    
    const winningBets = filteredBets.filter(bet => bet.status === "won");
    const totalWinnings = winningBets.reduce((sum, bet) => sum + (bet.winAmount || 0), 0);
    
    const revenue = totalBetAmount - totalWinnings;
    const winRate = totalBets > 0 ? (winningBets.length / totalBets * 100) : 0;
    
    return {
      totalBets,
      totalBetAmount,
      totalWinnings,
      revenue,
      winRate
    };
  };

  const betsByAnimal = getBetsByAnimal();
  const dailyBetTotals = getDailyBetTotals();
  const betTypeDistribution = getBetTypeDistribution();
  const metrics = getTotalMetrics();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes("$") ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Dashboard Administrativo</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{metrics.totalBets}</div>
            <p className="text-muted-foreground">Total de apostas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalBetAmount)}</div>
            <p className="text-muted-foreground">Volume apostado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(metrics.revenue)}</div>
            <p className="text-muted-foreground">Receita líquida</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</div>
            <p className="text-muted-foreground">Taxa de vitória</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with different charts */}
      <Tabs defaultValue="daily">
        <TabsList className="w-full flex flex-wrap">
          <TabsTrigger value="daily" className="flex-1 min-w-[100px]">
            <span className="hidden sm:inline">Diário</span>
            <span className="sm:hidden text-xs">Diário</span>
          </TabsTrigger>
          <TabsTrigger value="animals" className="flex-1 min-w-[100px]">
            <span className="hidden sm:inline">Animais</span>
            <span className="sm:hidden text-xs">Animais</span>
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex-1 min-w-[100px]">
            <span className="hidden sm:inline">Tipos de Aposta</span>
            <span className="sm:hidden text-xs">Tipos</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex-1 min-w-[100px]">
            <span className="hidden sm:inline">Grupos Populares</span>
            <span className="sm:hidden text-xs">Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="winloss" className="flex-1 min-w-[100px]">
            <span className="hidden sm:inline">Ganhos/Perdas</span>
            <span className="sm:hidden text-xs">G/P</span>
          </TabsTrigger>
        </TabsList>

        {/* Daily Metrics Chart */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Métricas Diárias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyBetTotals}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        // Em dispositivos móveis, mostrar formato mais curto
                        if (window.innerWidth < 640) {
                          const parts = value.split('-');
                          return `${parts[1]}/${parts[2]}`;
                        }
                        return value;
                      }}
                    />
                    <YAxis 
                      yAxisId="left"
                      width={35}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      width={45}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      iconSize={10}
                      wrapperStyle={{ fontSize: '10px' }}
                      layout={window.innerWidth < 640 ? "vertical" : "horizontal"}
                      verticalAlign={window.innerWidth < 640 ? "bottom" : "top"}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      name="Apostas"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="amount"
                      name="Volume"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      name="Receita"
                      stroke="#ff7300"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Popular Animals Chart */}
        <TabsContent value="animals">
          <Card>
            <CardHeader>
              <CardTitle>Animais Mais Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={betsByAnimal}
                    margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    layout={window.innerWidth < 640 ? "vertical" : "horizontal"}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    {window.innerWidth < 640 ? (
                      // Layout vertical para mobile
                      <>
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis 
                          dataKey="name" 
                          type="category"
                          tick={{ fontSize: 10 }}
                          width={65}
                        />
                      </>
                    ) : (
                      // Layout horizontal para desktop
                      <>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis 
                          yAxisId="left" 
                          tick={{ fontSize: 10 }}
                          width={35}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right" 
                          tick={{ fontSize: 10 }}
                          width={45}
                          tickFormatter={(value) => `R$${value}`}
                        />
                      </>
                    )}
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      iconSize={10}
                      wrapperStyle={{ fontSize: '10px' }}
                    />
                    {window.innerWidth < 640 ? (
                      // Barras para layout vertical em mobile
                      <Bar
                        dataKey="count"
                        name="Apostas"
                        fill="#8884d8"
                        label={{ position: 'right', fontSize: 10 }}
                      />
                    ) : (
                      // Barras para layout horizontal em desktop
                      <>
                        <Bar
                          yAxisId="left"
                          dataKey="count"
                          name="Número de Apostas"
                          fill="#8884d8"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="amount"
                          name="$ Volume"
                          fill="#82ca9d"
                        />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bet Type Distribution */}
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo de Aposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px] flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={betTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={window.innerWidth >= 640}
                      label={window.innerWidth < 640 ? null : ({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={window.innerWidth < 640 ? 80 : 140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {betTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} apostas`, "Quantidade"]} 
                    />
                    <Legend 
                      iconSize={10} 
                      layout={window.innerWidth < 640 ? "vertical" : "horizontal"}
                      verticalAlign="bottom" 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Popular Groups */}
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Grupos Mais Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={betsByAnimal.sort((a, b) => Number(a.group) - Number(b.group))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="group" 
                      tickFormatter={(value) => `Grupo ${value}`}
                      tick={{ fontSize: 10 }}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      iconSize={10}
                      wrapperStyle={{ fontSize: '10px' }}
                    />
                    <Bar
                      dataKey="count"
                      name="Apostas"
                      fill="#0088FE"
                      label={window.innerWidth >= 640 ? { position: 'right', fontSize: 10 } : null}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Winnings and Losses */}
        <TabsContent value="winloss">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Ganhos e Perdas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">
                      Resumo de Apostas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Total de apostas:</dt>
                        <dd className="text-sm text-gray-900">{metrics.totalBets}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Apostas ganhas:</dt>
                        <dd className="text-sm text-green-600 font-medium">
                          {getFilteredData().filter(bet => bet.status === "won").length}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Apostas perdidas:</dt>
                        <dd className="text-sm text-red-600 font-medium">
                          {getFilteredData().filter(bet => bet.status === "lost").length}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Apostas pendentes:</dt>
                        <dd className="text-sm text-yellow-600 font-medium">
                          {getFilteredData().filter(bet => bet.status === "pending").length}
                        </dd>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between font-medium">
                          <dt className="text-gray-500">Taxa de retorno:</dt>
                          <dd className="text-gray-900">
                            {(metrics.totalBetAmount > 0 
                              ? (metrics.totalWinnings / metrics.totalBetAmount * 100).toFixed(2) 
                              : 0)}%
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">
                      Resumo Financeiro
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Total apostado:</dt>
                        <dd className="text-sm text-gray-900">{formatCurrency(metrics.totalBetAmount)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Total pago em prêmios:</dt>
                        <dd className="text-sm text-red-600 font-medium">
                          {formatCurrency(metrics.totalWinnings)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Saldo (Receita):</dt>
                        <dd className={`text-sm font-medium ${metrics.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(metrics.revenue)}
                        </dd>
                      </div>
                      <div className="pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500 mb-2">
                          Pagamentos automáticos ao vencer:
                        </div>
                        <div className="flex items-center">
                          <div className="h-3 bg-green-100 rounded-full flex-1">
                            <div 
                              className="h-3 bg-green-500 rounded-full" 
                              style={{ width: `${metrics.winRate}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-500">{metrics.winRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">
                      Distribuição de Ganhos e Perdas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Apostas ganhas', value: getFilteredData().filter(bet => bet.status === "won").length },
                              { name: 'Apostas perdidas', value: getFilteredData().filter(bet => bet.status === "lost").length },
                              { name: 'Apostas pendentes', value: getFilteredData().filter(bet => bet.status === "pending").length }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#4ade80" /> {/* green-400 */}
                            <Cell fill="#f87171" /> {/* red-400 */}
                            <Cell fill="#fcd34d" /> {/* yellow-300 */}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}