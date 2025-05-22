import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { db } from "./server/db";
import { users } from "./shared/schema";

// Função para gerar hash da senha
async function hashPassword(password: string) {
  const scryptAsync = promisify(scrypt);
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function initializeAdmin() {
  try {
    console.log("Verificando se usuário admin já existe...");
    
    // Verificar se o admin já existe
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
    
    if (existingAdmin.length > 0) {
      console.log("Usuário admin já existe. ID:", existingAdmin[0].id);
      process.exit(0);
    }
    
    console.log("Criando usuário admin...");
    
    // Hash da senha
    const hashedPassword = await hashPassword("admin");
    
    // Criando usuário admin
    const admin = await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      name: "Administrador",
      email: "admin@bichomania.com",
      isAdmin: true,
      balance: 1000 // Saldo inicial para testes
    }).returning();
    
    console.log("Usuário admin criado com sucesso:", admin);
    process.exit(0);
  } catch (error) {
    console.error("Erro ao criar usuário admin:", error);
    process.exit(1);
  }
}

initializeAdmin();