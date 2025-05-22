import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Layers,
  BarChart,
  Hash,
  Package
} from "lucide-react";

// Alterar o tipo para permitir que cada modalidade seja uma aba
type TabType = string;

interface GameMode {
  id: number;
  name: string;
  description: string;
  odds: number;
  active: boolean;
}

interface BetTabProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  gameModes?: GameMode[];
}

// Mapeamento de ícones para as categorias gerais
const categoryIcons: Record<string, JSX.Element> = {
  "grupo": <Layers className="w-4 h-4 mr-2" />,
  "dezena": <BarChart className="w-4 h-4 mr-2" />,
  "centena": <Hash className="w-4 h-4 mr-2" />,
  "milhar": <DollarSign className="w-4 h-4 mr-2" />,
  "passe": <Package className="w-4 h-4 mr-2" />
};

// Função para obter o ícone apropriado para cada modalidade
function getIconForMode(modeName: string): JSX.Element {
  const lowerName = modeName.toLowerCase();
  
  if (lowerName.includes("grupo")) return categoryIcons["grupo"];
  if (lowerName.includes("dezena")) return categoryIcons["dezena"];
  if (lowerName.includes("centena")) return categoryIcons["centena"];
  if (lowerName.includes("milhar")) return categoryIcons["milhar"];
  if (lowerName.includes("passe")) return categoryIcons["passe"];
  
  return <Package className="w-4 h-4 mr-2" />;
}

export function BetTab({ activeTab, onChange, gameModes = [] }: BetTabProps) {
  // Filtrar apenas as modalidades ativas
  const activeGameModes = gameModes.filter(mode => mode.active);
  
  // Se não houver modalidades ativas, mostrar uma mensagem
  if (activeGameModes.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        Nenhuma modalidade de jogo ativa no momento. Por favor, aguarde ou contate o administrador.
      </div>
    );
  }
  
  // Usando useEffect para selecionar a primeira aba ao invés de fazer isso na renderização
  useEffect(() => {
    if (activeGameModes.length > 0 && !activeGameModes.some(mode => mode.id.toString() === activeTab)) {
      onChange(activeGameModes[0].id.toString());
    }
  }, [activeGameModes, activeTab, onChange]);

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {activeGameModes.map(mode => (
        <Button
          key={mode.id}
          variant={activeTab === mode.id.toString() ? "default" : "outline"}
          className={activeTab === mode.id.toString() ? "bg-primary text-white" : "border-gray-300"}
          onClick={() => onChange(mode.id.toString())}
        >
          {getIconForMode(mode.name)}
          {mode.name}
        </Button>
      ))}
    </div>
  );
}