import React, { useEffect, useState } from 'react';
import { DepositDialog } from './deposit-dialog';

// Componente isolado que renderiza apenas um diálogo de depósito
export function DirectDepositDialog() {
  // Iniciar com o diálogo fechado
  const [isOpen, setIsOpen] = useState(false);

  // Usar localStorage para detectar quando foi solicitado abrir o diálogo
  useEffect(() => {
    // Função para verificar se há uma solicitação para abrir o diálogo
    const checkOpenDepositRequest = () => {
      const openDepositRequested = localStorage.getItem('open_deposit_dialog');
      if (openDepositRequested === 'true') {
        // Primeiro, disparar um evento para fechar qualquer outro diálogo
        try {
          window.dispatchEvent(new CustomEvent('close-all-dialogs'));
          console.log("🧹 Fechando todos os diálogos antes de abrir o depósito");
        } catch (e) {
          console.error("Erro ao emitir evento de fechamento:", e);
        }
        
        // Pequeno atraso para garantir que outros diálogos tiveram tempo de fechar
        setTimeout(() => {
          setIsOpen(true);
          console.log("💰 Diálogo de depósito sendo aberto");
        }, 50);
        
        // Limpar o flag imediatamente para evitar aberturas indesejadas
        localStorage.removeItem('open_deposit_dialog');
      }
    };
    
    // Verificar imediatamente
    checkOpenDepositRequest();
    
    // Configurar um ouvinte de eventos para capturar solicitações futuras
    const handleOpenDepositEvent = () => {
      checkOpenDepositRequest();
    };
    
    // Adicionar ouvinte de evento personalizado
    window.addEventListener('open-deposit-dialog', handleOpenDepositEvent);
    
    // Limpar ouvinte ao desmontar componente
    return () => {
      window.removeEventListener('open-deposit-dialog', handleOpenDepositEvent);
    };
  }, []);

  // Controlar a mudança de estado do diálogo
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    // Se o diálogo está sendo aberto, notificar outros componentes
    if (open) {
      try {
        window.dispatchEvent(new CustomEvent('deposit-dialog-opened'));
        console.log("📣 Notificando abertura do diálogo de depósito");
      } catch (e) {
        console.error("Erro ao emitir evento de abertura:", e);
      }
    }
  };

  return (
    <DepositDialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
      renderAsButton={false}
    />
  );
}

// Função auxiliar para solicitar a abertura do diálogo de depósito
export function requestOpenDepositDialog() {
  // Fechar TODOS os diálogos existentes primeiro
  // Enviando um evento de cancelamento/fechamento global
  try {
    const closeAllDialogs = new CustomEvent('close-all-dialogs');
    window.dispatchEvent(closeAllDialogs);
    console.log("🚪 Enviado evento para fechar todos os diálogos");
    
    // Resetar qualquer formulário aberto
    document.querySelectorAll('form').forEach(form => {
      try {
        if (typeof form.reset === 'function') {
          form.reset();
        }
      } catch (e) {
        console.error("Erro ao resetar formulário:", e);
      }
    });
    
    // Tentar fechar diálogos por seletores comuns
    document.querySelectorAll('[role="dialog"], .dialog, .modal').forEach(dialog => {
      try {
        (dialog as HTMLElement).style.display = 'none';
      } catch (e) {
        console.error("Erro ao esconder diálogo:", e);
      }
    });
  } catch (err) {
    console.error("Erro ao limpar diálogos:", err);
  }
  
  // Pequeno atraso para garantir que tudo foi fechado
  setTimeout(() => {
    // Usar localStorage como mecanismo de comunicação
    localStorage.setItem('open_deposit_dialog', 'true');
    
    // Disparar um evento personalizado para notificar componentes
    const event = new CustomEvent('open-deposit-dialog');
    window.dispatchEvent(event);
    
    console.log("🏦 Solicitação para abrir diálogo de depósito enviada via localStorage");
  }, 200);
}