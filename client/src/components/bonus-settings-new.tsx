import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export const BonusSettingsNew = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Estado para os bônus
  const [signupBonus, setSignupBonus] = useState({
    enabled: false,
    amount: 10,
    rollover: 3,
    expiration: 7
  });
  
  const [firstDepositBonus, setFirstDepositBonus] = useState({
    enabled: false,
    amount: 100,
    percentage: 100,
    maxAmount: 200,
    rollover: 3,
    expiration: 7
  });

  // Buscar configurações iniciais
  useEffect(() => {
    const fetchBonusSettings = async () => {
      setLoading(true);
      try {
        console.log("Buscando configurações de bônus do sistema...");
        const response = await fetch("/api/admin/bonus-settings", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Certifica que o navegador envia os cookies de autenticação com a solicitação
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          },
          credentials: "include"
        });
        
        console.log("Resposta recebida:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Dados de bônus carregados:", data);
          
          // Atualizar estado com dados do servidor, com validação para evitar valores inválidos
          setSignupBonus({
            enabled: Boolean(data.signupBonus?.enabled),
            amount: isNaN(Number(data.signupBonus?.amount)) ? 10 : Number(data.signupBonus?.amount),
            rollover: isNaN(Number(data.signupBonus?.rollover)) ? 3 : Number(data.signupBonus?.rollover),
            expiration: isNaN(Number(data.signupBonus?.expiration)) ? 7 : Number(data.signupBonus?.expiration)
          });
          
          setFirstDepositBonus({
            enabled: Boolean(data.firstDepositBonus?.enabled),
            amount: isNaN(Number(data.firstDepositBonus?.amount)) ? 100 : Number(data.firstDepositBonus?.amount),
            percentage: isNaN(Number(data.firstDepositBonus?.percentage)) ? 100 : Number(data.firstDepositBonus?.percentage),
            maxAmount: isNaN(Number(data.firstDepositBonus?.maxAmount)) ? 200 : Number(data.firstDepositBonus?.maxAmount),
            rollover: isNaN(Number(data.firstDepositBonus?.rollover)) ? 3 : Number(data.firstDepositBonus?.rollover),
            expiration: isNaN(Number(data.firstDepositBonus?.expiration)) ? 7 : Number(data.firstDepositBonus?.expiration)
          });
          
          toast({
            title: "Configurações carregadas",
            description: "Configurações de bônus carregadas com sucesso.",
            variant: "default"
          });
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("Você não tem autorização para acessar essas configurações. Por favor, faça login novamente.");
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Falha ao carregar configurações: ${response.status}`);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações de bônus:", error);
        toast({
          title: "Erro ao carregar configurações",
          description: error instanceof Error ? error.message : "Não foi possível carregar as configurações de bônus.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBonusSettings();
  }, [toast]);

  // Função para salvar as configurações
  const saveSettings = async () => {
    setLoading(true);
    setSaveSuccess(false);
    
    try {
      // Validar os valores numéricos antes de enviar
      const validateNumber = (value: number, defaultValue: number): number => {
        return isNaN(value) || value < 0 ? defaultValue : value;
      };
      
      // Preparando payload no formato esperado pelo servidor com validação
      const payload = {
        signupBonus: {
          enabled: Boolean(signupBonus.enabled),
          amount: validateNumber(Number(signupBonus.amount), 10),
          rollover: validateNumber(Number(signupBonus.rollover), 3),
          expiration: validateNumber(Number(signupBonus.expiration), 7)
        },
        firstDepositBonus: {
          enabled: Boolean(firstDepositBonus.enabled),
          amount: validateNumber(Number(firstDepositBonus.amount), 100),
          percentage: validateNumber(Number(firstDepositBonus.percentage), 100),
          maxAmount: validateNumber(Number(firstDepositBonus.maxAmount), 200),
          rollover: validateNumber(Number(firstDepositBonus.rollover), 3),
          expiration: validateNumber(Number(firstDepositBonus.expiration), 7)
        },
        promotionalBanners: {
          enabled: false
        }
      };
      
      console.log("Enviando configurações de bônus:", JSON.stringify(payload));
      
      const response = await fetch("/api/admin/bonus-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      
      console.log("Resposta recebida:", response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log("Resposta do servidor:", result);
        
        setSaveSuccess(true);
        toast({
          title: "Configurações salvas",
          description: "As configurações de bônus foram atualizadas com sucesso!",
          variant: "default"
        });
        
        // Exibir mensagens sobre status dos bônus
        let statusMessage = "";
        
        if (signupBonus.enabled && firstDepositBonus.enabled) {
          statusMessage = "Ambos os bônus (Cadastro e Primeiro Depósito) estão ATIVADOS";
        } else if (signupBonus.enabled) {
          statusMessage = "Apenas o Bônus de Cadastro está ATIVADO";
        } else if (firstDepositBonus.enabled) {
          statusMessage = "Apenas o Bônus de Primeiro Depósito está ATIVADO";
        } else {
          statusMessage = "Todos os bônus estão DESATIVADOS";
        }
        
        setTimeout(() => {
          toast({
            title: "Status dos Bônus",
            description: statusMessage,
            variant: "default"
          });
        }, 1000);
        
        // Recarregar os dados após salvar com sucesso
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else if (response.status === 401 || response.status === 403) {
        throw new Error("Você não tem autorização para modificar essas configurações. Por favor, faça login novamente.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erro ao salvar configurações: ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      setSaveSuccess(false);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Não foi possível salvar as configurações de bônus.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Bônus de Cadastro */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Bônus de Cadastro</CardTitle>
              <CardDescription>
                Configure o bônus concedido aos usuários quando se cadastram
              </CardDescription>
            </div>
            <Switch 
              checked={signupBonus.enabled}
              onCheckedChange={(checked) => {
                console.log("Alterando status do Bônus de Cadastro para:", checked);
                setSignupBonus({...signupBonus, enabled: checked});
              }}
            />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-amount">Valor do Bônus (R$)</Label>
              <Input 
                id="signup-amount"
                type="number"
                value={signupBonus.amount}
                onChange={(e) => setSignupBonus({...signupBonus, amount: Number(e.target.value)})}
                disabled={!signupBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Valor que será adicionado como bônus</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-rollover">Rollover</Label>
              <Input 
                id="signup-rollover"
                type="number"
                value={signupBonus.rollover}
                onChange={(e) => setSignupBonus({...signupBonus, rollover: Number(e.target.value)})}
                disabled={!signupBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Multiplicador do valor para liberação</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-expiration">Expiração (dias)</Label>
              <Input 
                id="signup-expiration"
                type="number"
                value={signupBonus.expiration}
                onChange={(e) => setSignupBonus({...signupBonus, expiration: Number(e.target.value)})}
                disabled={!signupBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Dias até expirar</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bônus de Primeiro Depósito */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Bônus de Primeiro Depósito</CardTitle>
              <CardDescription>
                Configure o bônus concedido aos usuários no primeiro depósito
              </CardDescription>
            </div>
            <Switch 
              checked={firstDepositBonus.enabled}
              onCheckedChange={(checked) => {
                console.log("Alterando status do Bônus de Primeiro Depósito para:", checked);
                setFirstDepositBonus({...firstDepositBonus, enabled: checked});
              }}
            />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-deposit-percentage">Percentual do Bônus (%)</Label>
              <Input 
                id="first-deposit-percentage"
                type="number"
                value={firstDepositBonus.percentage}
                onChange={(e) => setFirstDepositBonus({...firstDepositBonus, percentage: Number(e.target.value)})}
                disabled={!firstDepositBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Percentual do valor depositado que será dado como bônus</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="first-deposit-max-amount">Valor Máximo (R$)</Label>
              <Input 
                id="first-deposit-max-amount"
                type="number"
                value={firstDepositBonus.maxAmount}
                onChange={(e) => setFirstDepositBonus({...firstDepositBonus, maxAmount: Number(e.target.value)})}
                disabled={!firstDepositBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Valor máximo do bônus, independente do percentual</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-deposit-amount">Valor Fixo (R$)</Label>
              <Input 
                id="first-deposit-amount"
                type="number"
                value={firstDepositBonus.amount}
                onChange={(e) => setFirstDepositBonus({...firstDepositBonus, amount: Number(e.target.value)})}
                disabled={!firstDepositBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Alternativo ao percentual</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="first-deposit-rollover">Rollover</Label>
              <Input 
                id="first-deposit-rollover"
                type="number"
                value={firstDepositBonus.rollover}
                onChange={(e) => setFirstDepositBonus({...firstDepositBonus, rollover: Number(e.target.value)})}
                disabled={!firstDepositBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Multiplicador para liberação</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="first-deposit-expiration">Expiração (dias)</Label>
              <Input 
                id="first-deposit-expiration"
                type="number"
                value={firstDepositBonus.expiration}
                onChange={(e) => setFirstDepositBonus({...firstDepositBonus, expiration: Number(e.target.value)})}
                disabled={!firstDepositBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Dias até expirar</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Resumo das configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo das Configurações</CardTitle>
          <CardDescription>
            Visão geral das configurações de bônus do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 border p-4 rounded-md">
              <h3 className="font-semibold text-sm">Bônus de Cadastro</h3>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <span className={`font-medium ${signupBonus.enabled ? "text-green-600" : "text-red-600"}`}>
                  {signupBonus.enabled ? "ATIVADO" : "DESATIVADO"}
                </span>
              </div>
              {signupBonus.enabled && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Valor:</span>
                    <span>R$ {signupBonus.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Rollover:</span>
                    <span>{signupBonus.rollover}x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Expiração:</span>
                    <span>{signupBonus.expiration} dias</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-2 border p-4 rounded-md">
              <h3 className="font-semibold text-sm">Bônus de Primeiro Depósito</h3>
              <div className="flex justify-between text-sm">
                <span>Status:</span>
                <span className={`font-medium ${firstDepositBonus.enabled ? "text-green-600" : "text-red-600"}`}>
                  {firstDepositBonus.enabled ? "ATIVADO" : "DESATIVADO"}
                </span>
              </div>
              {firstDepositBonus.enabled && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Percentual:</span>
                    <span>{firstDepositBonus.percentage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Valor Máximo:</span>
                    <span>R$ {firstDepositBonus.maxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Rollover:</span>
                    <span>{firstDepositBonus.rollover}x</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Botões de Ação */}
      <div className="flex justify-end gap-4">
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          Recarregar Dados
        </Button>
        <Button 
          onClick={saveSettings} 
          disabled={loading}
          className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {loading ? 
            <span className="flex items-center gap-2">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Salvando...
            </span> : 
            saveSuccess ? "✅ Salvo com Sucesso" : "Salvar Configurações"
          }
        </Button>
      </div>
    </div>
  );
};