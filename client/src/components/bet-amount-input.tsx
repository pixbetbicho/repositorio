import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { BetAmountPresets } from "./bet-amount-presets";
import { Label } from "@/components/ui/label";
import { formatCurrency, parseMoneyValue } from "@/lib/utils";

interface BetAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  label?: string;
  className?: string;
}

export function BetAmountInput({
  value,
  onChange,
  min,
  max,
  label = "Valor da aposta",
  className = ""
}: BetAmountInputProps) {
  const [focused, setFocused] = useState(false);
  
  // Função para lidar com a mudança de input direta
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  // Função para lidar com a seleção dos valores pré-definidos
  const handlePresetSelect = (presetValue: string) => {
    console.log("Preset selecionado:", presetValue);
    onChange(presetValue);
  };
  
  // Para exibição, usamos o valor formatado quando não está em foco
  const displayValue = focused ? value : (value ? formatCurrency(value) : "");
  
  return (
    <div className={className}>
      <Label htmlFor="bet-amount" className="block text-sm text-gray-500 mb-1">
        {label}
      </Label>
      <div className="space-y-2">
        <Input
          id="bet-amount"
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="0,00"
          inputMode="none" // Desativar teclado nativo no mobile
          readOnly={true} // Usamos o teclado virtual em vez do teclado nativo
          min={min}
          max={max}
        />
        
        <BetAmountPresets 
          onSelect={handlePresetSelect}
          className="mt-2"
        />
      </div>
    </div>
  );
}