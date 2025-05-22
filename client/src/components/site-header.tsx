import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Interface que reflete a estrutura das configurações de sistema relevantes para o header da página
interface SiteSettings {
  siteName?: string;
  siteDescription?: string;
  logoUrl?: string;
  faviconUrl?: string;
  // Outros campos do sistema
  maxBetAmount?: number;
  maxPayout?: number;
  mainColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  allowUserRegistration?: boolean;
  allowDeposits?: boolean;
  allowWithdrawals?: boolean;
  maintenanceMode?: boolean;
  autoApproveWithdrawals?: boolean;
  autoApproveWithdrawalLimit?: number;
}

export function SiteHeader() {
  // Buscar configurações do sistema - usando endpoint público
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['/api/settings'],
    // Não precisamos re-renderizar tão frequentemente para esses dados
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  useEffect(() => {
    if (settings) {
      // Atualizar título da página
      document.title = settings.siteName || 'Jogo do Bicho';
      
      // Atualizar descrição (meta tag)
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', settings.siteDescription || 'A melhor plataforma de apostas online');
      
      // Atualizar favicon
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.setAttribute('rel', 'icon');
        document.head.appendChild(favicon);
      }
      favicon.setAttribute('href', settings.faviconUrl || '/img/favicon.png');
      
      // Aplicar outras configurações que possam ser necessárias
      console.log('Site branding settings applied:', {
        title: settings.siteName,
        description: settings.siteDescription,
        logo: settings.logoUrl,
        favicon: settings.faviconUrl
      });
    }
  }, [settings]);

  // Este componente não renderiza nada visível
  return null;
}