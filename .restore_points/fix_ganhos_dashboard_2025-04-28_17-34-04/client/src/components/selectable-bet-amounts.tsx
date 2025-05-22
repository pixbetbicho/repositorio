import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SelectableBetAmountsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SelectableBetAmounts({
  value,
  onChange,
  className = "",
}: SelectableBetAmountsProps) {
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
          variant={value === preset.value ? "default" : "outline"}
          className={cn(
            "px-3 py-2 h-auto text-sm",
            value === preset.value 
              ? "bg-primary text-white" 
              : "bg-white hover:bg-gray-50"
          )}
          onClick={() => onChange(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}