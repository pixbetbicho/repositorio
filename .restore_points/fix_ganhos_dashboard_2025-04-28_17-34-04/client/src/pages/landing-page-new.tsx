import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Animal, Draw, GameMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimalCard } from "@/components/animal-card";
import { BetGroups } from "@/components/bet-groups";
import { BetTab } from "@/components/bet-tab";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { BettingPanel } from "@/components/betting-panel";
import { getAnimalEmoji, getGroupGradient } from "@/lib/animal-icons";
import { 
  ChevronRight, 
  CalendarDays, 
  ArrowRight, 
  Sparkles, 
  DollarSign, 
  TrendingUp, 
  Award,
  Zap,
  Clock,
  CheckCircle2,
  Star,
  User
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function LandingPage() {
  // Estados para controle da interface
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [activeAnimalTab, setActiveAnimalTab] = useState<string>("popular");
  const [selectedDraw, setSelectedDraw] = useState<number | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [selectedPrize, setSelectedPrize] = useState<string>("1");
  const [betAmount, setBetAmount] = useState<number>(5);
  const [isSubmittingBet, setIsSubmittingBet] = useState<boolean>(false);
  
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  
  const { data: animals, isLoading: isLoadingAnimals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: upcomingDraws, isLoading: isLoadingDraws } = useQuery<Draw[]>({
    queryKey: ["/api/draws/upcoming"],
  });
  
  const { data: gameModes } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
  });
  
  const { data: systemSettings } = useQuery<any>({
    queryKey: ["/api/admin/settings"],
  });

  const handleAnimalSelect = (animal: Animal) => {
    if (!user) {
      // If not logged in, prompt to log in
      if (window.confirm("Você precisa estar logado para apostar. Deseja fazer login agora?")) {
        navigate("/auth");
      }
      return;
    }
    
    setSelectedAnimal(animal);
    
    // Scroll to the bet form
    const betFormElement = document.getElementById('bet-form-section');
    if (betFormElement) {
      betFormElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearSelection = () => {
    setSelectedAnimal(null);
  };

  // Group animals by their group number
  const animalGroups = useMemo(() => {
    if (!animals) return [];
    
    // Create groups of 5 animals each for better display
    return Array.from({ length: Math.ceil(animals.length / 5) }, (_, i) =>
      animals.slice(i * 5, i * 5 + 5)
    );
  }, [animals]);
  
  // Get popular animals (top 5)
  const popularAnimals = useMemo(() => {
    if (!animals) return [];
    // In a real app, this would come from the backend based on bet frequency
    // For now, we'll just use the first 5 animals
    return animals.slice(0, 5);
  }, [animals]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with login/register */}
      <header className="sticky top-0 z-50 bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src="/img/logo.png" alt="PixBet Bicho" className="h-10 w-auto" />
              <span className="ml-3 text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                Jogo do Bicho Online
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {!user ? (
                <>
                  <Link href="/auth?tab=login">
                    <Button variant="ghost" className="text-white hover:text-white hover:bg-white hover:bg-opacity-10">
                      Entrar
                    </Button>
                  </Link>
                  <Link href="/auth?tab=register">
                    <Button variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-primary">
                      Cadastrar
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <div className="text-sm mr-2 hidden sm:block">
                    Olá, <span className="font-medium">{user.name || user.username}</span>
                  </div>
                  <div className="text-sm bg-green-500 bg-opacity-90 px-3 py-1 rounded-full flex items-center">
                    <DollarSign className="h-3 w-3 mr-1" />
                    <span className="font-medium">{user.balance.toFixed(2)}</span>
                  </div>
                  <Link href="/user-dashboard">
                    <Button variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-primary">
                      <User className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Minha Conta</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero banner with animated background */}
      <section className="py-12 bg-gradient-to-r from-primary to-primary-dark text-white relative overflow-hidden">
        {/* Animated dots in background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full">
            {Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full bg-white bg-opacity-10"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  width: `${Math.random() * 20 + 5}px`,
                  height: `${Math.random() * 20 + 5}px`,
                  animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <div className="inline-block bg-yellow-500 text-black font-bold px-3 py-1 rounded-full text-sm mb-4 animate-pulse">
                <Sparkles className="h-4 w-4 inline-block mr-1" /> Prêmios Especiais Hoje!
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Aposte no Jogo do Bicho com Emoção e Ganhe Grandes Prêmios
              </h2>
              <p className="text-lg mb-6">
                O tradicional Jogo do Bicho agora em uma plataforma moderna e segura.
                Aposte em qualquer lugar, a qualquer hora e acompanhe seus resultados em tempo real!
              </p>
              
              {user ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="bg-white text-primary hover:bg-gray-100 group transition-all"
                    onClick={() => {
                      const bettingSection = document.getElementById('betting-section');
                      if (bettingSection) {
                        bettingSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    Apostar Agora <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Link href="/user-dashboard">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="bg-transparent border-white text-white hover:bg-white hover:bg-opacity-10"
                    >
                      Meus Jogos <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/auth?tab=login">
                    <Button 
                      size="lg" 
                      className="bg-white text-primary hover:bg-gray-100 group transition-all"
                    >
                      Comece a Jogar <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/auth?tab=register">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="bg-transparent border-white text-white hover:bg-white hover:bg-opacity-10"
                    >
                      Criar Conta
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="grid grid-cols-3 gap-4">
                {['Avestruz', 'Águia', 'Burro', 'Borboleta', 'Cachorro', 'Cabra', 'Carneiro', 'Camelo', 'Cobra'].map((animalName, i) => (
                  <div 
                    key={i} 
                    className="bg-white bg-opacity-10 rounded-lg p-4 w-20 h-20 flex items-center justify-center transform hover:scale-110 transition-transform hover:bg-opacity-20"
                  >
                    <span className="text-4xl">{getAnimalEmoji(animalName)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next draws section with CountDown */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
              <Clock className="h-8 w-8 mr-2 text-primary" />
              Próximos Sorteios
            </h2>
            <p className="text-lg text-gray-600 mt-2">
              Não perca os próximos sorteios. Faça suas apostas agora!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoadingDraws ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))
            ) : upcomingDraws && upcomingDraws.length > 0 ? (
              upcomingDraws.slice(0, 3).map((draw) => (
                <Card key={draw.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200 group border-2 border-gray-200">
                  <div className="bg-primary text-white p-3 group-hover:bg-primary-dark transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">{draw.name}</h3>
                      <Badge className="bg-yellow-500 text-black">{draw.time}h</Badge>
                    </div>
                  </div>
                  <CardContent className="pt-4">
                    <div className="flex items-center text-gray-600 mb-3">
                      <CalendarDays className="h-5 w-5 mr-2 text-primary" />
                      <span>{new Date(draw.date).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-md text-center mb-3">
                      <p className="text-xs text-gray-500">Garanta sua aposta antes do sorteio</p>
                      <div className="text-sm font-medium text-primary">
                        Jogue nos grupos: {[1, 2, 3, 4, 5].map(group => (
                          <span key={group} className="inline-flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full text-xs mx-1">
                            {group}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-primary hover:bg-primary-dark group"
                      onClick={() => {
                        const bettingSection = document.getElementById('betting-section');
                        if (bettingSection) {
                          bettingSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      Apostar neste Sorteio
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-10">
                <p className="text-gray-500">Não há sorteios agendados no momento</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Betting section - Using BetGroups component */}
      <section id="betting-section" className="py-12 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {user && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl -z-10"></div>
              <div className="bg-white bg-opacity-90 rounded-3xl p-8 border border-gray-100 shadow-sm z-10">
                <div className="flex items-center justify-center mb-6">
                  <Zap className="h-7 w-7 mr-2 text-primary" />
                  <h3 className="text-2xl font-bold text-gray-900">Faça Sua Aposta</h3>
                </div>
                
                {isLoadingAnimals || isLoadingDraws ? (
                  <div className="py-8">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : animals && upcomingDraws && upcomingDraws.length > 0 ? (
                  <BetGroups 
                    draws={upcomingDraws.map(draw => {
                      const resultAnimal = draw.resultAnimalId 
                        ? animals?.find(a => a.id === draw.resultAnimalId) 
                        : undefined;
                      return { ...draw, animal: resultAnimal };
                    })}
                    animals={animals}
                    selectedDraw={upcomingDraws[0]?.id || null}
                    onSelectDraw={(id) => {}}
                    gameModes={gameModes?.filter(mode => 
                      mode.active && mode.name.toLowerCase().includes("grupo") && 
                      !mode.name.toLowerCase().includes("duque") && 
                      !mode.name.toLowerCase().includes("terno")
                    ) || []}
                    systemSettings={systemSettings}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Não há jogos disponíveis no momento.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Popular animals section */}
          <div className="mt-10">
            <h3 className="text-xl font-semibold mb-6 flex items-center justify-center">
              <Award className="h-6 w-6 mr-2 text-yellow-500" />
              Bichos Mais Populares
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {isLoadingAnimals ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[120px] w-full rounded-lg" />
                ))
              ) : (
                popularAnimals.map((animal) => (
                  <div 
                    key={animal.id}
                    className="bg-gradient-to-r from-primary to-primary-dark p-4 rounded-lg text-white flex flex-col items-center shadow-md cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleAnimalSelect(animal)}
                  >
                    <span className="text-3xl mb-2">{getAnimalEmoji(animal.name)}</span>
                    <p className="font-bold">{animal.name}</p>
                    <span className="text-xs opacity-75">Grupo {String(animal.group).padStart(2, '0')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}