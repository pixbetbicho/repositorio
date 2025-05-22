import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// Função para converter cor hex para HSL
function hexToHSL(hex: string): string {
  // Remover o # se existir
  hex = hex.replace('#', '');
  
  // Converter hex para RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // acromático
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

// Função para gerar uma versão mais escura da cor
function getDarkerHexColor(hex: string): string {
  // Remover o # se existir
  hex = hex.replace('#', '');
  
  // Converter hex para RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Escurecer os valores (multiplicar por 0.8)
  r = Math.round(Math.max(0, r * 0.8));
  g = Math.round(Math.max(0, g * 0.8));
  b = Math.round(Math.max(0, b * 0.8));
  
  // Converter de volta para hex
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Interface para as configurações do sistema
interface SystemSettings {
  maxBetAmount: number;
  maxPayout: number;
  mainColor: string;
  secondaryColor: string;
  accentColor: string;
  allowUserRegistration: boolean;
  allowDeposits: boolean;
  allowWithdrawals: boolean;
  maintenanceMode: boolean;
}

// Componente de provedor de tema
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Buscar configurações do sistema
  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/admin/settings"],
  });

  // Aplicar cores do tema quando as configurações forem carregadas
  useEffect(() => {
    if (settings) {
      try {
        const doc = document.documentElement;
        
        // Converter cores hex para HSL e aplicar como variáveis CSS
        if (settings.mainColor) {
          const mainColorHSL = hexToHSL(settings.mainColor);
          doc.style.setProperty('--primary', mainColorHSL);
          
          // Gerar versão mais escura para hover
          const darkerMainColor = getDarkerHexColor(settings.mainColor);
          const darkerMainColorHSL = hexToHSL(darkerMainColor);
          doc.style.setProperty('--primary-dark', darkerMainColorHSL);
          
          // Atualizar também a cor de destaque do anel
          doc.style.setProperty('--ring', mainColorHSL);
        }
        
        if (settings.secondaryColor) {
          const secondaryColorHSL = hexToHSL(settings.secondaryColor);
          doc.style.setProperty('--secondary', secondaryColorHSL);
        }
        
        if (settings.accentColor) {
          const accentColorHSL = hexToHSL(settings.accentColor);
          doc.style.setProperty('--accent', accentColorHSL);
        }
        
        console.log("Tema atualizado com as cores do sistema:", {
          primary: settings.mainColor,
          secondary: settings.secondaryColor,
          accent: settings.accentColor
        });
      } catch (error) {
        console.error("Erro ao aplicar cores do tema:", error);
      }
    }
  }, [settings]);

  return <>{children}</>;
}