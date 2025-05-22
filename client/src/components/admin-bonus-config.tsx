import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminBonusConfig = () => {
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
      try {
        // Tentar primeiro com endpoint específico de bônus
        let response = await fetch("/api/admin/bonus-settings");
        
        // Se o endpoint não estiver disponível (403), tente o endpoint geral
        if (response.status === 403 || response.status === 401) {
          response = await fetch("/api/settings");
          const data = await response.json();
          
          console.log("Dados de configuração carregados do endpoint geral:", data);
          
          // Atualizar estado com dados do endpoint geral
          setSignupBonus({
            enabled: Boolean(data.signupBonusEnabled),
            amount: data.signupBonusAmount || 10,
            rollover: data.signupBonusRollover || 3,
            expiration: data.signupBonusExpiration || 7
          });
          
          setFirstDepositBonus({
            enabled: Boolean(data.firstDepositBonusEnabled),
            amount: data.firstDepositBonusAmount || 100,
            percentage: data.firstDepositBonusPercentage || 100,
            maxAmount: data.firstDepositBonusMaxAmount || 200,
            rollover: data.firstDepositBonusRollover || 3,
            expiration: data.firstDepositBonusExpiration || 7
          });
        } else {
          // Usando o endpoint específico de bônus
          const data = await response.json();
          
          console.log("Dados de configuração carregados do endpoint de bônus:", data);
          
          // Atualizar estado com dados do formato específico
          setSignupBonus(data.signupBonus);
          setFirstDepositBonus(data.firstDepositBonus);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações de bônus:", error);
        toast({
          title: "Erro ao carregar configurações",
          description: "Não foi possível carregar as configurações de bônus.",
          variant: "destructive"
        });
      }
    };
    
    fetchBonusSettings();
  }, [toast]);

  // Função para salvar configurações
  const saveSettings = async () => {
    setLoading(true);
    setSaveSuccess(false);
    
    try {
      // Tentando primeiro o endpoint específico de bônus
      const bonusPayload = {
        signupBonus: {
          enabled: signupBonus.enabled,
          amount: signupBonus.amount,
          rollover: signupBonus.rollover,
          expiration: signupBonus.expiration
        },
        firstDepositBonus: {
          enabled: firstDepositBonus.enabled,
          amount: firstDepositBonus.amount,
          percentage: firstDepositBonus.percentage,
          maxAmount: firstDepositBonus.maxAmount,
          rollover: firstDepositBonus.rollover,
          expiration: firstDepositBonus.expiration
        },
        promotionalBanners: {
          enabled: false
        }
      };
      
      console.log("Tentando enviar para endpoint de bônus:", bonusPayload);
      
      let response = await fetch("/api/admin/bonus-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bonusPayload)
      });
      
      // Se falhar, tenta o endpoint regular
      if (response.status === 403 || response.status === 401) {
        console.log("Tentando endpoint alternativo...");
        
        // Formato para endpoint regular
        const regularPayload = {
          signupBonusEnabled: signupBonus.enabled,
          signupBonusAmount: signupBonus.amount,
          signupBonusRollover: signupBonus.rollover,
          signupBonusExpiration: signupBonus.expiration,
          firstDepositBonusEnabled: firstDepositBonus.enabled,
          firstDepositBonusAmount: firstDepositBonus.amount,
          firstDepositBonusPercentage: firstDepositBonus.percentage,
          firstDepositBonusMaxAmount: firstDepositBonus.maxAmount,
          firstDepositBonusRollover: firstDepositBonus.rollover,
          firstDepositBonusExpiration: firstDepositBonus.expiration,
          promotionalBannersEnabled: false
        };
        
        console.log("Enviando para endpoint de settings:", regularPayload);
        
        response = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(regularPayload)
        });
      }
      
      if (!response.ok) {
        throw new Error(`Erro ao salvar configurações: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Resultado do salvamento:", result);
      
      setSaveSuccess(true);
      toast({
        title: "Configurações salvas",
        description: "As configurações de bônus foram atualizadas com sucesso!",
        variant: "default"
      });
      
      // Exibir mensagem adicional sobre bônus ativados
      let bonusesAtivados = [];
      if (signupBonus.enabled) bonusesAtivados.push("Bônus de Cadastro");
      if (firstDepositBonus.enabled) bonusesAtivados.push("Bônus de Primeiro Depósito");
      
      if (bonusesAtivados.length > 0) {
        setTimeout(() => {
          toast({
            title: "Bônus Ativados",
            description: `BÔNUS ATIVADOS: ${bonusesAtivados.join(" e ")}`,
            variant: "default"
          });
        }, 1000);
      } else {
        setTimeout(() => {
          toast({
            title: "Bônus Desativados",
            description: "Todos os bônus foram desativados",
            variant: "default"
          });
        }, 1000);
      }
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações de bônus.",
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
          <CardTitle>Bônus de Cadastro</CardTitle>
          <CardDescription>
            Configure o bônus concedido aos usuários quando se cadastram na plataforma
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar Bônus de Cadastro</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, novos usuários receberão um bônus ao se cadastrarem
              </p>
            </div>
            <Switch 
              checked={signupBonus.enabled}
              onCheckedChange={(checked) => setSignupBonus({...signupBonus, enabled: checked})}
            />
          </div>
          
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
              <p className="text-xs text-muted-foreground">Multiplicador do valor para liberação do bônus</p>
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
              <p className="text-xs text-muted-foreground">Dias até o bônus expirar</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bônus de Primeiro Depósito */}
      <Card>
        <CardHeader>
          <CardTitle>Bônus de Primeiro Depósito</CardTitle>
          <CardDescription>
            Configure o bônus concedido aos usuários no seu primeiro depósito
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar Bônus de Primeiro Depósito</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, usuários poderão receber um bônus no primeiro depósito
              </p>
            </div>
            <Switch 
              checked={firstDepositBonus.enabled}
              onCheckedChange={(checked) => setFirstDepositBonus({...firstDepositBonus, enabled: checked})}
            />
          </div>
          
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
              <Label htmlFor="first-deposit-max-amount">Valor Máximo do Bônus (R$)</Label>
              <Input 
                id="first-deposit-max-amount"
                type="number"
                value={firstDepositBonus.maxAmount}
                onChange={(e) => setFirstDepositBonus({...firstDepositBonus, maxAmount: Number(e.target.value)})}
                disabled={!firstDepositBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Valor máximo que será concedido como bônus, independente do percentual</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-deposit-amount">Valor Fixo Alternativo (R$)</Label>
              <Input 
                id="first-deposit-amount"
                type="number"
                value={firstDepositBonus.amount}
                onChange={(e) => setFirstDepositBonus({...firstDepositBonus, amount: Number(e.target.value)})}
                disabled={!firstDepositBonus.enabled}
              />
              <p className="text-xs text-muted-foreground">Valor fixo (usado se percentual for 0)</p>
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
              <p className="text-xs text-muted-foreground">Multiplicador do valor para liberação do bônus</p>
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
              <p className="text-xs text-muted-foreground">Dias até o bônus expirar</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Botões de Ação */}
      <div className="flex justify-end gap-4">
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
        >
          Cancelar
        </Button>
        <Button 
          onClick={saveSettings} 
          disabled={loading}
          className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {loading ? "Salvando..." : saveSuccess ? "✅ Salvo com Sucesso" : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default AdminBonusConfig;