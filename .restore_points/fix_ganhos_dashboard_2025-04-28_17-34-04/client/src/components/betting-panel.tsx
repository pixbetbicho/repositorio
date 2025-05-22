import { useState, useEffect } from "react";
import { Animal, Draw, GameMode } from "@/types";
import { BetTab } from "./bet-tab";
import { BetGroups } from "./bet-groups";
import { BetDozens } from "./bet-dozens";
import { BetHundreds } from "./bet-hundreds";
import { BetThousands } from "./bet-thousands";
import { MobileBetWizard } from "./mobile-bet-wizard";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";
import { Card } from "./ui/card";
import { getAnimalEmoji } from "@/lib/animal-icons";

interface BettingPanelProps {
  animals: Animal[] | undefined;
  upcomingDraws: Draw[] | undefined;
  isLoadingAnimals: boolean;
  isLoadingDraws: boolean;
}

// Determinar a categoria básica da modalidade
function getCategoryFromMode(modeName: string): string {
  const lowerName = modeName.toLowerCase();
  
  if (lowerName.includes("grupo") || lowerName.includes("passe")) return "groups";
  if (lowerName.includes("dezena")) return "dozens";  
  if (lowerName.includes("centena")) return "hundreds";
  if (lowerName.includes("milhar")) return "thousands";
  
  return "groups"; // Padrão
}

