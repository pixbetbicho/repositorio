import { hashPassword } from './server/auth';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function resetAdminPassword() {
  console.log("======== RECONFIGURAÇÃO DE SENHA DE ADMIN ========");
  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  
  try {
    // Verificar se o usuário admin existe
    const [existingAdmin] = await db.select().from(users).where(eq(users.username, adminUsername));
    
    if (!existingAdmin) {
      console.log(`Usuário ${adminUsername} não encontrado`);
      return;
    }
    
    // Gerar nova senha hash
    const hashedPassword = await hashPassword(adminPassword);
    
    // Atualizar senha
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, existingAdmin.id));
    
    console.log(`Senha do usuário ${adminUsername} (ID: ${existingAdmin.id}) redefinida com sucesso!`);
    
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
  }
}

resetAdminPassword().finally(() => {
  console.log("======== PROCESSO CONCLUÍDO ========");
  process.exit(0);
});