// user-bet-form.tsx - Componente adaptador para MobileBetWizardNew
import { useQuery } from "@tanstack/react-query";
import { Animal, Draw, GameMode } from "@/types";
import { MobileBetWizardNew } from "@/components/mobile-bet-wizard-new";
import { Skeleton } from "@/components/ui/skeleton";

interface UserBetFormProps {
  onComplete: () => void;
}

export function UserBetForm({ onComplete }: UserBetFormProps) {
  // Buscar dados necessários para o componente de apostas
  const { data: animals = [], isLoading: isLoadingAnimals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: upcomingDraws = [], isLoading: isLoadingDraws } = useQuery<Draw[]>({
    queryKey: ["/api/draws/upcoming"],
  });

  const { data: gameModes = [], isLoading: isLoadingGameModes } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });

  // Buscar configurações do sistema
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/system-settings"],
  });

  const isLoading = isLoadingAnimals || isLoadingDraws || isLoadingGameModes || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <p className="text-center text-lg font-medium mb-4">Carregando dados de apostas...</p>
        <div className="space-y-3 w-full">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <MobileBetWizardNew
      draws={upcomingDraws}
      animals={animals}
      gameModes={gameModes}
      systemSettings={systemSettings}
      inDialog={true}
      onComplete={onComplete}
    />
  );
}
