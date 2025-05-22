import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MaintenanceModal } from "@/components/maintenance-modal";

const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  siteName?: string;
  maintenanceMode?: boolean;
}

export function LoginForm({ siteName = "Jogo do Bicho", maintenanceMode = false }: LoginFormProps) {
  const { loginMutation } = useAuth();
  const [_, navigate] = useLocation();
  const [rememberMe, setRememberMe] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [wasLoginAttempted, setWasLoginAttempted] = useState(false);
  const [lastUsername, setLastUsername] = useState("");
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });
  
  // Reset loginAttempted quando mudar de página
  useEffect(() => {
    return () => {
      setWasLoginAttempted(false);
    };
  }, []);
  
  // Efeito para mostrar o modal quando um login falha e o sistema está em manutenção
  useEffect(() => {
    if (loginMutation.isError && maintenanceMode && wasLoginAttempted) {
      // Verificar se o usuário não é admin
      if (lastUsername !== 'admin') {
        setShowMaintenanceModal(true);
      }
    }
  }, [loginMutation.isError, maintenanceMode, wasLoginAttempted, lastUsername]);

  const onSubmit = async (data: LoginFormValues) => {
    // Guardar que houve uma tentativa de login e o username
    setWasLoginAttempted(true);
    setLastUsername(data.username);
    
    loginMutation.mutate(
      {
        username: data.username,
        password: data.password,
      },
      {
        onSuccess: () => {
          // Se o login for bem sucedido, navegar para a home
          navigate("/");
        },
        onError: (error) => {
          // Se o erro for por causa do modo de manutenção e não for um admin
          if (maintenanceMode && data.username !== "admin") {
            setShowMaintenanceModal(true);
          }
        }
      }
    );
  };

  return (
    <div className="w-full">
      {/* Modal de manutenção */}
      <MaintenanceModal 
        isOpen={showMaintenanceModal} 
        siteName={siteName} 
        onClose={() => setShowMaintenanceModal(false)}
      />
      
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800">Entrar</h3>
        <p className="text-sm text-gray-500 mt-1">
          Faça login para acessar sua conta
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome de usuário</FormLabel>
                <FormControl>
                  <Input placeholder="Seu usuário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember-me" 
                checked={rememberMe} 
                onCheckedChange={(checked) => setRememberMe(!!checked)} 
              />
              <Label htmlFor="remember-me" className="text-sm font-medium text-gray-600">
                Lembrar-me
              </Label>
            </div>
            <a href="#" className="text-sm font-medium text-primary hover:text-primary/80">
              Esqueceu a senha?
            </a>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou</span>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Não tem uma conta?{" "}
          <button
            type="button"
            className="font-medium text-primary hover:text-primary/80"
            onClick={() => navigate("/auth?tab=register")}
          >
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}
