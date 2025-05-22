import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Settings, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenanceModalProps {
  isOpen: boolean;
  siteName?: string;
  onClose?: () => void;
}

export function MaintenanceModal({ 
  isOpen, 
  siteName = "Jogo do Bicho",
  onClose 
}: MaintenanceModalProps) {
  
  return (
    <AlertDialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open && onClose) {
          onClose();
        }
      }}
    >
      <AlertDialogContent className="max-w-md">
        <div className="absolute right-4 top-4">
          <Button
            variant="ghost"
            className="h-6 w-6 p-0 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <Wrench className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <AlertDialogTitle className="text-xl text-center">
            Sistema em Manutenção
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            <div className="mb-4">
              {siteName} está temporariamente indisponível enquanto realizamos melhorias no sistema.
            </div>
            <div className="flex items-center justify-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-md">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">Tente novamente mais tarde</span>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Pedimos desculpas pelo inconveniente. Nossa equipe está trabalhando para voltar o mais rápido possível.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-center gap-4">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Settings className="h-4 w-4" />
            <span>Manutenção programada</span>
          </div>
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}