// bet-wizard-dialog.tsx
// Diálogo completamente reescrito para resolver os problemas de acessibilidade
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileBetWizardNew } from "@/components/mobile-bet-wizard-new";
import { Animal, Draw, GameMode } from "@/types";

interface BetWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BetWizardDialog({ open, onOpenChange }: BetWizardDialogProps) {
  console.log("BetWizardDialog renderizado, open=", open);

  // Buscar dados necessários para o componente de apostas
  const { data: animals, isLoading: isLoadingAnimals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: upcomingDraws, isLoading: isLoadingDraws } = useQuery<Draw[]>({
    queryKey: ["/api/draws/upcoming"],
  });

  const { data: gameModes, isLoading: isLoadingGameModes } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });

  // Usando o endpoint público system-settings em vez do admin/settings
  const { data: systemSettings } = useQuery<{
    maxBetAmount: number;
    maxPayout: number;
    minBetAmount: number;
    defaultBetAmount: number;
    mainColor: string;
    secondaryColor: string;
    accentColor: string;
    allowUserRegistration: boolean;
    allowDeposits: boolean;
    allowWithdrawals: boolean;
    maintenanceMode: boolean;
  }>({
    queryKey: ["/api/system-settings"],
  });

  // Estado para controlar a visibilidade do componente de apostas
  const [isReady, setIsReady] = useState(false);
  
  // Verificar quando os dados estão prontos
  useEffect(() => {
    if (animals && upcomingDraws && gameModes && systemSettings) {
      setIsReady(true);
      console.log("Dados prontos para o componente de apostas");
    }
  }, [animals, upcomingDraws, gameModes, systemSettings]);

  // Handler para quando uma aposta é concluída
  const handleComplete = () => {
    console.log("Aposta concluída, fechando diálogo");
    onOpenChange(false); // Fechar o diálogo quando a aposta for concluída
  };

  if (isLoadingAnimals || isLoadingDraws || isLoadingGameModes) {
    console.log("Carregando dados para o diálogo de apostas");
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95%] max-w-md">
          <DialogHeader>
            <DialogTitle>Fazer Aposta</DialogTitle>
            <DialogDescription>Carregando dados...</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Renderização completa do componente
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-md p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Fazer Aposta</DialogTitle>
          <DialogDescription>Escolha sua aposta</DialogDescription>
        </DialogHeader>
        {isReady && (
          <MobileBetWizardNew
            draws={upcomingDraws || []}
            animals={animals || []}
            gameModes={gameModes || []}
            systemSettings={systemSettings}
            inDialog={true} // Indica que está sendo usado dentro de um diálogo
            onComplete={handleComplete} // Callback para quando a aposta for concluída
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
