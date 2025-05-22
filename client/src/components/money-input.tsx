import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  id?: string;
  min?: string | number;
  max?: string | number;
  hidePresets?: boolean; // Flag para esconder os presets quando o componente pai já usa BetAmountPresets
}

export function MoneyInput({ 
  value, 
  onChange, 
  placeholder = "R$ 0,00", 
  className = "",
  onFocus,
  id,
  min,
  max,
  hidePresets = true, // Sempre esconder os presets, conforme solicitado pelo usuário
  ...props
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  
  // Função para formatar valor como moeda brasileira (quando não está em foco)
  const formatCurrency = (value: string): string => {
    if (!value) return "";
    
    // Verificar se já contém vírgula (valor decimal)
    if (value.includes(',')) {
      // Se tem vírgula, tratar como valor já formatado em reais
      // Remover caracteres não permitidos e manter apenas números e vírgula
      const cleanValue = value.replace(/[^\d,]/g, "");
      
      // Dividir em parte inteira e decimal
      const parts = cleanValue.split(',');
      const intPart = parts[0] || '0';
      const decPart = parts.length > 1 ? parts[1].substring(0, 2).padEnd(2, '0') : '00';
      
      // Formatar com separador de milhar
      const formattedIntPart = parseInt(intPart, 10).toLocaleString('pt-BR');
      
      // Retornar o valor formatado completo
      return `R$ ${formattedIntPart},${decPart}`;
    } else {
      // Se não tem vírgula, tratar como valor inteiro em reais (não centavos)
      const numericValue = value.replace(/\D/g, "");
      
      // Converter para número (mantendo como inteiro)
      const intValue = parseInt(numericValue, 10) || 0;
      
      // Formatar como moeda com 2 casas decimais
      return intValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  };

  // Handler para quando o input recebe foco
  const handleFocus = () => {
    setFocused(true);
    if (onFocus) onFocus();
  };
  
  // Handler para quando o input perde foco
  const handleBlur = () => {
    setFocused(false);
  };

  // Função para definir valores pré-definidos
  const setAmount = (amount: number) => {
    onChange(amount.toString());
  };

  // Renderizar o valor formatado ou bruto dependendo do estado de foco
  const displayValue = focused ? value : (value ? formatCurrency(value) : "");

  return (
    <div>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`pl-8 ${className}`}
          {...props}
        />
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">R$</span>
      </div>
      
      {/* Botões com valores pré-definidos para facilitar a seleção (ocultados quando hidePresets=true) */}
      {!hidePresets && (
        <div className="flex flex-wrap gap-2 mt-2">
          {[0.5, 1, 2, 5, 10, 50].map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="outline"
              size="sm"
              className="px-2 py-1 h-auto text-xs"
              onClick={() => setAmount(amount)}
            >
              R${amount.toString().replace('.', ',')}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}