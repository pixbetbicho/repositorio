import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import http from 'http';
import { isProduction, isReplit, isLocalDev } from "./db"; // Apenas importar configurações de ambiente

// ---- INICIALIZAÇÃO DO SERVIDOR EXPRESS ----
console.log('======== INICIALIZAÇÃO DO SERVIDOR ========');
console.log(`🌐 Ambiente: ${isProduction ? 'PRODUÇÃO' : isReplit ? 'REPLIT' : 'DESENVOLVIMENTO LOCAL'}`);

// Criar aplicação Express
const app = express();

// Configurar CORS com settings adequados
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Set-Cookie", "Cookie"],
  exposedHeaders: ["Set-Cookie"]
}));

// Log de requisições para debugging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

// Rota de teste para diagnóstico
import path from "path";
app.get("/teste", (req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'server', 'test-page.html'));
});

// Configurações de parsing com limites generosos para uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log detalhado para chamadas de API para monitoramento de performance
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

// ---- CONFIGURAÇÕES DE PORTA ESPECÍFICAS PARA CADA AMBIENTE ----
// Detecção específica de porta por ambiente
const serverPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 
                  isReplit ? 5000 :    // Replit usa 5000
                  isProduction ? 8080 : // Produção usa 8080
                  3000;                // Dev local usa 3000

console.log(`🔌 Porta configurada para ${serverPort}`);

// Criar e iniciar o servidor HTTP imediatamente (requisito para Replit)
const server = http.createServer(app);

// Inicialização imediata da porta - não espera por banco de dados
server.listen(serverPort, "0.0.0.0", () => {
  console.log(`✅ Servidor aberto na porta ${serverPort}`);
  
  // Iniciar restante da aplicação de forma assíncrona
  startMainServer(server).catch(err => {
    console.error('❌ Erro grave na inicialização principal:', err);
  });
});

// ---- INICIALIZAÇÃO DA APLICAÇÃO PRINCIPAL ----
async function startMainServer(server: http.Server) {
  // Middleware global de tratamento de erros
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error("❌ Erro na aplicação:", err);
  });
  
  // IMPORTANTE: Registrar rotas da API ANTES do frontend
  // para garantir que as rotas da API tenham precedência
  try {
    // Registrar todas as rotas sem esperar confirmação do banco
    await registerRoutes(app);
    console.log("✅ API inicializada com sucesso");
  } catch (error) {
    console.error("❌ Erro crítico na inicialização das rotas:", error);
  }
  
  // Configurar ambiente frontend (Vite para dev, estatico para prod)
  // APÓS registrar as rotas da API
  try {
    if (app.get("env") === "development") {
      console.log("⚙️ Configurando Vite para ambiente de desenvolvimento...");
      await setupVite(app, server);
    } else {
      console.log("⚙️ Configurando arquivos estáticos para ambiente de produção...");
      serveStatic(app);
    }
  } catch (error) {
    console.error("❌ Erro ao configurar frontend:", error);
  }
  
  console.log("🚀 Servidor completamente inicializado");
  console.log("======== SERVIDOR PRONTO ========");
  
  // Não é mais necessário testar o banco de dados aqui, já foi testado no módulo db.ts
}
