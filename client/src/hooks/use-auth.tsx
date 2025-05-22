import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, clearCacheForSecurity } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCustomToast } from "@/components/custom-toast";
import { User } from "@/types";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  updateBalanceMutation: UseMutationResult<User, Error, BalanceUpdateData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email?: string;
  name?: string;
};

type BalanceUpdateData = {
  amount: number;
  type: 'deposit' | 'withdraw';
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const customToast = useCustomToast();
  
  // Adicionar um listener para window.onbeforeunload no objeto window global
  // para limpar o cache quando a página for recarregada
  useEffect(() => {
    window.onbeforeunload = () => {
      clearCacheForSecurity();
      return null;
    };
    
    return () => {
      window.onbeforeunload = null;
    };
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      // Limpar todo o cache anterior antes de definir o novo usuário
      clearCacheForSecurity();
      
      // Atualizar com os dados do novo usuário
      queryClient.setQueryData(["/api/user"], user);
      
      // Usar ambos os sistemas de toast para garantir que pelo menos um funcione
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${user.username}!`,
        duration: 3000,
        variant: "default",
      });
      
      // Usar o sistema customizado também
      customToast.addToast({
        message: `Bem-vindo, ${user.username}!`,
        title: "Login realizado com sucesso",
        type: "success",
        duration: 3000
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: "Usuário ou senha incorretos",
        variant: "destructive",
      });

      // Uso do sistema customizado
      customToast.addToast({
        message: "Usuário ou senha incorretos",
        title: "Falha no login",
        type: "error",
        duration: 3000
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      // Limpar cache antes de definir o novo usuário
      clearCacheForSecurity();
      
      // Definir dados do usuário registrado
      queryClient.setQueryData(["/api/user"], user);
      
      toast({
        title: "Conta criada com sucesso",
        description: `Bem-vindo, ${user.username}!`,
        duration: 3000,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message || "Nome de usuário já existe",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Primeiro definimos o usuário como null
      queryClient.setQueryData(["/api/user"], null);

      // Limpa todo o cache para garantir que os dados de um usuário
      // não sejam visíveis para outro após o logout
      clearCacheForSecurity();

      // Mensagem de confirmação
      toast({
        title: "Logout realizado com sucesso",
        description: "Volte sempre!",
        duration: 3000,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBalanceMutation = useMutation({
    mutationFn: async (data: BalanceUpdateData) => {
      const res = await apiRequest("POST", "/api/users/balance", data);
      return await res.json();
    },
    onSuccess: (user: User, variables) => {
      // Atualiza o cache e invalida todas as queries relacionadas
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidate all related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bets"] });
      
      const operation = variables.type === 'deposit' ? 'Depósito' : 'Saque';
      toast({
        title: `${operation} realizado com sucesso`,
        description: `Seu novo saldo é de R$ ${user.balance.toFixed(2)}`,
        duration: 3000,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha na operação",
        description: error.message || "Ocorreu um erro ao atualizar seu saldo",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateBalanceMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
