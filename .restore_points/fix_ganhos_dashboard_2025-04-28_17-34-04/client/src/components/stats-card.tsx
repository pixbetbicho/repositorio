import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Draw } from "@/types";
import { 
  GamepadIcon, 
  Wallet, 
  ArrowDownToLine, 
  History, 
  Settings,
  Clock
} from "lucide-react";

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
          <GamepadIcon className="h-5 w-5 mr-2 text-primary" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Botões principais */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            variant="default"
            className="flex flex-col h-[100px] items-center justify-center p-3 bg-primary rounded-xl shadow-md text-white font-medium transition-all duration-200 hover:shadow-lg hover:brightness-110"
            onClick={onBet}
          >
            <div className="bg-white/20 rounded-full p-3 mb-2">
              <GamepadIcon className="h-6 w-6" />
            </div>
            <span>Fazer Aposta</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col h-[100px] items-center justify-center p-3 bg-green-500 text-white rounded-xl shadow-md font-medium border-0 transition-all duration-200 hover:shadow-lg hover:brightness-110"
            onClick={onDeposit}
          >
            <div className="bg-white/20 rounded-full p-3 mb-2">
              <Wallet className="h-6 w-6" />
            </div>
            <span>Depositar</span>
          </Button>
        </div>
        
        {/* Botões secundários */}
        <div className="grid grid-cols-3 gap-2">
          <ActionButton
            icon={<ArrowDownToLine className="h-4 w-4 text-blue-600" />}
            label="Sacar"
            onClick={onWithdraw}
          />
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
