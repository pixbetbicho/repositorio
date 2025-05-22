import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Animal, Draw, GameMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { BettingPanel } from "@/components/betting-panel";
import { getAnimalEmoji } from "@/lib/animal-icons";
import { DepositDialog } from "@/components/deposit-dialog";
import { 
  ChevronRight, 
  CalendarDays, 
  ArrowRight, 
  Sparkles, 
  DollarSign, 
  Award,
  Zap,
  Clock,
  User
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function LandingPage() {
  // Estados para controle da interface
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  
  const handleDeposit = () => {
    setDepositOpen(true);
  };
  
  const { data: animals, isLoading: isLoadingAnimals } = useQuery<Animal[]>({
    queryKey: ["/api/animals"],
  });

  const { data: upcomingDraws, isLoading: isLoadingDraws } = useQuery<Draw[]>({
    queryKey: ["/api/draws/upcoming"],
  });
  
  // Get popular animals (top 5)
  const popularAnimals = useMemo(() => {
    if (!animals) return [];
    return animals.slice(0, 5);
  }, [animals]);

  const handleAnimalSelect = (animal: Animal) => {
    if (!user) {
      if (window.confirm("Você precisa estar logado para apostar. Deseja fazer login agora?")) {
        navigate("/auth");
      }
      return;
    }
    
    setSelectedAnimal(animal);
    
    const bettingSection = document.getElementById('betting-section');
    if (bettingSection) {
      bettingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with login/register */}
      <header className="sticky top-0 z-50 bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img src="/img/logo.png" alt="PixBet Bicho" className="h-10 w-auto" />

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
                  <div className="flex items-center space-x-2">
                    <div className="text-sm bg-green-500 bg-opacity-90 px-3 py-1 rounded-full flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span className="font-medium">{user.balance.toFixed(2)}</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1 px-2 h-auto border-none"
                      onClick={handleDeposit}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Depositar
                    </Button>
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

      {/* Betting section - Using BettingPanel component */}
      <section id="betting-section" className="py-12 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl -z-10"></div>
            <div className="bg-white bg-opacity-90 rounded-3xl p-8 border border-gray-100 shadow-sm z-10">
              <div className="flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 mr-2 text-primary" />
                <h3 className="text-2xl font-bold text-gray-900">Faça Sua Aposta</h3>
              </div>
              
              {!user ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-100">
                  <h4 className="text-xl font-bold mb-3">Faça login para apostar</h4>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Para fazer suas apostas no Jogo do Bicho, você precisa estar logado na sua conta.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/auth?tab=login">
                      <Button 
                        className="bg-primary hover:bg-primary-dark"
                      >
                        Fazer Login
                      </Button>
                    </Link>
                    <Link href="/auth?tab=register">
                      <Button 
                        variant="outline"
                      >
                        Criar Conta
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : isLoadingAnimals || isLoadingDraws ? (
                <div className="py-8">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : animals && upcomingDraws && upcomingDraws.length > 0 ? (
                <BettingPanel
                  animals={animals}
                  upcomingDraws={upcomingDraws}
                  isLoadingAnimals={isLoadingAnimals}
                  isLoadingDraws={isLoadingDraws}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Não há jogos disponíveis no momento.</p>
                </div>
              )}
            </div>
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

      {/* Footer section */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src="/img/logo.png" alt="PixBet Bicho" className="h-8 w-auto" />
                <span className="ml-2 font-bold">PixBet Bicho</span>
              </div>
              <p className="text-sm text-gray-400">
                A plataforma mais moderna para jogar no tradicional Jogo do Bicho, com segurança, rapidez e praticidade.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/" className="text-gray-400 hover:text-white transition-colors">Início</a></li>
                <li><a href="/auth" className="text-gray-400 hover:text-white transition-colors">Entrar</a></li>
                <li><a href="/auth?tab=register" className="text-gray-400 hover:text-white transition-colors">Cadastrar</a></li>
                <li><a href="/como-jogar" className="text-gray-400 hover:text-white transition-colors">Como Jogar</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Informações</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Regras</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Suporte</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Redes Sociais</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} PixBet Bicho. Todos os direitos reservados.
            </p>
            <div className="flex space-x-4 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">Responsabilidade Social</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Deposit Dialog */}
      <DepositDialog 
        open={depositOpen} 
        onOpenChange={setDepositOpen} 
        onSuccess={() => {
          // Atualizar o saldo do usuário após depósito bem-sucedido
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        }}
      />
    </div>
  );
}
