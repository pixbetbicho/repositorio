import { useEffect, useState } from "react";
import { PromotionalBanner } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

export function PromotionalBannerDialog() {
  const [open, setOpen] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
  // Buscar banners de login apenas quando o componente montar
  const { data: banners = [] } = useQuery<PromotionalBanner[]>({
    queryKey: ['/api/login-banners'],
    enabled: true,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Abrir o diálogo automaticamente apenas quando houver banners
  useEffect(() => {
    if (banners.length > 0) {
      setOpen(true);
    }
  }, [banners]);

  // Navegar para o próximo banner
  const nextBanner = () => {
    if (currentBannerIndex < banners.length - 1) {
      setCurrentBannerIndex(prev => prev + 1);
    } else {
      // Fechar o diálogo quando chegar ao último banner
      setOpen(false);
    }
  };

  // Não renderizar nada se não houver banners ou o diálogo estiver fechado
  if (banners.length === 0 || !open) return null;
  
  const currentBanner = banners[currentBannerIndex];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0 bg-primary/5">
          <DialogTitle className="flex justify-between items-center">
            <span>{currentBanner.title}</span>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-hidden">
          {currentBanner.linkUrl ? (
            <a 
              href={currentBanner.linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <img 
                src={currentBanner.imageUrl} 
                alt={currentBanner.title}
                className="w-full object-cover cursor-pointer"
              />
            </a>
          ) : (
            <img 
              src={currentBanner.imageUrl} 
              alt={currentBanner.title}
              className="w-full object-cover"
            />
          )}
        </div>
        
        <DialogFooter className="p-4 pt-2 flex flex-row justify-between">
          <div className="flex space-x-1">
            {banners.map((_, index) => (
              <div 
                key={index} 
                className={`h-2 w-2 rounded-full ${
                  index === currentBannerIndex ? 'bg-primary' : 'bg-primary/30'
                }`}
              />
            ))}
          </div>
          
          <div className="flex space-x-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Fechar
              </Button>
            </DialogClose>
            
            {currentBannerIndex < banners.length - 1 && (
              <Button variant="default" size="sm" onClick={nextBanner}>
                Próximo
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}