// Query Client para atualização de cache no servidor
export const queryClient = {
  invalidateQueries: (queryKeys: string[]) => {
    // No servidor esta função não faz nada diretamente, 
    // mas mantemos para compatibilidade com o client
    console.log(`Seria necessário invalidar queries para: ${queryKeys.join(', ')}`);
  }
};