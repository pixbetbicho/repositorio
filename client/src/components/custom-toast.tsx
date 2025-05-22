import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  title?: string;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastProps, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useCustomToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useCustomToast must be used within a ToastProvider');
  }
  return context;
};

export const CustomToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const Toast: React.FC<ToastProps & { onClose: () => void }> = ({
  message,
  type,
  duration = 3000,
  title,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Definir cores baseadas no tipo
  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div 
      className={`max-w-md w-full rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 flex`}
      style={{ opacity: 1, visibility: 'visible' }}
    >
      <div className={`${getBgColor()} w-2`}></div>
      <div className="flex-1 p-4 bg-white dark:bg-gray-800">
        <div className="flex justify-between items-start">
          <div>
            {title && <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>}
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{message}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
