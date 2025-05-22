import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  LockKeyhole,
  Settings,
  Bell,
  User,
  ChevronRight,
  LogOut,
  Landmark,
  CreditCard
} from "lucide-react";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Schema de validação para o formulário de chave PIX
const pixKeyFormSchema = z.object({
  pixKeyType: z.enum(["email"], {
    required_error: "Selecione o tipo de chave PIX",
  }),
  pixKey: z.string()
    .email({ message: "Email inválido" })
});

type PixKeyFormValues = z.infer<typeof pixKeyFormSchema>;

interface UserSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Formulário para configuração de chave PIX
  const pixKeyForm = useForm<PixKeyFormValues>({
    resolver: zodResolver(pixKeyFormSchema),
    defaultValues: {
      pixKeyType: "email",
      pixKey: user?.defaultPixKey || "",
    },
  });

  // Atualizar formulário quando o usuário for carregado
  useEffect(() => {
    if (user && user.email) {
      pixKeyForm.setValue("pixKey", user.email);
      pixKeyForm.setValue("pixKeyType", "email");
    }
  }, [user, pixKeyForm]);

  // Mutação para salvar a chave PIX
  const savePixKeyMutation = useMutation({
    mutationFn: async (data: PixKeyFormValues) => {
      const res = await apiRequest("PUT", "/api/user/pix-key", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Chave PIX salva",
        description: "Sua chave PIX foi configurada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar chave PIX",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitPixKey = (data: PixKeyFormValues) => {
    savePixKeyMutation.mutate(data);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logout realizado com sucesso",
          description: "Você foi desconectado da sua conta.",
        });
        onOpenChange(false);
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações
            </DialogTitle>
            <DialogDescription>
              Ajuste as configurações da sua conta.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="account" className="mt-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="account">Conta</TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                Pagamentos
              </TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="account" className="space-y-4 mt-4">
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary text-white rounded-full h-10 w-10 flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name || user?.username}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user?.email || "Email não configurado"}
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-between"
                  onClick={() => setChangePasswordOpen(true)}
                >
                  <div className="flex items-center">
                    <LockKeyhole className="h-4 w-4 mr-2" />
                    <span>Alterar Senha</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full justify-between text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <div className="flex items-center">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Sair da Conta</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            
            {/* Aba de Pagamentos - Configuração da Chave PIX */}
            <TabsContent value="payments" className="space-y-4 mt-4">
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-medium">Chave PIX para saques</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Configure uma chave PIX padrão para receber seus saques. Esta chave será usada
                  em todas as solicitações de saque.
                </p>

                <Form {...pixKeyForm}>
                  <form onSubmit={pixKeyForm.handleSubmit(onSubmitPixKey)} className="space-y-4">
                    <FormField
                      control={pixKeyForm.control}
                      name="pixKeyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Chave PIX</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de chave" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={pixKeyForm.control}
                      name="pixKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email para recebimento</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="seu.email@exemplo.com"
                              {...field}
                              type="email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={savePixKeyMutation.isPending}
                    >
                      {savePixKeyMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Salvando...
                        </div>
                      ) : 'Salvar Chave PIX'}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4" />
                    <span>Notificações de resultados</span>
                  </div>
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        value="" 
                        className="sr-only peer" 
                        defaultChecked 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4" />
                    <span>Notificações de promoções</span>
                  </div>
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        value="" 
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <ChangePasswordDialog 
        open={changePasswordOpen} 
        onOpenChange={setChangePasswordOpen} 
      />
    </>
  );
}