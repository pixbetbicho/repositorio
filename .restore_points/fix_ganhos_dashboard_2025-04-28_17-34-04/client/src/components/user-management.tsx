import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, Filter, Edit, Trash, PlusCircle, DollarSign } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function UserManagement() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [editUserData, setEditUserData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    isAdmin: false,
  });
  const [newUserData, setNewUserData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    isAdmin: false,
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário criado com sucesso",
      });
      setNewUserOpen(false);
      setNewUserData({
        username: "",
        name: "",
        email: "",
        password: "",
        isAdmin: false,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: number; userData: any }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}`, userData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuário atualizado com sucesso",
      });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: number; amount: number }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/balance`, { amount });
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Saldo atualizado com sucesso",
        description: `Novo saldo: R$ ${updatedUser.balance.toFixed(2)}`,
      });
      setBalanceOpen(false);
      setAmount(0);
      
      // Invalidate all user-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar saldo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Usuário excluído com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUserData.username || !newUserData.password) {
      toast({
        title: "Preencha pelo menos o nome de usuário e senha",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(newUserData);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    // Only include password if it was changed
    const updateData: Record<string, any> = { ...editUserData };
    if (updateData.password === "") {
      const { password, ...rest } = updateData;
      return updateUserMutation.mutate({
        userId: selectedUser.id,
        userData: rest,
      });
    }

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: updateData,
    });
  };

  const handleUpdateBalance = () => {
    if (!selectedUser || amount === 0) return;
    
    updateBalanceMutation.mutate({
      userId: selectedUser.id,
      amount,
    });
  };

  const showUserDetails = (user: User) => {
    setSelectedUser(user);
    setDetailsOpen(true);
  };

  const showEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      username: user.username,
      name: user.name || "",
      email: user.email || "",
      password: "", // Don't prefill password
      isAdmin: user.isAdmin,
    });
    setEditOpen(true);
  };

  const showBalanceUpdate = (user: User) => {
    setSelectedUser(user);
    setAmount(0);
    setBalanceOpen(true);
  };

  const confirmDeleteUser = (user: User) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.username}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredUsers = users?.filter(user => {
    if (searchQuery) {
      return (
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return true;
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Gerenciar Usuários</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Buscar usuário..."
                className="pl-8 w-full sm:max-w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              size="sm" 
              className="w-full sm:w-auto"
              onClick={() => setNewUserOpen(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Visão Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{formatCurrency(user.balance)}</TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                            Admin
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Ver detalhes"
                            onClick={() => showUserDetails(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Editar usuário"
                            onClick={() => showEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Gerenciar saldo"
                            onClick={() => showBalanceUpdate(user)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          {!user.isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Excluir usuário"
                              onClick={() => confirmDeleteUser(user)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Visão Mobile */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {isLoading ? (
              <div className="text-center py-4">Carregando...</div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{user.username}</span>
                        {user.isAdmin && (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        ID: {user.id} • {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => showBalanceUpdate(user)}
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => showEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    {user.name && (
                      <>
                        <div className="text-gray-500">Nome:</div>
                        <div className="font-medium">{user.name}</div>
                      </>
                    )}
                    
                    {user.email && (
                      <>
                        <div className="text-gray-500">Email:</div>
                        <div className="font-medium">{user.email}</div>
                      </>
                    )}
                    
                    <div className="text-gray-500">Saldo:</div>
                    <div className="font-medium">{formatCurrency(user.balance)}</div>
                  </div>
                  
                  <div className="flex justify-between mt-4 pt-2 border-t border-gray-200">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary"
                      onClick={() => showUserDetails(user)}
                    >
                      <Eye className="h-4 w-4 mr-2" /> Detalhes
                    </Button>
                    
                    {!user.isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => confirmDeleteUser(user)}
                      >
                        <Trash className="h-4 w-4 mr-2" /> Excluir
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                Nenhum usuário encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre o usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedUser && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-semibold">ID:</div>
                  <div>{selectedUser.id}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-semibold">Nome de Usuário:</div>
                  <div>{selectedUser.username}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-semibold">Nome Completo:</div>
                  <div>{selectedUser.name || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-semibold">Email:</div>
                  <div>{selectedUser.email || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-semibold">Saldo:</div>
                  <div>{formatCurrency(selectedUser.balance)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-semibold">Admin:</div>
                  <div>{selectedUser.isAdmin ? "Sim" : "Não"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-semibold">Data de Criação:</div>
                  <div>
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-center sm:justify-end">
            <Button 
              onClick={() => setDetailsOpen(false)}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-username" className="sm:text-right">
                Usuário
              </Label>
              <Input
                id="edit-username"
                value={editUserData.username}
                onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-name" className="sm:text-right">
                Nome
              </Label>
              <Input
                id="edit-name"
                value={editUserData.name}
                onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-email" className="sm:text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-password" className="sm:text-right">
                Nova Senha
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                className="col-span-1 sm:col-span-3"
                placeholder="Deixe em branco para manter a atual"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="edit-isAdmin" className="sm:text-right">
                Admin
              </Label>
              <div className="flex items-center space-x-2 col-span-1 sm:col-span-3">
                <Checkbox 
                  id="edit-isAdmin" 
                  checked={editUserData.isAdmin} 
                  onCheckedChange={(checked) => 
                    setEditUserData({ ...editUserData, isAdmin: checked === true })
                  } 
                />
                <label
                  htmlFor="edit-isAdmin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Este usuário é um administrador
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setEditOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={updateUserMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateUserMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New User Dialog */}
      <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="new-username" className="sm:text-right">
                Usuário *
              </Label>
              <Input
                id="new-username"
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="new-name" className="sm:text-right">
                Nome
              </Label>
              <Input
                id="new-name"
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="new-email" className="sm:text-right">
                Email
              </Label>
              <Input
                id="new-email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="new-password" className="sm:text-right">
                Senha *
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="new-isAdmin" className="sm:text-right">
                Admin
              </Label>
              <div className="flex items-center space-x-2 col-span-1 sm:col-span-3">
                <Checkbox 
                  id="new-isAdmin" 
                  checked={newUserData.isAdmin} 
                  onCheckedChange={(checked) => 
                    setNewUserData({ ...newUserData, isAdmin: checked === true })
                  } 
                />
                <label
                  htmlFor="new-isAdmin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Este usuário é um administrador
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setNewUserOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={createUserMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createUserMutation.isPending ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Update Dialog */}
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Atualize o saldo do usuário <strong>{selectedUser.username}</strong>.<br />
                  Saldo atual: <strong>{formatCurrency(selectedUser.balance)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-1 sm:gap-4">
              <Label htmlFor="balance-amount" className="sm:text-right">
                Valor
              </Label>
              <Input
                id="balance-amount"
                type="number"
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="col-span-1 sm:col-span-3"
                placeholder="Positivo para adicionar, negativo para remover"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setBalanceOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateBalance} 
              disabled={updateBalanceMutation.isPending || amount === 0}
              className="w-full sm:w-auto"
            >
              {updateBalanceMutation.isPending ? "Atualizando..." : "Atualizar saldo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}