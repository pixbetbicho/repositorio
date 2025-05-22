import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Draw } from "@/types";
import { 
  History, 
  Settings,
  Clock,
  Zap,
  LightbulbIcon
} from "lucide-react";
import { FaDog, FaKiwiBird, FaOtter } from "react-icons/fa";

export function UpcomingDrawsCard() {
  const { data: upcomingDraws, isLoading } = useQuery<Draw[]>({
    queryKey: ["/api/draws/upcoming"],
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-blue-50">
        <CardTitle className="text-lg flex items-center">
          <Clock className="h-5 w-5 mr-2 text-blue-600" />
          Próximos Sorteios
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 bg-gray-200 rounded-md"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingDraws && upcomingDraws.length > 0 ? (
              upcomingDraws.map((draw) => (
                <div
                  key={draw.id}
                  className="flex justify-between items-center p-3 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100/30 transition-colors shadow-sm"
                >
                  <div className="flex items-center">
                    <div className="bg-blue-500/10 p-2 rounded-full mr-3">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium">{draw.name}</span>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                    <span className="text-blue-700 font-semibold">{draw.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <div className="bg-blue-100/50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-7 w-7 text-blue-400" />
                </div>
                <p className="text-gray-600 font-medium">
                  Não há sorteios agendados
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Os próximos sorteios serão exibidos aqui
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      className="flex-1 flex flex-col items-center justify-center p-2 hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm h-[70px] transition-all duration-200 hover:border-primary/30 hover:shadow-md"
      onClick={onClick}
    >
      <div className="bg-primary/10 rounded-full p-1.5 mb-1">
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );
}

interface UserActionsCardProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onBet: () => void;
}

export function UserActionsCard({
  onDeposit,
  onWithdraw,
  onHistory,
  onSettings,
  onBet,
}: UserActionsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-primary/10">
        <CardTitle className="text-lg flex items-center">
          <Zap className="h-5 w-5 mr-2 text-primary" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Botão principal */}
        <div className="mb-4">
          <button
            onClick={onBet}
            className="w-full h-[120px] relative flex items-center justify-end overflow-hidden bg-gradient-to-r from-green-600 to-[#b0d525] rounded-xl shadow-lg border-2 border-[#b0d525] group hover:shadow-xl transition-all duration-300"
          >
            {/* Ícone animado na lateral */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-32 h-32 group-hover:scale-110 transition-all duration-500">
              <FaDog className="absolute h-20 w-20 text-[#b0d525] animate-bounce group-hover:rotate-12 transition-transform" />
              <FaKiwiBird className="absolute h-8 w-8 text-white opacity-20 -top-1 -right-2 animate-ping" />
            </div>
            
            {/* Texto com efeito de brilho */}
            <div className="mr-8 text-right">
              <span className="block text-xl font-bold text-white drop-shadow-md">
                Fazer Aposta
              </span>
              <span className="block text-sm text-white animate-pulse">
                Escolha seu bicho da sorte!
              </span>
            </div>
          </button>
        </div>
        
        {/* Botões secundários */}
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={<History className="h-4 w-4 text-purple-600" />}
            label="Histórico"
            onClick={onHistory}
          />
          <ActionButton
            icon={<Settings className="h-4 w-4 text-gray-600" />}
            label="Config"
            onClick={onSettings}
          />
        </div>
      </CardContent>
    </Card>
  );
}
