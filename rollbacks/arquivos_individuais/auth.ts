import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
// A validação de CPF foi removida

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  // Check if the stored password is already hashed
  if (!stored.includes('.')) {
    // For demo purposes, allow direct comparison (initial admin password)
    return supplied === stored;
  }

  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`Configurando autenticação no ambiente: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "bichomania-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'none' : 'lax', // Em produção, usar 'none' para permitir cross-site cookies
      httpOnly: true, 
      secure: isProduction, // Em produção, apenas HTTPS
      path: '/',
      domain: isProduction ? undefined : undefined // Deixamos undefined para usar o domínio atual
    }
  };
  
  console.log(`Configuração de cookies: ${JSON.stringify(sessionSettings.cookie)}`);
  
  // Verificando variáveis de ambiente para debug
  console.log(`SESSION_SECRET configurado: ${process.env.SESSION_SECRET ? 'Sim' : 'Não'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
  

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Usuário já existe");
      }
      
      // CPF não é mais obrigatório para cadastro

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remover senha antes de retornar ao cliente
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Remover senha antes de retornar ao cliente
    if (req.user) {
      const { password, ...userWithoutPassword } = req.user;
      res.status(200).json(userWithoutPassword);
    } else {
      res.status(401).json({ message: "Authentication failed" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remover senha antes de retornar ao cliente
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Atualizar chave PIX padrão do usuário
  app.put('/api/user/pix-key', (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      
      const userId = req.user!.id;
      const { pixKey, pixKeyType } = req.body;
      
      // Validar se os campos obrigatórios estão presentes
      if (!pixKey || !pixKeyType) {
        return res.status(400).json({ message: "Chave PIX e tipo são obrigatórios" });
      }
      
      // Validar o tipo da chave (apenas email por enquanto)
      if (pixKeyType !== "email") {
        return res.status(400).json({ message: "Tipo de chave PIX inválido. Apenas email é suportado no momento." });
      }
      
      // Validação básica de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(pixKey)) {
        return res.status(400).json({ message: "Formato de email inválido" });
      }
      
      // Atualizar o email do usuário para a chave PIX
      storage.updateUser(userId, {
        email: pixKey
      }).then(updatedUser => {
        if (!updatedUser) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        // Remover senha antes de retornar
        const { password, ...userWithoutPassword } = updatedUser;
        res.json({ message: "Chave PIX atualizada com sucesso", user: userWithoutPassword });
      }).catch(error => {
        console.error("Erro ao atualizar chave PIX:", error);
        res.status(500).json({ message: "Erro ao atualizar chave PIX" });
      });
      
    } catch (error) {
      console.error("Erro ao processar atualização de chave PIX:", error);
      res.status(500).json({ message: "Erro ao processar solicitação" });
    }
  });
}
