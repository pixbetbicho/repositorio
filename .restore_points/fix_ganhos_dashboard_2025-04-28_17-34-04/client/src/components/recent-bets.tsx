import { useQuery } from "@tanstack/react-query";
import { BetWithDetails } from "@/types";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBetType } from "@/lib/utils";
import { ChevronLeft, ChevronRight, GamepadIcon } from "lucide-react";

export function RecentBets() {
  // Estado para controlar a paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Número de apostas por página
  
  // Consultando apostas com parâmetros de paginação
  const { data: betsData, isLoading } = useQuery<{
    data: BetWithDetails[],
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }
  }>({
    queryKey: ["/api/bets", { page: currentPage, pageSize: itemsPerPage, sortOrder: "desc" }],
  });
  
  // Criando referência para os dados das apostas
  const bets = betsData?.data || [];

  const renderStatus = (bet: BetWithDetails) => {
    if (bet.status === "pending") {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Aguardando resultado
        </Badge>
      );
    } else if (bet.status === "won") {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
          Ganhou R$ {bet.winAmount?.toFixed(2)}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
          Perdeu
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Últimas Apostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bets || bets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Últimas Apostas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-4">
            Você ainda não fez nenhuma aposta
          </p>
        </CardContent>
      </Card>
    );
  }

  // Ordenar apostas por data (mais recentes primeiro)
  const sortedBets = [...(bets || [])].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <GamepadIcon className="h-5 w-5 mr-2 text-primary" />
          Últimas Apostas
        </CardTitle>
        <CardDescription>
          Histórico das suas apostas recentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Visão Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Sorteio</TableHead>
                <TableHead>Jogo</TableHead>
                <TableHead>Prêmio</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Possível Ganho</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBets.map((bet) => (
                <TableRow key={bet.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(bet.createdAt), "dd/MM/yyyy - HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {bet.draw ? `${bet.draw.name} (${bet.draw.time})` : "Não informado"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {bet.type === 'group' && bet.animal ? (
                      <>Grupo {String(bet.animal.group).padStart(2, '0')} - {bet.animal.name}</>
                    ) : bet.type === 'group' && bet.betNumbers?.length ? (
                      <>{bet.gameMode?.name || "Modalidade"}: {bet.betNumbers[0]}</>
                    ) : bet.type === 'duque_grupo' ? (
                      <>Duque de Grupo {String(bet.animal?.group).padStart(2, '0')} - {bet.animal?.name}</>
                    ) : bet.type === 'thousand' ? (
                      <>Milhar: {bet.betNumbers?.join(', ') || 'Não informado'}</>
                    ) : bet.type === 'hundred' ? (
                      <>Centena: {bet.betNumbers?.join(', ') || 'Não informado'}</>
                    ) : bet.type === 'dozen' ? (
                      <>Dezena: {bet.betNumbers?.join(', ') || 'Não informado'}</>
                    ) : bet.betNumbers?.length ? (
                      <>{formatBetType(bet.type).name}: {bet.betNumbers.join(', ')}</>
                    ) : (
                      <>{formatBetType(bet.type).name}: Não informado</>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {bet.premioType === "1" && "1° Prêmio"}
                    {bet.premioType === "2" && "2° Prêmio"}
                    {bet.premioType === "3" && "3° Prêmio"}
                    {bet.premioType === "4" && "4° Prêmio"}
                    {bet.premioType === "5" && "5° Prêmio"}
                    {bet.premioType === "1-5" && "1° ao 5° Prêmio"}
                  </TableCell>
                  <TableCell>R$ {bet.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-emerald-600 font-medium">
                    {bet.potentialWinAmount ? `R$ ${(bet.potentialWinAmount).toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>{renderStatus(bet)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Visão Mobile (Cards) */}
        <div className="md:hidden space-y-4">
          {sortedBets.map((bet) => (
            <div 
              key={bet.id} 
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Cabeçalho com status colorido */}
              <div className={`flex justify-between items-center p-3 border-b ${
                bet.status === 'won' 
                  ? 'bg-green-50 border-green-100' 
                  : bet.status === 'pending' 
                  ? 'bg-yellow-50 border-yellow-100'
                  : 'bg-red-50 border-red-100'
              }`}>
                <div className="font-medium text-gray-800 flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    bet.status === 'won' 
                      ? 'bg-green-500' 
                      : bet.status === 'pending' 
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}></div>
                  {bet.type === 'group' && bet.animal ? (
                    <>Grupo {String(bet.animal.group).padStart(2, '0')} - {bet.animal.name}</>
                  ) : bet.type === 'group' && bet.betNumbers?.length ? (
                    <>{bet.gameMode?.name || "Modalidade"}: {bet.betNumbers[0]}</>
                  ) : bet.type === 'duque_grupo' ? (
                    <>Duque de Grupo {String(bet.animal?.group).padStart(2, '0')} - {bet.animal?.name}</>
                  ) : bet.betNumbers?.length ? (
                    <>{formatBetType(bet.type).name}: {bet.betNumbers.join(', ')}</>
                  ) : (
                    <>{formatBetType(bet.type).name}: Não informado</>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(bet.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                </div>
              </div>
              
              {/* Corpo com informações principais */}
              <div className="p-3">
                {/* Informação do sorteio */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="bg-primary/10 rounded-full p-1 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </span>
                    Sorteio
                  </div>
                  <div className="text-sm font-medium">
                    {bet.draw ? `${bet.draw.name} (${bet.draw.time})` : "Não informado"}
                  </div>
                </div>
                
                {/* Informação do prêmio */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-500 flex items-center">
                    <span className="bg-primary/10 rounded-full p-1 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <circle cx="12" cy="8" r="7"></circle>
                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                      </svg>
                    </span>
                    Prêmio
                  </div>
                  <div className="text-sm font-medium">
                    {bet.premioType === "1" && "1° Prêmio"}
                    {bet.premioType === "2" && "2° Prêmio"}
                    {bet.premioType === "3" && "3° Prêmio"}
                    {bet.premioType === "4" && "4° Prêmio"}
                    {bet.premioType === "5" && "5° Prêmio"}
                    {bet.premioType === "1-5" && "1° ao 5° Prêmio"}
                  </div>
                </div>
                
                {/* Valores */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 mb-1">Apostado</div>
                    <div className="text-sm font-semibold">R$ {bet.amount.toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500 mb-1">Possível Ganho</div>
                    <div className="text-sm font-semibold text-emerald-600">
                      {bet.potentialWinAmount ? `R$ ${(bet.potentialWinAmount).toFixed(2)}` : "-"}
                    </div>
                  </div>
                </div>
                
                {/* Status badge */}
                <div className="flex justify-end mt-1">
                  {renderStatus(bet)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      {/* Adicionar controles de paginação no rodapé */}
      {betsData?.meta && betsData.meta.totalPages > 1 && (
        <CardFooter className="flex justify-between items-center pt-2 pb-4 px-6">
          <div className="text-sm text-muted-foreground">
            Mostrando {bets.length} de {betsData.meta.total} apostas
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Página anterior</span>
            </Button>
            <div className="text-sm">
              Página {currentPage} de {betsData.meta.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, betsData.meta.totalPages))}
              disabled={currentPage === betsData.meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Próxima página</span>
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
