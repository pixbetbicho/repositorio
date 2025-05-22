import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BetConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  betAmount: string; // Valor da aposta formatado
  potentialReturn: number; // Retorno potencial
  animalName: string;
  animalGroup: number;
  drawName: string;
  premioType: string;
  gameMode: string;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function BetConfirmationDialog({
  open,
  onOpenChange,
  betAmount,
  potentialReturn,
  animalName,
  animalGroup,
  drawName,
  premioType,
  gameMode,
  onConfirm,
  isSubmitting
}: BetConfirmationDialogProps) {
  // Converter tipo de prêmio para texto mais amigável
  const getPremioTypeText = (type: string) => {
    switch (type) {
      case "1": return "1º Prêmio";
      case "2": return "2º Prêmio";
      case "3": return "3º Prêmio";
      case "4": return "4º Prêmio";
      case "5": return "5º Prêmio";
      case "1-5": return "1º ao 5º Prêmio";
      default: return "1º Prêmio";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Finalizar Aposta</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-base font-medium">Valor da Aposta (R$)</div>
              <div className="mb-4 border p-3 rounded-md bg-gray-50">
                <span className="text-lg font-bold">R$ {betAmount}</span>
              </div>
              {/* Valores pré-definidos */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[0.5, 1, 2, 5, 10, 50].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="px-2 py-1 h-auto text-xs bg-white"
                    onClick={() => {
                      onOpenChange(false);
                      // Um pequeno atraso para fechar o diálogo atual antes de reabrir
                      setTimeout(() => {
                        document.querySelector('input[name="amount"]')?.setAttribute('value', value.toString());
                        // Forçar atualização do valor no formulário principal
                        const event = new Event('change', { bubbles: true });
                        document.querySelector('input[name="amount"]')?.dispatchEvent(event);
                      }, 100);
                    }}
                  >
                    R${value.toString().replace('.', ',')}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-md border border-green-100 mb-4">
              <div className="text-base font-medium text-green-800">Possível Retorno:</div>
              <div className="text-xl font-bold text-green-700">
                {formatCurrency(potentialReturn)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {premioType === "1-5" 
                  ? "Valor dividido entre os 5 prêmios" 
                  : `Valor apenas para o ${getPremioTypeText(premioType)}`}
              </div>
            </div>
            
            <div className="space-y-2 bg-gray-50 p-3 rounded-md">
              <div className="text-base font-medium">Resumo da Aposta:</div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <div className="text-gray-500">Modalidade:</div>
                <div className="font-medium text-right">{gameMode}</div>
                
                <div className="text-gray-500">Animal:</div>
                <div className="font-medium text-right">{animalName} (Grupo {animalGroup})</div>
                
                <div className="text-gray-500">Prêmio:</div>
                <div className="font-medium text-right">{getPremioTypeText(premioType)}</div>
                
                <div className="text-gray-500">Sorteio:</div>
                <div className="font-medium text-right">{drawName}</div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Voltar
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2">↻</span> Processando...
              </span>
            ) : (
              <span className="flex items-center">
                <Check className="mr-2 h-4 w-4" /> Apostar
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}