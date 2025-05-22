import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Animal, Draw, GameMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimalCard } from "@/components/animal-card";
import { BetTab } from "@/components/bet-tab";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { BetForm } from "@/components/bet-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LandingPage() {
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [activeAnimalTab, setActiveAnimalTab] = useState<string>("popular");
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
                      const animalsSection = document.getElementById('animals-section');
                      if (animalsSection) {
                        animalsSection.scrollIntoView({ behavior: 'smooth' });
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <div 
                    key={i} 
                    className="bg-white bg-opacity-10 rounded-lg p-4 w-20 h-20 flex items-center justify-center transform hover:scale-110 transition-transform hover:bg-opacity-20"
                  >
                    <span className="text-4xl">{getAnimalEmoji(i)}</span>
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
                        const animalsSection = document.getElementById('animals-section');
                        if (animalsSection) {
                          animalsSection.scrollIntoView({ behavior: 'smooth' });
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

      {/* Bet form section is now integrated with animals selection */}

      {/* Animals section with all animals displayed by default */}
      <section id="animals-section" className="py-12 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-medium text-sm mb-3">
              <Star className="h-4 w-4 inline-block mr-1 text-yellow-600" /> Escolha seu bicho preferido
            </div>
            <h2 className="text-4xl font-bold text-gray-900">
              Bichos da Sorte
            </h2>
            <p className="text-xl text-gray-600 mt-3 max-w-3xl mx-auto">
              Clique no seu bicho da sorte para fazer sua aposta! Cada animal tem seus números específicos.
            </p>
          </div>

          {/* All animals displayed in a grid */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl -z-10"></div>
            <div className="bg-white bg-opacity-90 rounded-3xl p-8 border border-gray-100 shadow-sm z-10">
              <h3 className="text-2xl font-bold mb-8 text-center flex items-center justify-center">
                <span className="inline-block w-12 h-1 bg-primary mr-3"></span>
                Galeria de Animais
                <span className="inline-block w-12 h-1 bg-primary ml-3"></span>
              </h3>
              
              {isLoadingAnimals ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                    {animals?.map((animal) => (
                      <AnimalCard 
                        key={animal.id}
                        animal={animal}
                        selected={selectedAnimal?.id === animal.id}
                        onClick={handleAnimalSelect}
                      />
                    ))}
                  </div>
                
                
                {/* Bet form shows up when an animal is selected */}
                {selectedAnimal && user && (
                  <div className="mt-10 pt-8 border-t border-gray-200">
                    <div className="flex items-center justify-center mb-6">
                      <Zap className="h-6 w-6 mr-2 text-yellow-500" />
                      <h3 className="text-xl font-bold text-gray-900">Faça Sua Aposta no {selectedAnimal.name}</h3>
                    </div>
                    <div className="max-w-2xl mx-auto">
                      <BetForm 
                        selectedAnimal={selectedAnimal}
                        upcomingDraws={upcomingDraws || []}
                        onClearSelection={handleClearSelection}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
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

      {/* Game modes section - compact version */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 mr-2 text-primary" />
              Modalidades de Jogo
            </h2>
          </div>

          {/* Simple table layout for game modes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary/5">
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Modalidade</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Multiplicador</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 hidden md:table-cell">Descrição</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {gameModes ? (
                    gameModes.filter(mode => mode.active).map((mode, index) => (
                      <tr 
                        key={mode.id} 
                        className={`border-t border-gray-200 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="px-4 py-3 font-medium">{mode.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-primary/10 text-primary font-bold">
                            {mode.odds}×
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{mode.description}</td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              const animalsSection = document.getElementById('animals-section');
                              if (animalsSection) {
                                animalsSection.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                          >
                            Jogar
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-gray-200">
                        <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                        <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-12 mx-auto" /></td>
                        <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-6 w-40" /></td>
                        <td className="px-4 py-3 text-right"><Skeleton className="h-6 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Quick action button */}
          <div className="text-center mt-4">
            <Button 
              variant="default" 
              size="sm"
              className="bg-primary hover:bg-primary-dark"
              onClick={() => {
                const animalsSection = document.getElementById('animals-section');
                if (animalsSection) {
                  animalsSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Fazer Uma Aposta <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Last Results section */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 mr-2 text-green-500" />
              Últimos Resultados
            </h2>
            <p className="text-lg text-gray-600 mt-2">
              Confira os últimos sorteios e os animais premiados
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {isLoadingDraws ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))
            ) : upcomingDraws && upcomingDraws.length > 0 ? (
              upcomingDraws
                .filter(draw => draw.status === "completed" && draw.resultAnimalId)
                .slice(0, 3)
                .map((draw) => {
                  const resultAnimal = animals?.find(a => a.id === draw.resultAnimalId);
                  return (
                    <Card key={draw.id} className="overflow-hidden border-2 border-gray-200 hover:border-green-500 transition-colors">
                      <div className="bg-green-500 text-white p-4">
                        <h3 className="text-lg font-bold flex justify-between">
                          <span>{draw.name}</span>
                          <span>{new Date(draw.date).toLocaleDateString()}</span>
                        </h3>
                      </div>
                      <CardContent className="pt-6">
                        {resultAnimal ? (
                          <div className="flex items-center">
                            <div className="mr-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">
                              {getAnimalEmoji(resultAnimal.name)}
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Bicho Premiado</p>
                              <p className="text-xl font-bold flex items-center">
                                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
                                  {String(resultAnimal.group).padStart(2, '0')}
                                </span>
                                {resultAnimal.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Números: {resultAnimal.numbers.join(', ')}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-gray-500">Resultado pendente</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
            ) : (
              <div className="col-span-3 text-center py-10">
                <p className="text-gray-500">Não há resultados disponíveis no momento</p>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => navigate("/user-dashboard")}
              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
            >
              Ver Histórico Completo
            </Button>
          </div>
        </div>
      </section>

      {/* How to play */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
              <Award className="h-8 w-8 mr-2 text-primary" />
              Como Jogar e Ganhar
            </h2>
            <p className="text-lg text-gray-600 mt-2">
              Siga estas etapas simples para suas apostas no Jogo do Bicho
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 border-gray-200 hover:border-primary hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4 mx-auto">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2 text-center">Escolha seu Bicho</h3>
                <p className="text-gray-600 text-center">
                  Selecione entre os 25 animais tradicionais do Jogo do Bicho para apostar.
                  Cada animal representa um grupo de números.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-200 hover:border-primary hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4 mx-auto">
                  2
                </div>
                <h3 className="text-xl font-bold mb-2 text-center">Defina sua Aposta</h3>
                <p className="text-gray-600 text-center">
                  Escolha o valor da sua aposta, a modalidade de jogo e o sorteio 
                  em que deseja participar. Cada modalidade tem diferentes multiplicadores.
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-200 hover:border-primary hover:shadow-lg transition-all">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mb-4 mx-auto">
                  3
                </div>
                <h3 className="text-xl font-bold mb-2 text-center">Acompanhe o Resultado</h3>
                <p className="text-gray-600 text-center">
                  Após o sorteio, verifique se você ganhou. Os prêmios são
                  calculados automaticamente e adicionados ao seu saldo na plataforma.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 bg-white p-6 rounded-lg border-2 border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-center">Dicas para Ganhar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <div className="bg-primary bg-opacity-10 p-2 rounded-full mr-3 flex-shrink-0">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <p className="text-gray-700">
                  <strong>Diversifique suas apostas</strong> - Aposte em diferentes bichos para aumentar suas chances.
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-primary bg-opacity-10 p-2 rounded-full mr-3 flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <p className="text-gray-700">
                  <strong>Acompanhe as tendências</strong> - Observe quais bichos estão saindo com mais frequência.
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-primary bg-opacity-10 p-2 rounded-full mr-3 flex-shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <p className="text-gray-700">
                  <strong>Escolha a modalidade certa</strong> - Cada modalidade tem riscos e recompensas diferentes.
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-primary bg-opacity-10 p-2 rounded-full mr-3 flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <p className="text-gray-700">
                  <strong>Controle seu orçamento</strong> - Defina um limite para suas apostas e jogue com responsabilidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <span className="text-yellow-500 mr-2">Bicho</span>Mania
              </h3>
              <p className="text-gray-400">
                A melhor plataforma de Jogo do Bicho online. Jogue com segurança e praticidade.
                Grandes prêmios e pagamentos instantâneos.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Links Rápidos</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/">
                    <span className="text-gray-400 hover:text-white transition-colors flex items-center">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Início
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/auth">
                    <span className="text-gray-400 hover:text-white transition-colors flex items-center">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Entrar
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/auth?tab=register">
                    <span className="text-gray-400 hover:text-white transition-colors flex items-center">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Cadastrar
                    </span>
                  </Link>
                </li>
                {user && (
                  <li>
                    <Link href="/user-dashboard">
                      <span className="text-gray-400 hover:text-white transition-colors flex items-center">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Minha Conta
                      </span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Contato</h3>
              <p className="text-gray-400">
                Email: contato@bichomania.com<br />
                Suporte: suporte@bichomania.com
              </p>
              <div className="mt-4 flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} BichoMania. Todos os direitos reservados.</p>
            <p className="text-sm mt-2">Esta é uma plataforma fictícia para demonstração.</p>
          </div>
        </div>
      </footer>

      {/* CSS animations are defined in index.css */}
    </div>
  );
}

// Helper function to get emoji for an animal group
function getAnimalEmoji(group: number): string {
  const emojis: Record<number, string> = {
    1: "🐘", // Avestruz
    2: "🦅", // Águia
    3: "🐎", // Burro
    4: "🦋", // Borboleta
    5: "🐕", // Cachorro
    6: "🐐", // Cabra
    7: "🐏", // Carneiro
    8: "🐫", // Camelo
    9: "🐍", // Cobra
    10: "🐇", // Coelho
    11: "🏇", // Cavalo
    12: "🐘", // Elefante
    13: "🐓", // Galo
    14: "🐈", // Gato
    15: "🐊", // Jacaré
    16: "🦁", // Leão
    17: "🐒", // Macaco
    18: "🐖", // Porco
    19: "🦚", // Pavão
    20: "🦃", // Peru
    21: "🐂", // Touro
    22: "🐅", // Tigre
    23: "🐻", // Urso
    24: "🦌", // Veado
    25: "🐄", // Vaca
  };
  
  return emojis[group] || "🎮";
}