export function BettingPanel({
  animals,
  upcomingDraws,
  isLoadingAnimals,
  isLoadingDraws
}: BettingPanelProps) {
  // Estados gerais
  const [activeModalityId, setActiveModalityId] = useState<string>("");
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Detectar se é dispositivo móvel
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Verificar tamanho inicial
    checkIfMobile();
    
    // Adicionar event listener para resize
    window.addEventListener('resize', checkIfMobile);
    
    // Limpar event listener
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Carregar modos de jogo e configurações do sistema
  const { data: gameModes, isLoading: isLoadingGameModes } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });

  const { data: systemSettings } = useQuery<any>({
    queryKey: ["/api/admin/settings"],
  });

  // Formatar sorteios para incluir detalhes dos animais
  const formattedDraws = upcomingDraws?.map(draw => {
    const resultAnimal = draw.resultAnimalId 
      ? animals?.find(a => a.id === draw.resultAnimalId) 
      : undefined;
    
    return {
      ...draw,
      animal: resultAnimal
    };
  }) || [];

  // Selecionar o primeiro sorteio por padrão
  useEffect(() => {
    if (formattedDraws.length > 0 && selectedDraw === null) {
      setSelectedDraw(formattedDraws[0].id);
    }
  }, [formattedDraws, selectedDraw]);

  // Ordenar modos de jogo - colocando Grupo no início
  const orderedGameModes = gameModes ? [...gameModes].sort((a, b) => {
    const aIsGroup = a.name.toLowerCase().includes("grupo") && 
                   !a.name.toLowerCase().includes("duque") && 
                   !a.name.toLowerCase().includes("terno");
    const bIsGroup = b.name.toLowerCase().includes("grupo") && 
                   !b.name.toLowerCase().includes("duque") && 
                   !b.name.toLowerCase().includes("terno");
    
    if (aIsGroup && !bIsGroup) return -1;
    if (!aIsGroup && bIsGroup) return 1;
    return 0;
  }).filter(mode => mode.active) : [];
  
  // Selecionar modalidade Grupo por padrão
  useEffect(() => {
    if (gameModes && gameModes.length > 0 && !activeModalityId) {
      // Seleciona a modalidade de grupo por padrão
      const grupoMode = gameModes.find(mode => 
        mode.active && mode.name.toLowerCase().includes("grupo") && 
        !mode.name.toLowerCase().includes("duque") && 
        !mode.name.toLowerCase().includes("terno")
      );
      
      if (grupoMode) {
        setActiveModalityId(grupoMode.id.toString());
      } else {
        // Fallback para a primeira modalidade ativa
        const activeGameModes = gameModes.filter(mode => mode.active);
        if (activeGameModes.length > 0) {
          setActiveModalityId(activeGameModes[0].id.toString());
        }
      }
    }
  }, [gameModes, activeModalityId]);

  // Handlers
  const handleModalityChange = (modalityId: string) => {
    setActiveModalityId(modalityId);
  };

  const handleSelectDraw = (drawId: number) => {
    setSelectedDraw(drawId);
  };

  // Mostrar loading
  if (isLoadingAnimals || isLoadingDraws || isLoadingGameModes) {
    return (
      <Card className="p-4">
        <div className="flex justify-center mb-4">
          <Skeleton className="h-8 w-80" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  // Verificar se há dados
  if (!animals || !upcomingDraws || upcomingDraws.length === 0 || !gameModes) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">
          Não há jogos disponíveis no momento. Por favor, tente novamente mais tarde.
        </p>
      </Card>
    );
  }

  // Encontrar a modalidade ativa
  const activeMode = gameModes.find(mode => mode.id.toString() === activeModalityId);
  if (!activeMode) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">
          Nenhuma modalidade ativa encontrada. Por favor, tente novamente mais tarde.
        </p>
      </Card>
    );
  }

  // Determinar qual componente exibir baseado na categoria da modalidade
  const category = getCategoryFromMode(activeMode.name);

  // Renderizar a interface com base no dispositivo
  return (
    <div className="w-full">
      {isMobile ? (
        // Versão móvel com grid de animais e wizard
        <div className="space-y-6">
          {/* Seleção de modalidades */}
          <div className="mb-4">
            <div className="flex overflow-x-auto pb-2 no-scrollbar">
              {orderedGameModes.map(mode => (
                <button
                  key={mode.id}
                  className={`flex-shrink-0 px-3 py-1 mr-2 text-sm rounded-full border 
                    ${activeModalityId === mode.id.toString() 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-white border-gray-300 text-gray-700'}`}
                  onClick={() => handleModalityChange(mode.id.toString())}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Interface de acordo com a categoria selecionada */}
          {category === "groups" ? (
            <div>
              <h3 className="text-lg font-semibold mb-2">Escolha um animal para apostar</h3>
              <div className="grid grid-cols-3 gap-2 pb-2">
                {animals.sort((a, b) => a.group - b.group).map(animal => (
                  <div
                    key={animal.id}
                    className="flex flex-col items-center p-2 border rounded-lg bg-white hover:bg-primary/5 cursor-pointer"
                    onClick={() => {
                      // Usar o MobileBetWizard com um animal pré-selecionado
                      const wizard = document.getElementById('mobile-bet-trigger');
                      if (wizard) {
                        (wizard as HTMLButtonElement).click();
                        // O animal será selecionado internamente pelo wizard, junto com a modalidade ativa
                        sessionStorage.setItem('preSelectedAnimal', animal.id.toString());
                        sessionStorage.setItem('preSelectedModality', activeModalityId);
                      }
                    }}
                  >
                    <span className="text-2xl mb-1">{getAnimalEmoji(animal.name)}</span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-1">{animal.name}</span>
                      <span className="text-xs text-gray-500">({animal.group})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Interface para apostas numéricas (dezena, centena, milhar)
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {category === "dozens" 
                  ? "Aposte na Dezena" 
                  : category === "hundreds" 
                    ? "Aposte na Centena" 
                    : "Aposte na Milhar"}
              </h3>
              
              <div className="p-4 bg-white rounded-lg border">
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-500 text-center">
                    {category === "dozens"
                      ? "Digite 2 dígitos para apostar na dezena"
                      : category === "hundreds"
                      ? "Digite 3 dígitos para apostar na centena"
                      : "Digite 4 dígitos para apostar na milhar"}
                  </p>
                  
                  <div className="border p-3 rounded-lg bg-slate-50 flex items-center justify-center">
                    <div className="text-2xl font-mono tracking-wider">
                      {category === "dozens" && (
                        <span className="text-gray-400">00</span>
                      )}
                      {category === "hundreds" && (
                        <span className="text-gray-400">000</span>
                      )}
                      {category === "thousands" && (
                        <span className="text-gray-400">0000</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Teclado virtual minimalista */}
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                      <button 
                        key={num}
                        className="p-2 bg-white border rounded-md hover:bg-gray-100 text-sm font-medium"
                        onClick={() => {
                          // Abrir o wizard diretamente na tela de apostas numéricas
                          const wizard = document.getElementById('mobile-bet-trigger');
                          if (wizard) {
                            (wizard as HTMLButtonElement).click();
                            sessionStorage.setItem('preSelectedModality', activeModalityId);
                            sessionStorage.setItem('openNumberBet', 'true');
                            // Pré-selecionar o dígito clicado para facilitar a entrada
                            sessionStorage.setItem('preSelectedDigit', num.toString());
                          }
                        }}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      className="col-span-4 p-3 mt-1 bg-primary text-white rounded-md hover:bg-primary-dark font-medium"
                      onClick={() => {
                        // Abrir o wizard diretamente na tela de apostas numéricas
                        const wizard = document.getElementById('mobile-bet-trigger');
                        if (wizard) {
                          (wizard as HTMLButtonElement).click();
                          sessionStorage.setItem('preSelectedModality', activeModalityId);
                          sessionStorage.setItem('openNumberBet', 'true');
                        }
                      }}
                    >
                      Apostar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="hidden">
            <MobileBetWizard 
              draws={formattedDraws}
              animals={animals}
              gameModes={gameModes}
              systemSettings={systemSettings}
            />
          </div>
        </div>
      ) : (
        // Versão desktop com tabs
        <>
          <BetTab 
            activeTab={activeModalityId} 
            onChange={handleModalityChange} 
            gameModes={orderedGameModes}
          />
          
          <div className="mt-4">
            {category === "groups" && (
              <BetGroups 
                draws={formattedDraws}
                animals={animals}
                selectedDraw={selectedDraw}
                onSelectDraw={handleSelectDraw}
                gameModes={[activeMode]} // Passar apenas a modalidade selecionada
                systemSettings={systemSettings}
              />
            )}
            
            {category === "dozens" && (
              <BetDozens 
                draws={formattedDraws}
                selectedDraw={selectedDraw}
                onSelectDraw={handleSelectDraw}
                gameModes={[activeMode]} // Passar apenas a modalidade selecionada
                systemSettings={systemSettings}
              />
            )}
            
            {category === "hundreds" && (
              <BetHundreds 
                draws={formattedDraws}
                selectedDraw={selectedDraw}
                onSelectDraw={handleSelectDraw}
                gameModes={[activeMode]} // Passar apenas a modalidade selecionada
                systemSettings={systemSettings}
              />
            )}
            
            {category === "thousands" && (
              <BetThousands 
                draws={formattedDraws}
                selectedDraw={selectedDraw}
                onSelectDraw={handleSelectDraw}
                gameModes={[activeMode]} // Passar apenas a modalidade selecionada
                systemSettings={systemSettings}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}