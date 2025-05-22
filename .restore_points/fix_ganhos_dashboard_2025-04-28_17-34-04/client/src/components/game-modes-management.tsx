import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Edit2, Trash2, Plus } from "lucide-react";
import { type GameMode } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface GameModeFormData {
  id?: number;
  name: string;
  description: string;
  odds: number;
  active: boolean;
}

export function GameModesManagement() {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [formData, setFormData] = useState<GameModeFormData>({
    name: "",
    description: "",
    odds: 0,
    active: true,
  });

  // Query game modes
  const { data: gameModes = [], isLoading, error } = useQuery<GameMode[]>({
    queryKey: ["/api/game-modes"],
    queryFn: ({ queryKey }) => fetch(queryKey[0] as string).then(res => res.json()),
  });

  // Create game mode mutation
  const createGameModeMutation = useMutation({
    mutationFn: async (data: GameModeFormData) => {
      const res = await apiRequest("POST", "/api/game-modes", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-modes"] });
      setIsCreateModalOpen(false);
      resetForm();
      toast({
        title: "Modalidade criada",
        description: "A modalidade foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar modalidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update game mode mutation
  const updateGameModeMutation = useMutation({
    mutationFn: async (data: GameModeFormData) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PUT", `/api/game-modes/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-modes"] });
      setIsEditModalOpen(false);
      resetForm();
      toast({
        title: "Modalidade atualizada",
        description: "A modalidade foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar modalidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete game mode mutation
  const deleteGameModeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/game-modes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-modes"] });
      setIsDeleteModalOpen(false);
      setSelectedGameMode(null);
      toast({
        title: "Modalidade excluída",
        description: "A modalidade foi excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir modalidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else if (name === "odds") {
      // Usar o valor diretamente sem conversão para centavos
      const odds = parseFloat(value);
      setFormData({ ...formData, [name]: odds });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      odds: 0,
      active: true,
    });
    setSelectedGameMode(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGameModeMutation.mutate(formData);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGameMode) {
      updateGameModeMutation.mutate({ ...formData, id: selectedGameMode.id });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedGameMode) {
      deleteGameModeMutation.mutate(selectedGameMode.id);
    }
  };

  const openEditModal = (gameMode: GameMode) => {
    setSelectedGameMode(gameMode);
    setFormData({
      name: gameMode.name,
      description: gameMode.description || "",
      // Usar o valor diretamente sem conversão
      odds: gameMode.odds,
      active: gameMode.active,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (gameMode: GameMode) => {
    setSelectedGameMode(gameMode);
    setIsDeleteModalOpen(true);
  };

  // Format values for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar as modalidades. Por favor, tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Modalidades de Jogo</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Modalidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[550px] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Criar Nova Modalidade</DialogTitle>
              <DialogDescription>
                Preencha os detalhes da nova modalidade de jogo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="name" className="sm:text-right">Nome</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="sm:col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="description" className="sm:text-right">Descrição</Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="sm:col-span-3"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="odds" className="sm:text-right">Cotação (R$)</Label>
                  <Input
                    id="odds"
                    name="odds"
                    type="number"
                    step="0.01"
                    value={formData.odds}
                    onChange={handleInputChange}
                    className="sm:col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="active" className="sm:text-right">Ativo</Label>
                  <div className="flex items-center space-x-2 sm:col-span-3">
                    <Checkbox
                      id="active"
                      name="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, active: checked as boolean })
                      }
                    />
                    <label
                      htmlFor="active"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Disponível para apostas
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createGameModeMutation.isPending}
                >
                  {createGameModeMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modalidades Disponíveis</CardTitle>
          <CardDescription>
            Lista de todas as modalidades de jogo cadastradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Versão Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cotação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameModes.map((gameMode) => (
                  <TableRow key={gameMode.id}>
                    <TableCell>{gameMode.id}</TableCell>
                    <TableCell className="font-medium">{gameMode.name}</TableCell>
                    <TableCell>{gameMode.description}</TableCell>
                    <TableCell>{formatCurrency(gameMode.odds)}</TableCell>
                    <TableCell>
                      <span 
                        className={`px-2 py-1 rounded-full text-xs ${
                          gameMode.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {gameMode.active ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(gameMode)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteModal(gameMode)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {gameModes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Nenhuma modalidade encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Versão Mobile - Cards */}
          <div className="md:hidden space-y-4">
            {gameModes.length > 0 ? (
              gameModes.map((gameMode) => (
                <Card key={gameMode.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-lg">{gameMode.name}</div>
                        <div className="text-sm text-gray-500">{gameMode.description}</div>
                      </div>
                      <span 
                        className={`px-2 py-1 rounded-full text-xs ${
                          gameMode.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {gameMode.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    
                    <div className="flex items-center mb-3 bg-primary/10 p-2 rounded-md">
                      <div className="text-sm font-medium mr-1">Cotação:</div>
                      <div className="font-bold text-primary">{formatCurrency(gameMode.odds)}</div>
                      <div className="ml-auto text-xs text-gray-500">ID: {gameMode.id}</div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(gameMode)}
                        className="flex items-center"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteModal(gameMode)}
                        className="flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                Nenhuma modalidade encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[550px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Editar Modalidade</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da modalidade de jogo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-name" className="sm:text-right">Nome</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="sm:col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-description" className="sm:text-right">Descrição</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="sm:col-span-3"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-odds" className="sm:text-right">Cotação (R$)</Label>
                <Input
                  id="edit-odds"
                  name="odds"
                  type="number"
                  step="0.01"
                  value={formData.odds}
                  onChange={handleInputChange}
                  className="sm:col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="edit-active" className="sm:text-right">Ativo</Label>
                <div className="flex items-center space-x-2 sm:col-span-3">
                  <Checkbox
                    id="edit-active"
                    name="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, active: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="edit-active"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Disponível para apostas
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateGameModeMutation.isPending}
              >
                {updateGameModeMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a modalidade "{selectedGameMode?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteGameModeMutation.isPending}
            >
              {deleteGameModeMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}