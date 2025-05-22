import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/money-input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

// Definir schema para os formulários de configuração de bônus
const bonusConfigSchema = z.object({
  // Configurações de bônus de cadastro
  signupBonusEnabled: z.boolean().default(false),
  signupBonusAmount: z.coerce.number().min(0).default(10),
  signupBonusRollover: z.coerce.number().min(1).default(3),
  signupBonusExpiration: z.coerce.number().min(1).default(7),
  
  // Configurações de bônus de primeiro depósito
  firstDepositBonusEnabled: z.boolean().default(false),
  firstDepositBonusAmount: z.coerce.number().min(0).default(100),
  firstDepositBonusPercentage: z.coerce.number().min(0).max(100).default(100),
  firstDepositBonusMaxAmount: z.coerce.number().min(0).default(200),
  firstDepositBonusRollover: z.coerce.number().min(1).default(3),
  firstDepositBonusExpiration: z.coerce.number().min(1).default(7),
});

type BonusSettings = z.infer<typeof bonusConfigSchema>;

export function BonusSettings() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Buscar configurações atuais do sistema
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      console.log("[API Request] GET /api/settings");
      const res = await apiRequest("GET", "/api/settings");
      const data = await res.json();
      console.log("Configurações de bônus carregadas:", data);
      return data;
    },
  });

  // Configuração do formulário
  const form = useForm<BonusSettings>({
    resolver: zodResolver(bonusConfigSchema),
    defaultValues: {
      signupBonusEnabled: false,
      signupBonusAmount: 10,
      signupBonusRollover: 3,
      signupBonusExpiration: 7,
      firstDepositBonusEnabled: false,
      firstDepositBonusAmount: 100,
      firstDepositBonusPercentage: 100,
      firstDepositBonusMaxAmount: 200,
      firstDepositBonusRollover: 3,
      firstDepositBonusExpiration: 7,
    },
    mode: "onChange",
  });

  // Usar um useEffect para atualizar o formulário quando os dados forem carregados
  // Isso garante que a inicialização dos valores aconteça após o carregamento completo
  useEffect(() => {
    if (systemSettings) {
      console.log("Atualizando formulário com dados:", systemSettings);
      
      // Garantir que os valores booleanos sejam explicitamente tratados como booleanos
      form.reset({
        signupBonusEnabled: systemSettings.signupBonusEnabled === true,
        signupBonusAmount: systemSettings.signupBonusAmount || 10,
        signupBonusRollover: systemSettings.signupBonusRollover || 3,
        signupBonusExpiration: systemSettings.signupBonusExpiration || 7,
        firstDepositBonusEnabled: systemSettings.firstDepositBonusEnabled === true,
        firstDepositBonusAmount: systemSettings.firstDepositBonusAmount || 100,
        firstDepositBonusPercentage: systemSettings.firstDepositBonusPercentage || 100,
        firstDepositBonusMaxAmount: systemSettings.firstDepositBonusMaxAmount || 200,
        firstDepositBonusRollover: systemSettings.firstDepositBonusRollover || 3,
        firstDepositBonusExpiration: systemSettings.firstDepositBonusExpiration || 7,
      });
    }
  }, [systemSettings, form]);

  // Mutation para salvar as configurações
  const saveMutation = useMutation({
    mutationFn: async (data: BonusSettings) => {
      console.log("Enviando dados de bônus via PATCH:", data);
      const res = await apiRequest("PATCH", "/api/admin/settings", data);
      return await res.json();
    },
    onSuccess: (data) => {
      // Verificar se o bônus foi ativado ou desativado
      const bonusesAtivados: string[] = [];
      if (data.signupBonusEnabled) {
        bonusesAtivados.push("Bônus de Cadastro");
      }
      if (data.firstDepositBonusEnabled) {
        bonusesAtivados.push("Bônus de Primeiro Depósito");
      }
      
      // Criar mensagem personalizada
      let mensagem = "As configurações de bônus foram atualizadas com sucesso.";
      if (bonusesAtivados.length > 0) {
        mensagem = `BÔNUS ATIVADOS: ${bonusesAtivados.join(" e ")}`;
      }
      
      // Mostrar toast com mensagem clara
      toast({
        title: "✅ CONFIGURAÇÕES SALVAS COM SUCESSO",
        description: mensagem,
        duration: 5000, // 5 segundos
      });
      
      // Atualizar dados em tela
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      
      // Mostrar alerta adicional se algum bônus foi ativado
      if (bonusesAtivados.length > 0) {
        const bonusMessage = `BÔNUS ATIVADOS: ${bonusesAtivados.join(" e ")}. As configurações foram salvas com sucesso!`;
        setTimeout(() => {
          window.alert(bonusMessage);
        }, 500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Função para enviar o formulário
  const onSubmit = (values: BonusSettings) => {
    setIsSubmitting(true);
    saveMutation.mutate(values);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Bônus</CardTitle>
          <CardDescription>Configure os diferentes tipos de bônus disponíveis na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div>
                <h3 className="text-lg font-medium">Bônus de Cadastro</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Configure o bônus concedido aos usuários quando se cadastram na plataforma
                </p>

                <div className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="signupBonusEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativar Bônus de Cadastro</FormLabel>
                          <FormDescription>
                            Quando ativado, novos usuários receberão um bônus ao se cadastrarem
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="signupBonusAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor do Bônus (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="10.00"
                              {...field}
                              disabled={!form.watch("signupBonusEnabled")}
                            />
                          </FormControl>
                          <FormDescription>
                            Valor que será adicionado como bônus
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="signupBonusRollover"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rollover</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              step="0.5"
                              placeholder="3"
                              {...field}
                              disabled={!form.watch("signupBonusEnabled")}
                            />
                          </FormControl>
                          <FormDescription>
                            Multiplicador do valor para liberação do bônus
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="signupBonusExpiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiração (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="7"
                              {...field}
                              disabled={!form.watch("signupBonusEnabled")}
                            />
                          </FormControl>
                          <FormDescription>
                            Dias até o bônus expirar
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium">Bônus de Primeiro Depósito</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Configure o bônus concedido aos usuários no seu primeiro depósito
                </p>

                <div className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="firstDepositBonusEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativar Bônus de Primeiro Depósito</FormLabel>
                          <FormDescription>
                            Quando ativado, usuários poderão receber um bônus no primeiro depósito
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstDepositBonusPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percentual do Bônus (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="100"
                              {...field}
                              disabled={!form.watch("firstDepositBonusEnabled")}
                            />
                          </FormControl>
                          <FormDescription>
                            Percentual do valor depositado que será dado como bônus
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstDepositBonusMaxAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Máximo do Bônus (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="200.00"
                              {...field}
                              disabled={!form.watch("firstDepositBonusEnabled")}
                            />
                          </FormControl>
                          <FormDescription>
                            Valor máximo que será concedido como bônus, independente do percentual
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="firstDepositBonusAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Fixo Alternativo (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="100.00"
                              {...field}
                              disabled={!form.watch("firstDepositBonusEnabled")}
                            />
                          </FormControl>
                          <FormDescription>
                            Valor fixo (usado se percentual for 0)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstDepositBonusRollover"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rollover</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              step="0.5"
                              placeholder="3"
                              {...field}
                              disabled={!form.watch("firstDepositBonusEnabled")}
                            />
                          </FormControl>
                          <FormDescription>
                            Multiplicador do valor para liberação do bônus
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstDepositBonusExpiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiração (dias)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="7"
                              {...field}
                              disabled={!form.watch("firstDepositBonusEnabled")}
                            />
                          </FormControl>
                          <FormDescription>
                            Dias até o bônus expirar
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full md:w-auto ${isSubmitting ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      SALVANDO CONFIGURAÇÕES...
                    </span>
                  ) : (
                    <span className="font-bold">SALVAR CONFIGURAÇÕES DE BÔNUS</span>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}