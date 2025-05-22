import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PaymentGatewayTypeEnum } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  PlusCircle,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

// Definir o schema de validação
const paymentGatewayFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  type: z.enum(["pushinpay", "mercadopago", "pagseguro", "paypal"]),
  isActive: z.boolean().default(false),
  apiKey: z.string().min(1, "API Key é obrigatória"),
  secretKey: z.string().optional(),
  sandbox: z.boolean().default(true),
  config: z.any().optional(),
});

type PaymentGatewayFormValues = z.infer<typeof paymentGatewayFormSchema>;

// Definir a interface do Gateway de Pagamento
interface PaymentGateway {
  id: number;
  name: string;
  type: PaymentGatewayType;
  isActive: boolean;
  apiKey?: string;
  secretKey?: string;
  sandbox: boolean;
  config?: any;
  createdAt: string;
  updatedAt: string;
}

type PaymentGatewayType = z.infer<typeof PaymentGatewayTypeEnum>;

export function PaymentGatewayManagement() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const { toast } = useToast();

  // Query para obter todos os gateways de pagamento
  const { 
    data: gateways = [], 
    isLoading,
    isError,
    refetch
  } = useQuery<PaymentGateway[]>({
    queryKey: ["/api/admin/payment-gateways"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/payment-gateways");
      return await res.json();
    }
  });

  // Form usando React Hook Form + Zod
  const form = useForm<PaymentGatewayFormValues>({
    resolver: zodResolver(paymentGatewayFormSchema),
    defaultValues: {
      name: "",
      type: "pushinpay",
      isActive: false,
      apiKey: "",
      secretKey: "",
      sandbox: true,
    }
  });

  // Mutation para criar um novo gateway de pagamento
  const createGatewayMutation = useMutation({
    mutationFn: async (data: PaymentGatewayFormValues) => {
      const res = await apiRequest("POST", "/api/admin/payment-gateways", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Gateway criado com sucesso",
        description: "O gateway de pagamento foi adicionado ao sistema."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar gateway",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation para atualizar um gateway existente
  const updateGatewayMutation = useMutation({
    mutationFn: async (data: PaymentGatewayFormValues & { id: number }) => {
      const { id, ...gatewayData } = data;
      const res = await apiRequest("PATCH", `/api/admin/payment-gateways/${id}`, gatewayData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Gateway atualizado com sucesso",
        description: "As configurações do gateway foram atualizadas."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setIsFormOpen(false);
      setSelectedGateway(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar gateway",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation para excluir um gateway
  const deleteGatewayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/payment-gateways/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Gateway excluído com sucesso",
        description: "O gateway de pagamento foi removido do sistema."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateways"] });
      setIsDeleteDialogOpen(false);
      setSelectedGateway(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir gateway",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handler para editar um gateway
  const handleEditGateway = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
    form.setValue("name", gateway.name);
    form.setValue("type", gateway.type);
    form.setValue("isActive", gateway.isActive);
    form.setValue("apiKey", gateway.apiKey || "");
    form.setValue("secretKey", gateway.secretKey || "");
    form.setValue("sandbox", gateway.sandbox);
    form.setValue("config", gateway.config || {});
    setIsFormOpen(true);
  };

  // Handler para enviar o formulário
  const onSubmit = (data: PaymentGatewayFormValues) => {
    if (selectedGateway) {
      updateGatewayMutation.mutate({
        id: selectedGateway.id,
        ...data
      });
    } else {
      createGatewayMutation.mutate(data);
    }
  };

  // Handler para abrir o diálogo de confirmação de exclusão
  const handleDeleteClick = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
    setIsDeleteDialogOpen(true);
  };

  // Handler para confirmar a exclusão
  const handleConfirmDelete = () => {
    if (selectedGateway) {
      deleteGatewayMutation.mutate(selectedGateway.id);
    }
  };

  // Types dos gateways de pagamento com descrições amigáveis
  const gatewayTypes = [
    { value: "pushinpay", label: "Pushin Pay" },
    { value: "mercadopago", label: "Mercado Pago" },
    { value: "pagseguro", label: "PagSeguro" },
    { value: "paypal", label: "PayPal" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gateways de Pagamento</h2>
          <p className="text-muted-foreground">
            Gerencie os métodos de pagamento disponíveis na plataforma.
          </p>
        </div>
        <Button onClick={() => {
          setSelectedGateway(null);
          form.reset({
            name: "",
            type: "pushinpay",
            isActive: false,
            apiKey: "",
            secretKey: "",
            sandbox: true,
          });
          setIsFormOpen(true);
        }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo Gateway
        </Button>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao carregar os gateways de pagamento. Tente novamente.
          </AlertDescription>
        </Alert>
      ) : gateways.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum gateway configurado</CardTitle>
            <CardDescription>
              Adicione um gateway de pagamento para permitir que os usuários façam depósitos.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => {
              setSelectedGateway(null);
              form.reset();
              setIsFormOpen(true);
            }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Gateway
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateways.map((gateway) => (
                <TableRow key={gateway.id}>
                  <TableCell className="font-medium">{gateway.name}</TableCell>
                  <TableCell>
                    {gatewayTypes.find(t => t.value === gateway.type)?.label || gateway.type}
                  </TableCell>
                  <TableCell>
                    {gateway.isActive ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {gateway.sandbox ? (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Sandbox</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Produção</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(gateway.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditGateway(gateway)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(gateway)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Diálogo de formulário para adicionar/editar gateway */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedGateway ? "Editar Gateway" : "Adicionar Gateway"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do gateway de pagamento para permitir depósitos na plataforma.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do gateway" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nome que será exibido para os usuários.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de gateway" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gatewayTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Provedor do serviço de pagamento.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Chave de API" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secret Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Chave secreta (opcional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sandbox"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div>
                        <FormLabel>Modo Sandbox</FormLabel>
                        <FormDescription className="text-xs">
                          Ative para testes sem pagamentos reais.
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

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div>
                        <FormLabel>Ativo</FormLabel>
                        <FormDescription className="text-xs">
                          Disponível para os usuários.
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
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFormOpen(false);
                    setSelectedGateway(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createGatewayMutation.isPending || updateGatewayMutation.isPending}
                >
                  {(createGatewayMutation.isPending || updateGatewayMutation.isPending) && (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {selectedGateway ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o gateway "{selectedGateway?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedGateway(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteGatewayMutation.isPending}
            >
              {deleteGatewayMutation.isPending && (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}