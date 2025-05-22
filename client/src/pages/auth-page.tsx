import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthPageProps {
  siteName?: string;
  maintenanceMode?: boolean;
}

export default function AuthPage({ siteName = "Jogo do Bicho", maintenanceMode = false }: AuthPageProps) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");
  const { toast } = useToast();

  useEffect(() => {
    // Get tab from URL if specified
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab");
    if (tab === "login" || tab === "register") {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    // Redirect to home if logged in
    if (user && !isLoading) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Auth forms */}
        <div className="md:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img src="/img/logo.png" alt="PixBet Bicho" className="h-20 w-auto" />
              </div>
              <p className="text-gray-600">
                A melhor plataforma de Jogo do Bicho online
              </p>
            </div>

            <Tabs
              defaultValue="login"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm maintenanceMode={maintenanceMode} siteName={siteName} />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Hero section */}
        <div className="md:w-1/2 bg-primary p-8 flex items-center justify-center">
          <div className="max-w-md text-white">
            <h2 className="text-3xl font-bold mb-4">
              Bem-vindo ao Jogo do Bicho Online
            </h2>
            <p className="mb-6">
              Aposte nos 25 animais tradicionais do Jogo do Bicho com a melhor plataforma
              digital do mercado. Interface moderna, pagamentos rápidos e total segurança.
            </p>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="mr-4 bg-white bg-opacity-20 p-2 rounded-full">
                  <span className="text-xl">💰</span>
                </div>
                <div>
                  <h3 className="font-medium">Pagamentos Rápidos</h3>
                  <p className="text-sm text-white text-opacity-80">
                    Receba seus ganhos de forma instantânea
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="mr-4 bg-white bg-opacity-20 p-2 rounded-full">
                  <span className="text-xl">🎲</span>
                </div>
                <div>
                  <h3 className="font-medium">Múltiplos Sorteios</h3>
                  <p className="text-sm text-white text-opacity-80">
                    Sorteios diários nos principais horários
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="mr-4 bg-white bg-opacity-20 p-2 rounded-full">
                  <span className="text-xl">🔒</span>
                </div>
                <div>
                  <h3 className="font-medium">100% Seguro</h3>
                  <p className="text-sm text-white text-opacity-80">
                    Sua privacidade e seus dados protegidos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}