import React from "react";
import { Button } from "@/components/ui/button";
import { Delete, ArrowLeft } from "lucide-react";

export interface NumericKeyboardProps {
  onKeyPress: (value: string) => void;
  showDecimal?: boolean;
}

export function NumericKeyboard({ onKeyPress, showDecimal = false }: NumericKeyboardProps) {
  const handleKeyPress = (value: string) => {
    onKeyPress(value);
  };

  return (
    <div className="grid grid-cols-3 gap-1">
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("1")}
      >
        1
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("2")}
      >
        2
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("3")}
      >
        3
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("4")}
      >
        4
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("5")}
      >
        5
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("6")}
      >
        6
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("7")}
      >
        7
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("8")}
      >
        8
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("9")}
      >
        9
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("C")}
      >
        C
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("0")}
      >
        0
      </Button>
      <Button
        type="button"
        variant="outline"
        className="text-lg font-semibold h-12"
        onClick={() => handleKeyPress("←")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      {showDecimal && (
        <Button
          type="button"
          variant="outline"
          className="text-lg font-semibold h-12 col-span-3 mt-1"
          onClick={() => handleKeyPress(",")}
        >
          ,
        </Button>
      )}
    </div>
  );
}