import { 
  Wallet, 
  BarChart3, 
  Award,
  DollarSign,
  Coins,
  Trophy
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface UserStatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function UserStatsCard({ icon, title, value }: UserStatsCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0">
        <div className="flex flex-col h-full">
          <div className="bg-gradient-to-r from-primary/80 to-primary p-3 text-white">
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-3">
                {icon}
              </div>
              <div className="text-sm font-medium">{title}</div>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center">
            <div className="text-2xl font-bold text-gray-800">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface UserStatsProps {
  totalBets?: number;
  totalBetAmount?: number;
  totalWinnings?: number;
  isLoading?: boolean;
}

export function UserStats({ 
  totalBets = 0, 
  totalBetAmount = 0, 
  totalWinnings = 0,
  isLoading = false
}: UserStatsProps) {
  const { user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="order-2 lg:order-3 lg:col-span-1">
        <Skeleton className="h-[150px] w-full rounded-xl" />
      </div>
    );
  }
  
  // Cartão único com estatísticas detalhadas
  return (
    <div className="order-2 lg:order-3 lg:col-span-1">
      <Card className="overflow-hidden border-none shadow-md h-full">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
            <h3 className="font-bold flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Estatísticas
            </h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex items-center border-b border-gray-100 pb-3">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <Coins className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-gray-500 text-sm">Saldo disponível</div>
                <div className="text-lg font-bold text-gray-800">R$ {user?.balance?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            
            <div className="flex items-center border-b border-gray-100 pb-3">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-gray-500 text-sm">Apostas realizadas</div>
                <div className="text-lg font-bold text-gray-800">{totalBets.toString()}</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="bg-amber-100 p-2 rounded-full mr-3">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="text-gray-500 text-sm">Total ganho</div>
                <div className="text-lg font-bold text-green-600">R$ {totalWinnings.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
