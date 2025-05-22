import React from "react";
import { Button } from "@/components/ui/button";

interface BetAmountPresetsProps {
  onSelect: (value: string) => void;
  className?: string;
}

export function BetAmountPresets({
  onSelect,
  className = "",
}: BetAmountPresetsProps) {
  // Valores pré-definidos para apostas
  const presetValues = [
    { label: "R$0,50", value: "0,50" },
    { label: "R$1", value: "1,00" },
    { label: "R$2", value: "2,00" },
    { label: "R$5", value: "5,00" },
    { label: "R$10", value: "10,00" },
    { label: "R$50", value: "50,00" }
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {presetValues.map((preset) => (
        <Button
          key={preset.value}
          type="button"
          variant="outline"
          className="px-2 py-1 h-auto text-xs bg-white"
          onClick={() => onSelect(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}