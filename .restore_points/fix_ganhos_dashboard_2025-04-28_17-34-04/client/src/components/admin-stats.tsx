import { StatsCardProps } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

function StatsCard({ icon, title, value, bgColor, iconColor }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className={`${bgColor} p-3 rounded-full mr-4`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AdminStatsProps {
  activeUsers: number;
  todayRevenue: number;
  todayBets: number;
  totalPaidOut: number;
}

export function AdminStats({ 
  activeUsers, 
  todayRevenue, 
  todayBets, 
  totalPaidOut 
}: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatsCard
        icon={<span className="text-xl">👥</span>}
        title="Usuários Ativos"
        value={activeUsers}
        bgColor="bg-primary bg-opacity-20"
        iconColor="text-primary"
      />
      <StatsCard
        icon={<span className="text-xl">💰</span>}
        title="Receita Hoje"
        value={`R$ ${todayRevenue.toFixed(2)}`}
        bgColor="bg-secondary bg-opacity-20"
        iconColor="text-secondary"
      />
      <StatsCard
        icon={<span className="text-xl">🎟️</span>}
        title="Apostas Hoje"
        value={todayBets}
        bgColor="bg-blue-100"
        iconColor="text-blue-600"
      />
      <StatsCard
        icon={<span className="text-xl">🏆</span>}
        title="Prêmios Pagos"
        value={`R$ ${totalPaidOut.toFixed(2)}`}
        bgColor="bg-green-100"
        iconColor="text-green-600"
      />
    </div>
  );
}
