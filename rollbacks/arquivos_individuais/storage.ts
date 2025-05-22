import { 
  users, animals, bets, draws, gameModes, paymentGateways, paymentTransactions,
  withdrawals, transactions,
  type User, type InsertUser, 
  type Animal, type InsertAnimal, 
  type Bet, type InsertBet, 
  type Draw, type InsertDraw,
  type GameMode, type InsertGameMode,
  type PaymentGateway, type InsertPaymentGateway,
  type PaymentTransaction, type InsertPaymentTransaction,
  type Withdrawal, type InsertWithdrawal, type WithdrawalStatus,
  type Transaction, type InsertTransaction, type TransactionType
} from "@shared/schema";
import express from "express";
import session from "express-session";
import { eq, and, gt, desc, asc, sql, count, inArray } from "drizzle-orm";
import { db, pool } from "./db";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Atualizando BetWithDetails na storage.ts para refletir as mudanças no schema
interface BetWithDetails extends Bet {
  animal?: Animal;
  animal2?: Animal;
  animal3?: Animal;
  animal4?: Animal;
  animal5?: Animal;
  draw: Draw;
  gameMode?: GameMode;
}

// Interface para configurações do sistema
interface SystemSettings {
  maxBetAmount: number;
  maxPayout: number;
  minBetAmount: number; // Valor mínimo de aposta
  defaultBetAmount: number; // Valor padrão de aposta
  mainColor: string;
  secondaryColor: string;
  accentColor: string;
  allowUserRegistration: boolean;
  allowDeposits: boolean;
  allowWithdrawals: boolean;
  maintenanceMode: boolean;
  autoApproveWithdrawals: boolean; // Habilita/desabilita aprovação automática de saques
  autoApproveWithdrawalLimit: number; // Valor limite para aprovação automática (ex: R$30,00)
}

export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User | undefined>;
  updateUser(userId: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(userId: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Animal Management
  getAnimal(id: number): Promise<Animal | undefined>;
  getAnimalByGroup(group: number): Promise<Animal | undefined>;
  getAllAnimals(): Promise<Animal[]>;
  createAnimal(animal: InsertAnimal): Promise<Animal>;
  
  // Bet Management
  getBet(id: number): Promise<Bet | undefined>;
  updateBet(betId: number, betData: Partial<Bet>): Promise<Bet | undefined>;
  createBet(bet: InsertBet): Promise<Bet>;
  getBetsByUserId(userId: number): Promise<BetWithDetails[]>;
  getBetsByDrawId(drawId: number): Promise<Bet[]>;
  updateBetStatus(betId: number, status: string, winAmount?: number): Promise<Bet | undefined>;
  getAllBets(): Promise<Bet[]>;
  getPaginatedBets(options: {
    page: number;
    pageSize: number;
    status?: string | null;
    search?: string | null;
    sortOrder?: string;
  }): Promise<{
    bets: BetWithDetails[];
    total: number;
  }>;
  
  // Draw Management
  createDraw(draw: InsertDraw): Promise<Draw>;
  getDraw(id: number): Promise<Draw | undefined>;
  getUpcomingDraws(): Promise<Draw[]>;
  updateDraw(drawId: number, drawData: Partial<Draw>): Promise<Draw | undefined>;
  deleteDraw(drawId: number): Promise<void>;
  updateDrawResult(
    drawId: number, 
    resultAnimalId: number,
    resultAnimalId2?: number,
    resultAnimalId3?: number,
    resultAnimalId4?: number,
    resultAnimalId5?: number
  ): Promise<Draw | undefined>;
  getAllDraws(): Promise<Draw[]>;
  
  // Game Mode Management
  getGameMode(id: number): Promise<GameMode | undefined>;
  getGameModeByName(name: string): Promise<GameMode | undefined>;
  getAllGameModes(): Promise<GameMode[]>;
  createGameMode(gameMode: InsertGameMode): Promise<GameMode>;
  updateGameMode(id: number, gameMode: Partial<GameMode>): Promise<GameMode | undefined>;
  deleteGameMode(id: number): Promise<void>;
  
  // System Settings Management
  getSystemSettings(): Promise<SystemSettings | null>;
  saveSystemSettings(settings: SystemSettings): Promise<SystemSettings>;
  
  // Stats
  getPopularAnimals(): Promise<{animalId: number, count: number}[]>;
  
  // Payment Gateway Management
  getAllPaymentGateways(): Promise<PaymentGateway[]>;
  getPaymentGateway(id: number): Promise<PaymentGateway | undefined>;
  getPaymentGatewayByType(type: string): Promise<PaymentGateway | undefined>;
  createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway>;
  updatePaymentGateway(id: number, gateway: Partial<PaymentGateway>): Promise<PaymentGateway | undefined>;
  deletePaymentGateway(id: number): Promise<void>;
  
  // Payment Transaction Management
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined>;
  getUserTransactions(userId: number): Promise<PaymentTransaction[]>;
  updateTransactionStatus(id: number, status: string, externalId?: string, externalUrl?: string, response?: any): Promise<PaymentTransaction | undefined>;
  
  // Withdrawal Management
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getWithdrawal(id: number): Promise<Withdrawal | undefined>;
  getUserWithdrawals(userId: number): Promise<Withdrawal[]>;
  getAllWithdrawals(status?: WithdrawalStatus): Promise<Withdrawal[]>;
  updateWithdrawalStatus(id: number, status: WithdrawalStatus, processedBy?: number, rejectionReason?: string, notes?: string): Promise<Withdrawal | undefined>;
  
  // Transaction Management (for financial reports)
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactionHistory(userId: number): Promise<Transaction[]>;
  getAllTransactions(type?: TransactionType, startDate?: Date, endDate?: Date): Promise<Transaction[]>;
  getTransactionsSummary(startDate?: Date, endDate?: Date): Promise<{
    deposits: { count: number, total: number },
    withdrawals: { count: number, total: number },
    bets: { count: number, total: number },
    wins: { count: number, total: number }
  }>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    this.initializeData();
  }

  private async migrateIntegerToRealColumns() {
    try {
      console.log("Migrando colunas de INTEGER para REAL...");
      
      // Verificar se a tabela bets existe
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'bets'
        );
      `);
      
      if (tableExists.rows[0].exists) {
        console.log("A tabela bets existe, verificando tipo das colunas...");
        
        // Verificar tipo da coluna amount
        const checkAmountType = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'bets' AND column_name = 'amount';
        `);
        
        if (checkAmountType.rows.length > 0 && checkAmountType.rows[0].data_type === 'integer') {
          console.log("Migrando coluna amount de INTEGER para REAL...");
          await pool.query(`ALTER TABLE bets ALTER COLUMN amount TYPE REAL USING amount::REAL;`);
          console.log("Coluna amount migrada com sucesso!");
        }
        
        // Verificar tipo da coluna win_amount
        const checkWinAmountType = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'bets' AND column_name = 'win_amount';
        `);
        
        if (checkWinAmountType.rows.length > 0 && checkWinAmountType.rows[0].data_type === 'integer') {
          console.log("Migrando coluna win_amount de INTEGER para REAL...");
          await pool.query(`ALTER TABLE bets ALTER COLUMN win_amount TYPE REAL USING win_amount::REAL;`);
          console.log("Coluna win_amount migrada com sucesso!");
        }
        
        // Verificar tipo da coluna potential_win_amount
        const checkPotentialWinType = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'bets' AND column_name = 'potential_win_amount';
        `);
        
        if (checkPotentialWinType.rows.length > 0 && checkPotentialWinType.rows[0].data_type === 'integer') {
          console.log("Migrando coluna potential_win_amount de INTEGER para REAL...");
          await pool.query(`ALTER TABLE bets ALTER COLUMN potential_win_amount TYPE REAL USING potential_win_amount::REAL;`);
          console.log("Coluna potential_win_amount migrada com sucesso!");
        }
      }
      
      // Verificar se a tabela users existe e adicionar coluna cpf
      const checkUsersTableForCpf = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      if (checkUsersTableForCpf.rows[0].exists) {
        console.log("A tabela users existe, verificando coluna cpf...");
        
        // Verificar se a coluna cpf existe
        const checkCpfColumn = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'cpf'
          );
        `);
        
        if (!checkCpfColumn.rows[0].exists) {
          console.log("Adicionando coluna cpf à tabela users...");
          await pool.query(`
            ALTER TABLE users 
            ADD COLUMN cpf TEXT UNIQUE
          `);
          console.log("Coluna cpf adicionada com sucesso!");
        } else {
          console.log("Coluna cpf já existe na tabela users.");
        }
      }
      
      // Verificar se a tabela payment_transactions existe
      const paymentsTableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'payment_transactions'
        );
      `);
      
      if (paymentsTableExists.rows[0].exists) {
        console.log("A tabela payment_transactions existe, verificando coluna type...");
        
        // Verificar se a coluna type existe
        const checkTypeColumn = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'payment_transactions' 
            AND column_name = 'type'
          );
        `);
        
        if (!checkTypeColumn.rows[0].exists) {
          console.log("Adicionando coluna type à tabela payment_transactions...");
          await pool.query(`
            ALTER TABLE payment_transactions 
            ADD COLUMN type TEXT NOT NULL DEFAULT 'deposit'
          `);
          console.log("Coluna type adicionada com sucesso!");
        } else {
          console.log("Coluna type já existe na tabela payment_transactions.");
        }
      }
      
      // Verificar se a tabela system_settings existe
      const settingsTableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'system_settings'
        );
      `);
      
      if (settingsTableExists.rows[0].exists) {
        console.log("A tabela system_settings existe, verificando tipo das colunas...");
        
        // Verificar tipo da coluna max_bet_amount
        const checkMaxBetType = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'system_settings' AND column_name = 'max_bet_amount';
        `);
        
        if (checkMaxBetType.rows.length > 0 && checkMaxBetType.rows[0].data_type === 'integer') {
          console.log("Migrando coluna max_bet_amount de INTEGER para REAL...");
          await pool.query(`ALTER TABLE system_settings ALTER COLUMN max_bet_amount TYPE REAL USING max_bet_amount::REAL;`);
          console.log("Coluna max_bet_amount migrada com sucesso!");
        }
        
        // Verificar tipo da coluna max_payout
        const checkMaxPayoutType = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'system_settings' AND column_name = 'max_payout';
        `);
        
        if (checkMaxPayoutType.rows.length > 0 && checkMaxPayoutType.rows[0].data_type === 'integer') {
          console.log("Migrando coluna max_payout de INTEGER para REAL...");
          await pool.query(`ALTER TABLE system_settings ALTER COLUMN max_payout TYPE REAL USING max_payout::REAL;`);
          console.log("Coluna max_payout migrada com sucesso!");
        }
        
        // Verificar tipo da coluna min_bet_amount
        const checkMinBetType = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'system_settings' AND column_name = 'min_bet_amount';
        `);
        
        if (checkMinBetType.rows.length > 0 && checkMinBetType.rows[0].data_type === 'integer') {
          console.log("Migrando coluna min_bet_amount de INTEGER para REAL...");
          await pool.query(`ALTER TABLE system_settings ALTER COLUMN min_bet_amount TYPE REAL USING min_bet_amount::REAL/100;`);
          console.log("Coluna min_bet_amount migrada com sucesso!");
        }
        
        // Verificar tipo da coluna default_bet_amount
        const checkDefaultBetType = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'system_settings' AND column_name = 'default_bet_amount';
        `);
        
        if (checkDefaultBetType.rows.length > 0 && checkDefaultBetType.rows[0].data_type === 'integer') {
          console.log("Migrando coluna default_bet_amount de INTEGER para REAL...");
          await pool.query(`ALTER TABLE system_settings ALTER COLUMN default_bet_amount TYPE REAL USING default_bet_amount::REAL/100;`);
          console.log("Coluna default_bet_amount migrada com sucesso!");
        }
      }
      
      // Verificar se a tabela users existe e migrar o campo balance
      const userBalanceTableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      if (userBalanceTableCheck.rows[0].exists) {
        console.log("A tabela users existe, verificando tipo da coluna balance...");
        
        // Verificar tipo da coluna balance
        const checkBalanceType = await pool.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'balance';
        `);
        
        if (checkBalanceType.rows.length > 0 && checkBalanceType.rows[0].data_type === 'integer') {
          console.log("Migrando coluna balance de INTEGER para REAL...");
          await pool.query(`ALTER TABLE users ALTER COLUMN balance TYPE REAL USING balance::REAL;`);
          console.log("Coluna balance migrada com sucesso!");
        }
      }
      
      console.log("Migração de colunas concluída com sucesso!");
    } catch (error) {
      console.error("Erro ao migrar colunas INTEGER para REAL:", error);
    }
  }
  
  private async initializeData() {
    try {
      // Verificar se estamos em ambiente de produção
      const isProduction = process.env.NODE_ENV === 'production';
      console.log(`Iniciando banco de dados no modo: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
      
      // Cria as tabelas se não existirem
      await this.createTables();
      
      // Tenta migrar as colunas de INTEGER para REAL no banco de dados
      await this.migrateIntegerToRealColumns();
      
      // VERIFICAÇÃO ESPECIAL: Para o DigitalOcean, verificamos se o banco está vazio
      // e força a inicialização completa se necessário
      if (isProduction) {
        // Verificar se há dados no banco de produção
        const userCount = await db.select({ count: count() }).from(users);
        const isEmpty = userCount[0].count === 0;
        
        if (isEmpty) {
          console.log("🔴 BANCO DE DADOS DE PRODUÇÃO VAZIO! Forçando inicialização completa...");
          
          // Inicializa os animais
          console.log("Forçando inicialização dos animais...");
          await this.initializeAnimals();
          
          // Inicializa o admin com senha específica
          console.log("Forçando inicialização do usuário admin...");
          const adminExists = await this.getUserByUsername("admin");
          if (!adminExists) {
            const { hashPassword } = await import('./auth');
            const hashedPassword = await hashPassword("admin");
            
            console.log("Criando usuário admin em PRODUÇÃO");
            await db.insert(users).values({
              username: "admin",
              password: hashedPassword,
              email: "admin@bichomania.com",
              name: "Administrator",
              balance: 0,
              isAdmin: true,
              createdAt: new Date(),
            });
          }
          
          // Inicializa os sorteios
          console.log("Forçando inicialização dos sorteios...");
          await this.initializeDraws();
          
          // Inicializa as modalidades de jogo
          console.log("Forçando inicialização das modalidades de jogo...");
          await this.initializeGameModes();
          
          // Inicializa as configurações do sistema
          console.log("Forçando inicialização das configurações do sistema...");
          await this.saveSystemSettings({
            maxBetAmount: 10000.0,
            maxPayout: 1000000.0,
            minBetAmount: 5.0,
            defaultBetAmount: 20.0,
            mainColor: "#4f46e5",
            secondaryColor: "#6366f1",
            accentColor: "#f97316",
            allowUserRegistration: true,
            allowDeposits: true,
            allowWithdrawals: true,
            maintenanceMode: false,
            autoApproveWithdrawals: true,
            autoApproveWithdrawalLimit: 30.0
          });
          
          console.log("✅ Inicialização forçada do banco de dados de PRODUÇÃO concluída!");
        } else {
          console.log("Banco de dados de produção já contém dados. Iniciando normalmente...");
        }
      }
      
      // Em modo normal/desenvolvimento, segue o fluxo padrão
      
      // Inicializa os animais
      const animalCount = await db.select({ count: count() }).from(animals);
      if (animalCount[0].count === 0) {
        console.log("Initializing animals data");
        await this.initializeAnimals();
      } else {
        console.log("Animals data already exists, skipping initialization");
      }
      
      // Inicializa o usuário admin
      await this.initializeAdmin();
      
      // Inicializa os sorteios
      const drawCount = await db.select({ count: count() }).from(draws);
      if (drawCount[0].count === 0) {
        console.log("Initializing draws data");
        await this.initializeDraws();
      } else {
        console.log("Draw data already exists, skipping initialization");
      }
      
      // Inicializa as modalidades de jogo
      const gameModeCount = await db.select({ count: count() }).from(gameModes);
      if (gameModeCount[0].count === 0) {
        console.log("Initializing game modes data");
        await this.initializeGameModes();
      } else {
        console.log("Game modes already exist, skipping initialization");
      }
      
      // Verificar se as configurações do sistema existem
      // Usamos SQL bruto porque systemSettings não está sendo importado corretamente
      const settingsCountQuery = await pool.query(`SELECT COUNT(*) FROM system_settings`);
      if (parseInt(settingsCountQuery.rows[0].count) === 0) {
        console.log("Initializing system settings");
        await this.saveSystemSettings({
          maxBetAmount: 10000.0,
          maxPayout: 1000000.0,
          minBetAmount: 5.0, // valor em reais (R$ 5,00)
          defaultBetAmount: 20.0, // valor em reais (R$ 20,00)
          mainColor: "#4f46e5", // indigo-600
          secondaryColor: "#6366f1", // indigo-500
          accentColor: "#f97316", // orange-500
          allowUserRegistration: true,
          allowDeposits: true,
          allowWithdrawals: true,
          maintenanceMode: false,
          autoApproveWithdrawals: true,
          autoApproveWithdrawalLimit: 30.0
        });
      } else {
        // Atualiza a tabela de configurações se necessário
        await this.updateSystemSettingsTable();
      }
      
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing data:", error);
    }
  }
  
  private async updateSystemSettingsTable() {
    try {
      // Verificar se as colunas existem na tabela system_settings
      const checkColumns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'system_settings' 
        AND column_name IN ('min_bet_amount', 'default_bet_amount')
      `);
      
      // Se não encontrar as duas colunas, precisamos adicionar
      if (checkColumns.rows.length < 2) {
        console.log("Atualizando tabela system_settings para incluir novos campos...");
        
        try {
          // Adicionar novas colunas se elas não existirem
          await pool.query(`
            ALTER TABLE system_settings 
            ADD COLUMN IF NOT EXISTS min_bet_amount REAL NOT NULL DEFAULT 5.0,
            ADD COLUMN IF NOT EXISTS default_bet_amount REAL NOT NULL DEFAULT 20.0
          `);
          
          console.log("Tabela system_settings atualizada com sucesso");
        } catch (error) {
          console.error("Erro ao adicionar colunas:", error);
          
          // Se falhar em adicionar colunas, tentamos recriar a tabela
          await pool.query(`
            -- Dropando tabela existente
            DROP TABLE IF EXISTS system_settings;
            
            -- Recriando com novos campos
            CREATE TABLE system_settings (
              id SERIAL PRIMARY KEY,
              max_bet_amount INTEGER NOT NULL,
              max_payout INTEGER NOT NULL,
              min_bet_amount INTEGER NOT NULL DEFAULT 50,
              default_bet_amount INTEGER NOT NULL DEFAULT 200,
              main_color TEXT NOT NULL,
              secondary_color TEXT NOT NULL,
              accent_color TEXT NOT NULL,
              allow_user_registration BOOLEAN NOT NULL DEFAULT TRUE,
              allow_deposits BOOLEAN NOT NULL DEFAULT TRUE,
              allow_withdrawals BOOLEAN NOT NULL DEFAULT TRUE,
              maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
          `);
          
          console.log("Tabela system_settings recriada com sucesso");
        }
      } else {
        console.log("Colunas min_bet_amount e default_bet_amount já existem na tabela");
      }
      
      // Verificar se as colunas de chave PIX padrão existem na tabela users
      const checkUserColumns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('default_pix_key', 'default_pix_key_type')
      `);
      
      // Se não encontrar as duas colunas, precisamos adicionar
      if (checkUserColumns.rows.length < 2) {
        console.log("Atualizando tabela users para incluir campos de chave PIX padrão...");
        
        // Adicionar as colunas de chave PIX padrão
        await pool.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS default_pix_key TEXT,
          ADD COLUMN IF NOT EXISTS default_pix_key_type TEXT
        `);
        
        console.log("Colunas de chave PIX padrão adicionadas com sucesso à tabela users");
      } else {
        console.log("Colunas default_pix_key e default_pix_key_type já existem na tabela users");
      }
    } catch (error) {
      console.error("Erro ao verificar/atualizar tabela system_settings:", error);
    }
  }
  
  private async initializeGameModes() {
    // Lista de modalidades e cotações
    const gameModeData: InsertGameMode[] = [
      { name: "Milhar", description: "Jogo na milhar (4 números)", odds: 800000, active: true },
      { name: "Centena", description: "Jogo na centena (3 números)", odds: 80000, active: true },
      { name: "Grupo", description: "Jogo no grupo", odds: 2100, active: true },
      { name: "Dezena", description: "Jogo na dezena (2 números)", odds: 8400, active: true },
      { name: "Duque de Grupo", description: "Jogo em 2 grupos", odds: 2000, active: true },
      { name: "Duque de Dezena", description: "Jogo em 2 dezenas", odds: 30000, active: true },
      { name: "Quadra de Duque", description: "Jogo em 4 grupos em dupla", odds: 100000, active: true },
      { name: "Terno de Grupo", description: "Jogo em 3 grupos", odds: 15000, active: true },
      { name: "Terno de Dezena", description: "Jogo em 3 dezenas", odds: 600000, active: true },
      { name: "Quina de Grupo", description: "Jogo em 5 grupos", odds: 500000, active: true },
      { name: "Passe IDA", description: "Passe simples", odds: 9000, active: true },
      { name: "Passe IDAxVOLTA", description: "Passe duplo", odds: 4500, active: true }
    ];
    
    for (const gameMode of gameModeData) {
      await db.insert(gameModes).values({
        ...gameMode,
        createdAt: new Date(),
      });
    }
    
    console.log("Game modes initialized successfully");
  }
  
  private async dropTables() {
    try {
      await pool.query(`
        DROP TABLE IF EXISTS bets CASCADE;
        DROP TABLE IF EXISTS draws CASCADE;
        DROP TABLE IF EXISTS animals CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS game_modes CASCADE;
      `);
      console.log("Tables dropped successfully");
    } catch (error) {
      console.error("Error dropping tables:", error);
      throw error;
    }
  }
  
  private async createTables() {
    try {
      // Create tables based on schema using Drizzle schema
      // Use push to schema to create the tables
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT,
          name TEXT,
          balance REAL NOT NULL DEFAULT 0.0,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS animals (
          id SERIAL PRIMARY KEY,
          "group" INTEGER NOT NULL,
          name TEXT NOT NULL,
          numbers TEXT[] NOT NULL,
          UNIQUE("group")
        );
        
        CREATE TABLE IF NOT EXISTS draws (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          time TEXT NOT NULL,
          date TIMESTAMP WITH TIME ZONE NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          result_animal_id INTEGER,
          result_animal_id_2 INTEGER,
          result_animal_id_3 INTEGER,
          result_animal_id_4 INTEGER,
          result_animal_id_5 INTEGER,
          result_number_1 TEXT,
          result_number_2 TEXT,
          result_number_3 TEXT,
          result_number_4 TEXT,
          result_number_5 TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS game_modes (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          odds INTEGER NOT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS bets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          animal_id INTEGER,
          animal_id_2 INTEGER,
          animal_id_3 INTEGER,
          animal_id_4 INTEGER,
          animal_id_5 INTEGER,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          draw_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          win_amount REAL,
          game_mode_id INTEGER,
          potential_win_amount REAL,
          bet_numbers TEXT[],
          premio_type TEXT DEFAULT '1',
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (animal_id) REFERENCES animals(id),
          FOREIGN KEY (animal_id_2) REFERENCES animals(id),
          FOREIGN KEY (animal_id_3) REFERENCES animals(id),
          FOREIGN KEY (animal_id_4) REFERENCES animals(id),
          FOREIGN KEY (animal_id_5) REFERENCES animals(id),
          FOREIGN KEY (draw_id) REFERENCES draws(id),
          FOREIGN KEY (game_mode_id) REFERENCES game_modes(id)
        );
        
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          max_bet_amount REAL NOT NULL,
          max_payout REAL NOT NULL,
          min_bet_amount REAL NOT NULL DEFAULT 5.0,
          default_bet_amount REAL NOT NULL DEFAULT 20.0,
          main_color TEXT NOT NULL,
          secondary_color TEXT NOT NULL,
          accent_color TEXT NOT NULL,
          allow_user_registration BOOLEAN NOT NULL DEFAULT TRUE,
          allow_deposits BOOLEAN NOT NULL DEFAULT TRUE,
          allow_withdrawals BOOLEAN NOT NULL DEFAULT TRUE,
          maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS payment_gateways (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT false,
          api_key TEXT,
          secret_key TEXT,
          sandbox BOOLEAN NOT NULL DEFAULT true,
          config JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          gateway_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          external_id TEXT,
          external_url TEXT,
          gateway_response JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (gateway_id) REFERENCES payment_gateways(id)
        );
      `);
      
      console.log("Tables created successfully");
    } catch (error) {
      console.error("Error creating tables:", error);
      throw error;
    }
  }

  private async initializeAnimals() {
    const animalData: InsertAnimal[] = [
      { group: 1, name: "Avestruz", numbers: ["01", "02", "03", "04"] },
      { group: 2, name: "Águia", numbers: ["05", "06", "07", "08"] },
      { group: 3, name: "Burro", numbers: ["09", "10", "11", "12"] },
      { group: 4, name: "Borboleta", numbers: ["13", "14", "15", "16"] },
      { group: 5, name: "Cachorro", numbers: ["17", "18", "19", "20"] },
      { group: 6, name: "Cabra", numbers: ["21", "22", "23", "24"] },
      { group: 7, name: "Carneiro", numbers: ["25", "26", "27", "28"] },
      { group: 8, name: "Camelo", numbers: ["29", "30", "31", "32"] },
      { group: 9, name: "Cobra", numbers: ["33", "34", "35", "36"] },
      { group: 10, name: "Coelho", numbers: ["37", "38", "39", "40"] },
      { group: 11, name: "Cavalo", numbers: ["41", "42", "43", "44"] },
      { group: 12, name: "Elefante", numbers: ["45", "46", "47", "48"] },
      { group: 13, name: "Galo", numbers: ["49", "50", "51", "52"] },
      { group: 14, name: "Gato", numbers: ["53", "54", "55", "56"] },
      { group: 15, name: "Jacaré", numbers: ["57", "58", "59", "60"] },
      { group: 16, name: "Leão", numbers: ["61", "62", "63", "64"] },
      { group: 17, name: "Macaco", numbers: ["65", "66", "67", "68"] },
      { group: 18, name: "Porco", numbers: ["69", "70", "71", "72"] },
      { group: 19, name: "Pavão", numbers: ["73", "74", "75", "76"] },
      { group: 20, name: "Peru", numbers: ["77", "78", "79", "80"] },
      { group: 21, name: "Touro", numbers: ["81", "82", "83", "84"] },
      { group: 22, name: "Tigre", numbers: ["85", "86", "87", "88"] },
      { group: 23, name: "Urso", numbers: ["89", "90", "91", "92"] },
      { group: 24, name: "Veado", numbers: ["93", "94", "95", "96"] },
      { group: 25, name: "Vaca", numbers: ["97", "98", "99", "00"] }
    ];

    for (const animal of animalData) {
      await this.createAnimal(animal);
    }
  }

  private async initializeAdmin() {
    try {
      // Check if admin exists
      const adminExists = await this.getUserByUsername("admin");
      if (!adminExists) {
        // Importar função de hash de senha de auth.ts
        const { hashPassword } = await import('./auth');
        const hashedPassword = await hashPassword("admin");
        
        console.log("Criando usuário admin com senha hashada");
        
        // Create an admin user
        await db.insert(users).values({
          username: "admin",
          password: hashedPassword, // Senha hashada apropriadamente
          email: "admin@bichomania.com",
          name: "Administrator",
          balance: 0,
          isAdmin: true,
          createdAt: new Date(),
        });
        
        console.log("Usuário admin criado com sucesso");
      } else {
        console.log("Usuário admin já existe, não é necessário criar");
      }
    } catch (error) {
      console.error("Erro ao inicializar admin:", error);
    }
  }

  // Método para criar sorteios para os próximos dias
  async createFutureDraws(numberOfDays: number = 3): Promise<void> {
    // Definições padrão de horários e nomes
    const times = ["14:00", "16:00", "18:00", "20:00"];
    const names = ["Federal", "PTM", "Coruja", "Noturno"];
    
    const today = new Date();
    console.log(`Criando sorteios para os próximos ${numberOfDays} dias a partir de ${today.toISOString()}`);
    
    // Criar sorteios para hoje (se ainda não passaram)
    for (let i = 0; i < times.length; i++) {
      const drawDate = new Date(today);
      drawDate.setHours(parseInt(times[i].split(':')[0]), parseInt(times[i].split(':')[1]), 0, 0);
      
      // Se o horário já passou hoje, não criar
      if (drawDate > today) {
        // Verificar se já existe um sorteio para este horário
        const existingDraws = await db
          .select()
          .from(draws)
          .where(
            and(
              eq(draws.time, times[i]),
              eq(draws.date, drawDate)
            )
          );
        
        if (existingDraws.length === 0) {
          console.log(`Criando sorteio para hoje: ${names[i]} às ${times[i]} em ${drawDate.toISOString()}`);
          try {
            const draw = await this.createDraw({
              name: names[i],
              time: times[i],
              date: drawDate,
            });
            console.log(`Sorteio criado com sucesso: ${draw.id}`);
          } catch (error) {
            console.error(`Falha ao criar sorteio ${names[i]}:`, error);
          }
        } else {
          console.log(`Sorteio para hoje ${names[i]} às ${times[i]} já existe.`);
        }
      }
    }
    
    // Criar sorteios para os próximos dias
    for (let day = 1; day < numberOfDays; day++) {
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + day);
      
      for (let i = 0; i < times.length; i++) {
        const drawDate = new Date(nextDay);
        drawDate.setHours(parseInt(times[i].split(':')[0]), parseInt(times[i].split(':')[1]), 0, 0);
        
        // Verificar se já existe um sorteio para este horário neste dia
        const existingDraws = await db
          .select()
          .from(draws)
          .where(
            and(
              eq(draws.time, times[i]),
              // Comparar apenas a data (sem a hora)
              and(
                gte(draws.date, new Date(drawDate.getFullYear(), drawDate.getMonth(), drawDate.getDate(), 0, 0, 0)),
                lt(draws.date, new Date(drawDate.getFullYear(), drawDate.getMonth(), drawDate.getDate() + 1, 0, 0, 0))
              )
            )
          );
        
        if (existingDraws.length === 0) {
          console.log(`Criando sorteio para futuro: ${names[i]} às ${times[i]} em ${drawDate.toISOString()}`);
          try {
            const draw = await this.createDraw({
              name: names[i],
              time: times[i],
              date: drawDate,
            });
            console.log(`Sorteio futuro criado com sucesso: ${draw.id}`);
          } catch (error) {
            console.error(`Falha ao criar sorteio futuro ${names[i]}:`, error);
          }
        } else {
          console.log(`Sorteio para ${drawDate.toDateString()} às ${times[i]} já existe.`);
        }
      }
    }
  }
  
  private async initializeDraws() {
    // Create upcoming draws
    const times = ["14:00", "16:00", "18:00", "20:00"];
    const names = ["Federal", "PTM", "Coruja", "Noturno"];
    
    const today = new Date();
    
    console.log("Initializing draws for dates:", today);
    
    for (let i = 0; i < times.length; i++) {
      const drawDate = new Date(today);
      drawDate.setHours(parseInt(times[i].split(':')[0]), parseInt(times[i].split(':')[1]), 0, 0);
      
      // If time already passed today, schedule for tomorrow
      if (drawDate < today) {
        drawDate.setDate(drawDate.getDate() + 1);
      }
      
      console.log(`Creating draw: ${names[i]} at ${times[i]} on ${drawDate.toISOString()}`);
      
      try {
        const draw = await this.createDraw({
          name: names[i],
          time: times[i],
          date: drawDate,
        });
        console.log(`Draw created successfully: ${draw.id}`);
      } catch (error) {
        console.error(`Failed to create draw ${names[i]}:`, error);
      }
    }
    
    // Create additional draws for the next 2 days
    for (let day = 1; day <= 2; day++) {
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + day);
      
      for (let i = 0; i < times.length; i++) {
        const drawDate = new Date(nextDay);
        drawDate.setHours(parseInt(times[i].split(':')[0]), parseInt(times[i].split(':')[1]), 0, 0);
        
        console.log(`Creating draw for future day: ${names[i]} at ${times[i]} on ${drawDate.toISOString()}`);
        
        try {
          const draw = await this.createDraw({
            name: names[i],
            time: times[i],
            date: drawDate,
          });
          console.log(`Future draw created successfully: ${draw.id}`);
        } catch (error) {
          console.error(`Failed to create future draw ${names[i]}:`, error);
        }
      }
    }
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      balance: 0,
      isAdmin: false,
      createdAt: new Date(),
    }).returning();
    return user;
  }

  async updateUserBalance(userId: number, amount: number): Promise<User | undefined> {
    console.log(`UPDATING BALANCE: User ID ${userId}, Amount: ${amount}`);
    
    try {
      // First get the current user to log the before balance
      const currentUser = await this.getUser(userId);
      if (!currentUser) {
        console.error(`BALANCE UPDATE FAILED: User ID ${userId} not found`);
        return undefined;
      }
      
      console.log(`BALANCE BEFORE: User ID ${userId}, Current balance: ${currentUser.balance}`);
      
      const [user] = await db
        .update(users)
        .set({
          balance: sql`${users.balance} + ${amount}`,
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!user) {
        console.error(`BALANCE UPDATE FAILED: Update operation returned no user`);
        return undefined;
      }
      
      console.log(`BALANCE UPDATED: User ID ${userId}, New balance: ${user.balance}, Added: ${amount}`);
      return user;
    } catch (error) {
      console.error(`BALANCE UPDATE ERROR: ${error}`);
      return undefined;
    }
  }

  async updateUser(userId: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      // Filter out disallowed fields
      const { id, createdAt, ...allowedFields } = userData as any;
      
      // If password is empty, don't update it
      if (allowedFields.password === "") {
        delete allowedFields.password;
      }
      
      // Hash the password if provided
      if (allowedFields.password) {
        // Importar função de hash de senha de auth.ts
        const { hashPassword } = await import('./auth');
        allowedFields.password = await hashPassword(allowedFields.password);
        console.log(`Senha atualizada para usuário ${userId} e devidamente hashada`);
      }
      
      const [user] = await db
        .update(users)
        .set(allowedFields)
        .where(eq(users.id, userId))
        .returning();
      
      return user;
    } catch (error) {
      console.error(`Erro ao atualizar usuário ${userId}:`, error);
      return undefined;
    }
  }
  
  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Animal Management
  async getAnimal(id: number): Promise<Animal | undefined> {
    const [animal] = await db.select().from(animals).where(eq(animals.id, id));
    return animal;
  }

  async getAnimalByGroup(group: number): Promise<Animal | undefined> {
    const [animal] = await db.select().from(animals).where(eq(animals.group, group));
    return animal;
  }

  async getAllAnimals(): Promise<Animal[]> {
    return await db.select().from(animals).orderBy(animals.group);
  }

  async createAnimal(insertAnimal: InsertAnimal): Promise<Animal> {
    const [animal] = await db.insert(animals).values(insertAnimal).returning();
    return animal;
  }

  // Bet Management
  async getBet(id: number): Promise<Bet | undefined> {
    const [bet] = await db.select().from(bets).where(eq(bets.id, id));
    return bet;
  }
  
  async updateBet(betId: number, betData: Partial<Bet>): Promise<Bet | undefined> {
    console.log(`Updating bet ${betId} with data:`, betData);
    
    // Filter out disallowed fields
    const { id, createdAt, ...allowedFields } = betData as any;
    
    const [bet] = await db
      .update(bets)
      .set(allowedFields)
      .where(eq(bets.id, betId))
      .returning();
    
    return bet;
  }
  
  async createBet(insertBet: InsertBet): Promise<Bet> {
    // Create a values object with required fields
    const betValues: any = {
      userId: insertBet.userId,
      animalId: insertBet.animalId || null,
      amount: insertBet.amount,
      type: insertBet.type,
      drawId: insertBet.drawId,
      status: "pending" as const,
      createdAt: new Date(),
      winAmount: null,
    };

    // Add optional fields for different bet types
    if (insertBet.animalId2 !== undefined) {
      betValues.animalId2 = insertBet.animalId2;
    }
    
    if (insertBet.animalId3 !== undefined) {
      betValues.animalId3 = insertBet.animalId3;
    }
    
    if (insertBet.animalId4 !== undefined) {
      betValues.animalId4 = insertBet.animalId4;
    }
    
    if (insertBet.animalId5 !== undefined) {
      betValues.animalId5 = insertBet.animalId5;
    }
    
    if (insertBet.betNumbers !== undefined) {
      betValues.betNumbers = insertBet.betNumbers;
    }
    
    if (insertBet.premioType !== undefined) {
      betValues.premioType = insertBet.premioType;
    }

    // Add other optional fields
    if (insertBet.gameModeId !== undefined) {
      betValues.gameModeId = insertBet.gameModeId;
    }
    
    if (insertBet.potentialWinAmount !== undefined) {
      betValues.potentialWinAmount = insertBet.potentialWinAmount;
    }

    console.log("Creating bet with values:", betValues);
    
    const [bet] = await db.insert(bets).values(betValues).returning();
    return bet;
  }

  /**
   * Recupera as apostas de um usuário com múltiplas camadas de verificação de segurança
   * para prevenir vazamento de dados entre usuários (versão reotimizada para performance)
   */
  async getBetsByUserId(userId: number): Promise<BetWithDetails[]> {
    try {
      // Verificação preliminar - validar se o ID do usuário é válido
      if (!userId || userId <= 0) {
        console.error(`SEGURANÇA: Tentativa de acesso com ID de usuário inválido (${userId})`);
        return [];
      }
      
      // Verificar se o usuário realmente existe antes de prosseguir
      const userExists = await this.getUser(userId);
      if (!userExists) {
        console.error(`SEGURANÇA: Tentativa de buscar apostas para usuário inexistente ID=${userId}`);
        return []; // Retorna lista vazia se o usuário não existir
      }
      
      console.log(`Fetching bets for user ID: ${userId}`);
      
      // MÉTODO 1: Consulta principal com filtro SQL explícito por userId
      // Adicionar order by para mostrar apostas mais recentes primeiro
      const userBets = await db
        .select()
        .from(bets)
        .where(eq(bets.userId, userId))
        .orderBy(desc(bets.createdAt));
      
      console.log(`Query returned ${userBets.length} bets for user ID: ${userId} directly from database`);
      
      // Verificação adicional para cada aposta retornada
      const verifiedUserBets = userBets.filter(bet => bet.userId === userId);
      
      // Registrar inconsistências se houver
      if (verifiedUserBets.length !== userBets.length) {
        console.error(`ALERTA CRÍTICO: Consulta de apostas para usuário ${userId} retornou ${userBets.length - verifiedUserBets.length} apostas de outros usuários!`);
      }
      
      // Não tem apostas? Retornar array vazio
      if (verifiedUserBets.length === 0) {
        return [];
      }
      
      // OTIMIZAÇÃO: Coletar todos os IDs necessários para buscar em lote
      const drawIds: number[] = [];
      const animalIds: number[] = [];
      const gameModeIds: number[] = [];
      
      // Extrair todos os IDs para fazer consultas em lote
      verifiedUserBets.forEach(bet => {
        if (bet.drawId) drawIds.push(bet.drawId);
        
        if (bet.animalId) animalIds.push(bet.animalId);
        if (bet.animalId2) animalIds.push(bet.animalId2);
        if (bet.animalId3) animalIds.push(bet.animalId3);
        if (bet.animalId4) animalIds.push(bet.animalId4);
        if (bet.animalId5) animalIds.push(bet.animalId5);
        
        if (bet.gameModeId) gameModeIds.push(bet.gameModeId);
      });
      
      // Remover duplicados usando filter para compatibilidade
      const uniqueDrawIds = drawIds.filter((id, index) => drawIds.indexOf(id) === index);
      const uniqueAnimalIds = animalIds.filter((id, index) => animalIds.indexOf(id) === index);
      const uniqueGameModeIds = gameModeIds.filter((id, index) => gameModeIds.indexOf(id) === index);
      
      // Buscar dados em lote para melhorar a performance
      let drawsData: Draw[] = [];
      if (uniqueDrawIds.length > 0) {
        try {
          // Usando inArray
          drawsData = await db
            .select()
            .from(draws)
            .where(inArray(draws.id, uniqueDrawIds));
          console.log(`Fetch Draw Successful - Draws IDs: ${uniqueDrawIds.join(',')}`);
        } catch (error) {
          console.error("Error fetching draws:", error);
          drawsData = [];
        }
      }
      
      let animalsData: Animal[] = [];
      if (uniqueAnimalIds.length > 0) {
        try {
          // Usando inArray
          animalsData = await db
            .select()
            .from(animals)
            .where(inArray(animals.id, uniqueAnimalIds));
          console.log(`Fetch Animals Successful - Animal IDs: ${uniqueAnimalIds.join(',')}`);
        } catch (error) {
          console.error("Error fetching animals:", error);
          animalsData = [];
        }
      }
      
      let gameModesData: GameMode[] = [];
      if (uniqueGameModeIds.length > 0) {
        try {
          // Usando inArray
          gameModesData = await db
            .select()
            .from(gameModes)
            .where(inArray(gameModes.id, uniqueGameModeIds));
          console.log(`Fetch GameModes Successful - GameMode IDs: ${uniqueGameModeIds.join(',')}`);
        } catch (error) {
          console.error("Error fetching game modes:", error);
          gameModesData = [];
        }
      }
      
      // Criar mapas para acesso rápido
      const drawMap = new Map(drawsData.map(draw => [draw.id, draw]));
      const animalMap = new Map(animalsData.map(animal => [animal.id, animal]));
      const gameModeMap = new Map(gameModesData.map(gameMode => [gameMode.id, gameMode]));
      
      // Montar objetos completos com os dados relacionados
      const betsWithDetails: BetWithDetails[] = verifiedUserBets.map(bet => {
        const betWithDetails: BetWithDetails = {
          ...bet,
          draw: drawMap.get(bet.drawId) as Draw
        };
        
        // Adicionar animais se existirem
        if (bet.animalId && animalMap.has(bet.animalId)) {
          betWithDetails.animal = animalMap.get(bet.animalId);
        }
        
        if (bet.animalId2 && animalMap.has(bet.animalId2)) {
          betWithDetails.animal2 = animalMap.get(bet.animalId2);
        }
        
        if (bet.animalId3 && animalMap.has(bet.animalId3)) {
          betWithDetails.animal3 = animalMap.get(bet.animalId3);
        }
        
        if (bet.animalId4 && animalMap.has(bet.animalId4)) {
          betWithDetails.animal4 = animalMap.get(bet.animalId4);
        }
        
        if (bet.animalId5 && animalMap.has(bet.animalId5)) {
          betWithDetails.animal5 = animalMap.get(bet.animalId5);
        }
        
        // Adicionar modo de jogo se existir
        if (bet.gameModeId && gameModeMap.has(bet.gameModeId)) {
          betWithDetails.gameMode = gameModeMap.get(bet.gameModeId);
        }
        
        return betWithDetails;
      });
      
      // Filtrar somente apostas com sorteio válido
      const validBets = betsWithDetails.filter(bet => bet.draw !== undefined);
      
      console.log(`Enriched and returning ${validBets.length} valid bets for user ID: ${userId}`);
      return validBets;
    } catch (error) {
      console.error(`ERRO CRÍTICO em getBetsByUserId para usuário ${userId}:`, error);
      return [];
    }
  }

  async getBetsByDrawId(drawId: number): Promise<Bet[]> {
    try {
      console.log(`Fetching bets for draw ID: ${drawId}`);
      const drawBets = await db.select().from(bets).where(eq(bets.drawId, drawId));
      console.log(`Found ${drawBets.length} bets for draw ID: ${drawId}`);
      
      if (drawBets.length > 0) {
        console.log(`Bet details for draw ID ${drawId}:`, JSON.stringify(drawBets));
      } else {
        console.log(`No bets found for draw ID ${drawId}`);
      }
      
      return drawBets;
    } catch (err) {
      console.error("Error getting bets by draw ID:", err);
      return [];
    }
  }

  async updateBetStatus(betId: number, status: string, winAmount?: number): Promise<Bet | undefined> {
    console.log(`UPDATING BET STATUS: Bet ID ${betId}, New status: ${status}, Win amount: ${winAmount || 'N/A'}`);
    
    try {
      // First get current bet status
      const currentBets = await db.select().from(bets).where(eq(bets.id, betId));
      if (currentBets.length === 0) {
        console.error(`BET STATUS UPDATE FAILED: Bet ID ${betId} not found`);
        return undefined;
      }
      
      const currentBet = currentBets[0];
      console.log(`BET BEFORE UPDATE: Bet ID ${betId}, Current status: ${currentBet.status}, Current win amount: ${currentBet.winAmount || 'N/A'}`);
      
      const updateData: Partial<Bet> = { status };
      if (winAmount !== undefined) {
        updateData.winAmount = winAmount;
      }
      
      const [bet] = await db
        .update(bets)
        .set(updateData)
        .where(eq(bets.id, betId))
        .returning();
      
      if (!bet) {
        console.error(`BET STATUS UPDATE FAILED: Update operation returned no bet`);
        return undefined;
      }
      
      console.log(`BET UPDATED SUCCESSFULLY: Bet ID ${betId}, New status: ${bet.status}, New win amount: ${bet.winAmount || 'N/A'}`);
      return bet;
    } catch (error) {
      console.error(`BET STATUS UPDATE ERROR: ${error}`);
      return undefined;
    }
  }

  async getAllBets(): Promise<BetWithDetails[]> {
    try {
      console.log("Fetching all bets with details");
      
      // ⚠️ ATENÇÃO: Esta API é apenas para uso administrativo!
      console.log("⚠️ ATENÇÃO: Recuperando TODAS as apostas. Esta operação é restrita para administradores.");
      
      // Como essa função está sendo substituída por getPaginatedBets, vamos usá-la com valores padrão
      const { bets } = await this.getPaginatedBets({
        page: 1,
        pageSize: 1000, // Valor grande para manter compatibilidade com código existente
        sortOrder: 'desc'
      });
      
      console.log(`Found ${bets.length} bets total`);
      return bets;
    } catch (err) {
      console.error("Error getting all bets:", err);
      return [];
    }
  }
  
  async getPaginatedBets(options: {
    page: number;
    pageSize: number;
    status?: string | null;
    search?: string | null;
    sortOrder?: string;
  }): Promise<{
    bets: BetWithDetails[];
    total: number;
  }> {
    try {
      console.log(`Fetching paginated bets with options:`, options);
      
      // ⚠️ ATENÇÃO: Esta API é apenas para uso administrativo!
      console.log("⚠️ ATENÇÃO: Recuperando apostas com paginação. Esta operação é restrita para administradores.");
      
      const { page, pageSize, status, search, sortOrder } = options;
      
      // Calcular o offset para a consulta
      const offset = (page - 1) * pageSize;
      
      // Construir a consulta base
      let query = db.select().from(bets);
      let countQuery = db.select({ count: count() }).from(bets);
      
      // Adicionar filtros à consulta
      if (status) {
        query = query.where(eq(bets.status, status));
        countQuery = countQuery.where(eq(bets.status, status));
      }
      
      // Adicionar filtro de busca por termo
      if (search) {
        // Busca nos campos relevantes. Podemos expandir para mais campos se necessário.
        // Usar ilike para busca case-insensitive
        query = query.where(sql`CAST(id AS TEXT) ILIKE ${'%' + search + '%'}`);
        countQuery = countQuery.where(sql`CAST(id AS TEXT) ILIKE ${'%' + search + '%'}`);
      }
      
      // Adicionar ordenação
      if (sortOrder === 'asc') {
        query = query.orderBy(asc(bets.createdAt));
      } else {
        // Default é descendente (mais recentes primeiro)
        query = query.orderBy(desc(bets.createdAt));
      }
      
      // Adicionar limite e offset para paginação
      query = query.limit(pageSize).offset(offset);
      
      // Executar a consulta paginada
      const betsResult = await query;
      
      // Executar a consulta de contagem total
      const totalResult = await countQuery;
      const total = totalResult[0]?.count || 0;
      
      console.log(`Query returned ${betsResult.length} bets for page ${page} (offset: ${offset}, pageSize: ${pageSize})`);
      console.log(`Total bets matching criteria: ${total}`);
      
      // OTIMIZAÇÃO: Coletar todos os IDs necessários para buscar em lote
      const drawIds: number[] = [];
      const animalIds: number[] = [];
      const gameModeIds: number[] = [];
      
      // Extrair todos os IDs para fazer consultas em lote
      betsResult.forEach(bet => {
        if (bet.drawId) drawIds.push(bet.drawId);
        
        if (bet.animalId) animalIds.push(bet.animalId);
        if (bet.animalId2) animalIds.push(bet.animalId2);
        if (bet.animalId3) animalIds.push(bet.animalId3);
        if (bet.animalId4) animalIds.push(bet.animalId4);
        if (bet.animalId5) animalIds.push(bet.animalId5);
        
        if (bet.gameModeId) gameModeIds.push(bet.gameModeId);
      });
      
      // Remover duplicados usando filter para compatibilidade
      const uniqueDrawIds = drawIds.filter((id, index) => drawIds.indexOf(id) === index);
      const uniqueAnimalIds = animalIds.filter((id, index) => animalIds.indexOf(id) === index);
      const uniqueGameModeIds = gameModeIds.filter((id, index) => gameModeIds.indexOf(id) === index);
      
      // Buscar dados em lote para melhorar a performance
      let allDraws: Draw[] = [];
      if (uniqueDrawIds.length > 0) {
        try {
          // Usando inArray
          allDraws = await db
            .select()
            .from(draws)
            .where(inArray(draws.id, uniqueDrawIds));
          console.log(`Paginated Fetch Draw Successful - Draws IDs: ${uniqueDrawIds.join(',')}`);
        } catch (error) {
          console.error("Paginated Error fetching draws:", error);
          allDraws = [];
        }
      }
      
      let allAnimals: Animal[] = [];
      if (uniqueAnimalIds.length > 0) {
        try {
          // Usando inArray
          allAnimals = await db
            .select()
            .from(animals)
            .where(inArray(animals.id, uniqueAnimalIds));
          console.log(`Paginated Fetch Animals Successful - Animal IDs: ${uniqueAnimalIds.join(',')}`);
        } catch (error) {
          console.error("Paginated Error fetching animals:", error);
          allAnimals = [];
        }
      }
      
      let allGameModes: GameMode[] = [];
      if (uniqueGameModeIds.length > 0) {
        try {
          // Usando inArray
          allGameModes = await db
            .select()
            .from(gameModes)
            .where(inArray(gameModes.id, uniqueGameModeIds));
          console.log(`Paginated Fetch GameModes Successful - GameMode IDs: ${uniqueGameModeIds.join(',')}`);
        } catch (error) {
          console.error("Paginated Error fetching game modes:", error);
          allGameModes = [];
        }
      }
      
      // Criar mapas para acesso rápido
      const drawMap = new Map(allDraws.map((draw: any) => [draw.id, draw]));
      const animalMap = new Map(allAnimals.map((animal: any) => [animal.id, animal]));
      const gameModeMap = new Map(allGameModes.map((gameMode: any) => [gameMode.id, gameMode]));
      
      // Montar objetos completos com os dados relacionados
      const betsWithDetails = betsResult
        .filter(bet => drawMap.has(bet.drawId)) // Filtrar apostas que tenham um sorteio válido
        .map(bet => {
          // Obter o modo de jogo para calcular ganhos potenciais
          const gameMode = bet.gameModeId && gameModeMap.has(bet.gameModeId) 
            ? gameModeMap.get(bet.gameModeId) 
            : undefined;
            
          // Calcular potentialWinAmount se tivermos modo de jogo e não for null
          let potentialWinAmount: number | undefined = undefined;
          if (gameMode && gameMode.odds > 0) {
            potentialWinAmount = Number(bet.amount) * gameMode.odds;
          }
          
          const betWithDetails: BetWithDetails = {
            ...bet,
            draw: drawMap.get(bet.drawId) as Draw,
            potentialWinAmount: potentialWinAmount
          };
          
          // Adicionar animais se existirem
          if (bet.animalId && animalMap.has(bet.animalId)) {
            betWithDetails.animal = animalMap.get(bet.animalId);
          }
          
          if (bet.animalId2 && animalMap.has(bet.animalId2)) {
            betWithDetails.animal2 = animalMap.get(bet.animalId2);
          }
          
          if (bet.animalId3 && animalMap.has(bet.animalId3)) {
            betWithDetails.animal3 = animalMap.get(bet.animalId3);
          }
          
          if (bet.animalId4 && animalMap.has(bet.animalId4)) {
            betWithDetails.animal4 = animalMap.get(bet.animalId4);
          }
          
          if (bet.animalId5 && animalMap.has(bet.animalId5)) {
            betWithDetails.animal5 = animalMap.get(bet.animalId5);
          }
          
          // Adicionar modo de jogo se existir
          if (gameMode) {
            betWithDetails.gameMode = gameMode;
          }
          
          return betWithDetails;
        });
      
      return {
        bets: betsWithDetails,
        total: Number(total)
      };
    } catch (err) {
      console.error("Error getting paginated bets:", err);
      return {
        bets: [],
        total: 0
      };
    }
  }

  // Draw Management
  async createDraw(insertDraw: InsertDraw): Promise<Draw> {
    const [draw] = await db.insert(draws).values({
      ...insertDraw,
      status: "pending",
      resultAnimalId: null,
      resultAnimalId2: null,
      resultAnimalId3: null,
      resultAnimalId4: null,
      resultAnimalId5: null,
      resultNumber1: null,
      resultNumber2: null,
      resultNumber3: null,
      resultNumber4: null,
      resultNumber5: null,
      createdAt: new Date(),
    }).returning();
    return draw;
  }

  async getDraw(id: number): Promise<Draw | undefined> {
    const [draw] = await db.select().from(draws).where(eq(draws.id, id));
    return draw;
  }

  async getUpcomingDraws(): Promise<Draw[]> {
    const now = new Date();
    
    // Buscar sorteios pendentes
    const upcomingDraws = await db
      .select()
      .from(draws)
      .where(
        and(
          eq(draws.status, "pending"),
          gt(draws.date, now)
        )
      )
      .orderBy(asc(draws.date));
    
    // Se não houver sorteios pendentes, criar novos automaticamente
    if (upcomingDraws.length === 0) {
      console.log("Não há sorteios pendentes. Criando sorteios para os próximos dias...");
      
      // Criar sorteios para os próximos 3 dias
      const times = ["14:00", "16:00", "18:00", "20:00"];
      const names = ["Federal", "PTM", "Coruja", "Noturno"];
      
      // Criar sorteios para hoje e os próximos 2 dias
      for (let day = 0; day <= 2; day++) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + day);
        
        for (let i = 0; i < times.length; i++) {
          const drawTime = times[i].split(':');
          const drawDate = new Date(targetDate);
          drawDate.setHours(parseInt(drawTime[0]), parseInt(drawTime[1]), 0, 0);
          
          // Pular tempos que já passaram para hoje
          if (day === 0 && drawDate <= now) {
            continue;
          }
          
          try {
            await this.createDraw({
              name: names[i],
              time: times[i],
              date: drawDate,
              status: "pending"
            });
            console.log(`Criado sorteio: ${names[i]} às ${times[i]} em ${drawDate.toISOString()}`);
          } catch (error) {
            console.error(`Erro ao criar sorteio: ${error}`);
          }
        }
      }
      
      // Buscar novamente após criar
      return await db
        .select()
        .from(draws)
        .where(
          and(
            eq(draws.status, "pending"),
            gt(draws.date, now)
          )
        )
        .orderBy(asc(draws.date));
    }
    
    return upcomingDraws;
  }

  async updateDrawResult(
    drawId: number, 
    resultAnimalId: number,
    resultAnimalId2?: number,
    resultAnimalId3?: number,
    resultAnimalId4?: number,
    resultAnimalId5?: number,
    resultNumber1?: string,
    resultNumber2?: string,
    resultNumber3?: string,
    resultNumber4?: string,
    resultNumber5?: string
  ): Promise<Draw | undefined> {
    console.log(`Updating draw result for draw ID: ${drawId}, winner animals: 
      1º prêmio: ${resultAnimalId}, número: ${resultNumber1 || 'não definido'}
      2º prêmio: ${resultAnimalId2 || 'não definido'}, número: ${resultNumber2 || 'não definido'}
      3º prêmio: ${resultAnimalId3 || 'não definido'}, número: ${resultNumber3 || 'não definido'}
      4º prêmio: ${resultAnimalId4 || 'não definido'}, número: ${resultNumber4 || 'não definido'}
      5º prêmio: ${resultAnimalId5 || 'não definido'}, número: ${resultNumber5 || 'não definido'}
    `);
    
    // Atualiza o sorteio com todos os resultados
    const [draw] = await db
      .update(draws)
      .set({
        status: "completed",
        resultAnimalId,
        resultAnimalId2: resultAnimalId2 || null,
        resultAnimalId3: resultAnimalId3 || null,
        resultAnimalId4: resultAnimalId4 || null,
        resultAnimalId5: resultAnimalId5 || null,
        resultNumber1: resultNumber1 || null,
        resultNumber2: resultNumber2 || null,
        resultNumber3: resultNumber3 || null,
        resultNumber4: resultNumber4 || null,
        resultNumber5: resultNumber5 || null,
      })
      .where(eq(draws.id, drawId))
      .returning();
    
    if (!draw) {
      console.error(`Draw not found for ID: ${drawId}`);
      return undefined;
    }
    
    console.log(`Draw updated successfully: ${JSON.stringify(draw)}`);
    
    // Process bets for this draw
    const drawBets = await this.getBetsByDrawId(drawId);
    console.log(`Processing ${drawBets.length} bets for draw ID ${drawId}`);
    
    for (const bet of drawBets) {
      console.log(`Processing bet ID: ${bet.id}, user ID: ${bet.userId}, type: ${bet.type}, prêmio: ${bet.premioType}`);
      
      // Determina os animais vencedores com base no prêmio apostado
      let isWinner = false;
      let appliedMultiplier = 1.0; // Multiplicador padrão
      
      // Pegar o game mode, se existir
      let gameMode: GameMode | undefined;
      if (bet.gameModeId) {
        gameMode = await this.getGameMode(bet.gameModeId);
      }
      
      // Determina quais prêmios verificar com base no tipo de prêmio apostado
      const premioType = bet.premioType || "1";
      
      if (premioType === "1-5") {
        // Apostou em todos os prêmios (1º ao 5º) - dividir o multiplicador por 5
        appliedMultiplier = 0.2; // dividir por 5
        console.log(`Aposta em todos os prêmios (1-5), multiplicador ajustado para ${appliedMultiplier}`);
      }
      
      // Determinar se a aposta é vencedora com base no tipo
      switch (bet.type) {
        case "group": // Grupo (1 animal)
          if ((premioType === "1" && bet.animalId === resultAnimalId) ||
              (premioType === "2" && bet.animalId === resultAnimalId2) ||
              (premioType === "3" && bet.animalId === resultAnimalId3) ||
              (premioType === "4" && bet.animalId === resultAnimalId4) ||
              (premioType === "5" && bet.animalId === resultAnimalId5) ||
              (premioType === "1-5" && (
                bet.animalId === resultAnimalId || 
                bet.animalId === resultAnimalId2 || 
                bet.animalId === resultAnimalId3 || 
                bet.animalId === resultAnimalId4 || 
                bet.animalId === resultAnimalId5
              ))) {
            isWinner = true;
          }
          break;
          
        case "duque_grupo": // Duque de Grupo (2 animais)
          // Verificar se ambos os animais apostados coincidem com o prêmio sorteado
          if (bet.animalId && bet.animalId2) {
            if (premioType === "1" && 
                ((bet.animalId === resultAnimalId && bet.animalId2 === resultAnimalId) ||
                 (bet.animalId2 === resultAnimalId && bet.animalId === resultAnimalId))) {
              isWinner = true;
              console.log(`Duque de Grupo ganhou no 1° prêmio: ${bet.animalId} e ${bet.animalId2}`);
            } else if (premioType === "2" && resultAnimalId2 &&
                      ((bet.animalId === resultAnimalId2 && bet.animalId2 === resultAnimalId2) ||
                       (bet.animalId2 === resultAnimalId2 && bet.animalId === resultAnimalId2))) {
              isWinner = true;
              console.log(`Duque de Grupo ganhou no 2° prêmio: ${bet.animalId} e ${bet.animalId2}`);
            } else if (premioType === "3" && resultAnimalId3 &&
                      ((bet.animalId === resultAnimalId3 && bet.animalId2 === resultAnimalId3) ||
                       (bet.animalId2 === resultAnimalId3 && bet.animalId === resultAnimalId3))) {
              isWinner = true;
              console.log(`Duque de Grupo ganhou no 3° prêmio: ${bet.animalId} e ${bet.animalId2}`);
            } else if (premioType === "4" && resultAnimalId4 &&
                      ((bet.animalId === resultAnimalId4 && bet.animalId2 === resultAnimalId4) ||
                       (bet.animalId2 === resultAnimalId4 && bet.animalId === resultAnimalId4))) {
              isWinner = true;
              console.log(`Duque de Grupo ganhou no 4° prêmio: ${bet.animalId} e ${bet.animalId2}`);
            } else if (premioType === "5" && resultAnimalId5 &&
                      ((bet.animalId === resultAnimalId5 && bet.animalId2 === resultAnimalId5) ||
                       (bet.animalId2 === resultAnimalId5 && bet.animalId === resultAnimalId5))) {
              isWinner = true;
              console.log(`Duque de Grupo ganhou no 5° prêmio: ${bet.animalId} e ${bet.animalId2}`);
            } else if (premioType === "1-5") {
              // Verificar todos os prêmios
              let win = false;
              
              if ((bet.animalId === resultAnimalId && bet.animalId2 === resultAnimalId) ||
                  (bet.animalId2 === resultAnimalId && bet.animalId === resultAnimalId)) {
                win = true;
                console.log(`Duque de Grupo ganhou no 1° prêmio: ${bet.animalId} e ${bet.animalId2}`);
              }
              
              if (resultAnimalId2 &&
                  ((bet.animalId === resultAnimalId2 && bet.animalId2 === resultAnimalId2) ||
                   (bet.animalId2 === resultAnimalId2 && bet.animalId === resultAnimalId2))) {
                win = true;
                console.log(`Duque de Grupo ganhou no 2° prêmio: ${bet.animalId} e ${bet.animalId2}`);
              }
              
              if (resultAnimalId3 &&
                  ((bet.animalId === resultAnimalId3 && bet.animalId2 === resultAnimalId3) ||
                   (bet.animalId2 === resultAnimalId3 && bet.animalId === resultAnimalId3))) {
                win = true;
                console.log(`Duque de Grupo ganhou no 3° prêmio: ${bet.animalId} e ${bet.animalId2}`);
              }
              
              if (resultAnimalId4 &&
                  ((bet.animalId === resultAnimalId4 && bet.animalId2 === resultAnimalId4) ||
                   (bet.animalId2 === resultAnimalId4 && bet.animalId === resultAnimalId4))) {
                win = true;
                console.log(`Duque de Grupo ganhou no 4° prêmio: ${bet.animalId} e ${bet.animalId2}`);
              }
              
              if (resultAnimalId5 &&
                  ((bet.animalId === resultAnimalId5 && bet.animalId2 === resultAnimalId5) ||
                   (bet.animalId2 === resultAnimalId5 && bet.animalId === resultAnimalId5))) {
                win = true;
                console.log(`Duque de Grupo ganhou no 5° prêmio: ${bet.animalId} e ${bet.animalId2}`);
              }
              
              isWinner = win;
            }
          }
          break;
          
        // Verificações para todas as modalidades de apostas
        
        case "duque_dezena": // Duque de Dezena (2 dezenas)
          if (bet.betNumbers && bet.betNumbers.length >= 2) {
            const betDezena1 = bet.betNumbers[0];
            const betDezena2 = bet.betNumbers[1];
            
            // Função para extrair dezenas
            const getDezenaFromMilhar = (milhar: string): string => {
              if (milhar && milhar.length >= 2) {
                return milhar.slice(-2);
              }
              return "";
            };
            
            const prizeResults: Record<string, string> = {};
            
            // Processar prêmios
            if (resultAnimalId) {
              const animal = await this.getAnimal(resultAnimalId);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["1"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            if (resultAnimalId2) {
              const animal = await this.getAnimal(resultAnimalId2);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["2"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            if (resultAnimalId3) {
              const animal = await this.getAnimal(resultAnimalId3);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["3"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            if (resultAnimalId4) {
              const animal = await this.getAnimal(resultAnimalId4);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["4"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            if (resultAnimalId5) {
              const animal = await this.getAnimal(resultAnimalId5);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["5"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            // Verificar se ganhou baseado no prêmio
            const checkDuque = (prize: string) => {
              return (
                (prizeResults[prize] === betDezena1 && prizeResults[prize] === betDezena2) ||
                (prizeResults[prize] === betDezena1 && prizeResults[prize] === betDezena2)
              );
            };
            
            if (premioType === "1" && checkDuque("1")) {
              isWinner = true;
            } else if (premioType === "2" && checkDuque("2")) {
              isWinner = true;
            } else if (premioType === "3" && checkDuque("3")) {
              isWinner = true;
            } else if (premioType === "4" && checkDuque("4")) {
              isWinner = true;
            } else if (premioType === "5" && checkDuque("5")) {
              isWinner = true;
            } else if (premioType === "1-5") {
              // Verificar se ganhou em algum prêmio
              const winners = ["1", "2", "3", "4", "5"].filter(prize => checkDuque(prize));
              if (winners.length > 0) {
                isWinner = true;
              }
            }
          }
          break;
        
        case "terno_dezena": // Terno de Dezena (3 dezenas)
          if (bet.betNumbers && bet.betNumbers.length >= 3) {
            const betDezenas = bet.betNumbers.slice(0, 3);
            
            // Função para extrair dezenas
            const getDezenaFromMilhar = (milhar: string): string => {
              if (milhar && milhar.length >= 2) {
                return milhar.slice(-2);
              }
              return "";
            };
            
            const prizeResults: Record<string, string> = {};
            
            // Processar prêmios
            if (resultAnimalId) {
              const animal = await this.getAnimal(resultAnimalId);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["1"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            if (resultAnimalId2) {
              const animal = await this.getAnimal(resultAnimalId2);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["2"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            if (resultAnimalId3) {
              const animal = await this.getAnimal(resultAnimalId3);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["3"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            if (resultAnimalId4) {
              const animal = await this.getAnimal(resultAnimalId4);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["4"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            if (resultAnimalId5) {
              const animal = await this.getAnimal(resultAnimalId5);
              if (animal && animal.numbers && animal.numbers.length > 0) {
                prizeResults["5"] = getDezenaFromMilhar(animal.numbers[0]);
              }
            }
            
            // Verificar se ganhou baseado no prêmio
            const checkTernoDezena = (prize: string) => {
              return betDezenas.includes(prizeResults[prize]);
            };
            
            if (premioType === "1" && checkTernoDezena("1")) {
              isWinner = true;
            } else if (premioType === "2" && checkTernoDezena("2")) {
              isWinner = true;
            } else if (premioType === "3" && checkTernoDezena("3")) {
              isWinner = true;
            } else if (premioType === "4" && checkTernoDezena("4")) {
              isWinner = true;
            } else if (premioType === "5" && checkTernoDezena("5")) {
              isWinner = true;
            } else if (premioType === "1-5") {
              // Verificar se ganhou em algum prêmio
              const winners = ["1", "2", "3", "4", "5"].filter(prize => checkTernoDezena(prize));
              if (winners.length > 0) {
                isWinner = true;
              }
            }
          }
          break;
        case "dozen": // Dezena (2 dígitos)
          if (bet.betNumbers && bet.betNumbers.length > 0) {
            // Obtém o número apostado (dezena)
            // Sempre garantir que usamos os 2 últimos dígitos para dezena (para ser consistente com a entrada)
            let betNumber = bet.betNumbers[0];
            // Se o número tem mais de 2 dígitos, extraímos apenas os 2 últimos
            if (betNumber.length > 2) {
              console.log(`Convertendo número ${betNumber} para formato de dezena (2 dígitos)`);
              betNumber = betNumber.slice(-2);
            }
            // Não adicionamos mais zeros à esquerda, exigimos digitação completa 
            // betNumber permanece como está
            console.log(`Processando aposta de DEZENA: ${betNumber}`);
            
            // Função para extrair os 2 últimos dígitos de um número com 4 dígitos
            // Importante: Sempre extrair os últimos 2 dígitos, nunca adicionar zeros
            const getDezenaFromMilhar = (milhar: string): string => {
              // Garantimos que a milhar tenha 4 dígitos para extrair os 2 últimos corretamente
              const milharCompleta = milhar.padStart(4, '0');
              // Retorna os 2 últimos dígitos (posições 2 e 3 em base 0)
              return milharCompleta.substring(2, 4);
            };

            // Verifica cada prêmio conforme o tipo de aposta
            const prizeResults: Record<string, string> = {};
            
            // Verificar resultados com base nos números diretamente
            // Verificar 1º prêmio
            if (resultNumber1) {
              const resultNum = resultNumber1.padStart(4, '0');
              const dezena = getDezenaFromMilhar(resultNum);
              console.log(`Resultado 1° prêmio (Milhar): ${resultNum}, dezena: ${dezena}`);
              
              if (dezena === betNumber) {
                prizeResults["1"] = dezena;
                console.log(`Corresponde! Aposta ${betNumber} = dezena do resultado ${resultNum}`);
              }
            }
            
            // Verificar 2º prêmio
            if (resultNumber2) {
              const resultNum = resultNumber2.padStart(4, '0');
              const dezena = getDezenaFromMilhar(resultNum);
              console.log(`Resultado 2° prêmio (Milhar): ${resultNum}, dezena: ${dezena}`);
              
              if (dezena === betNumber) {
                prizeResults["2"] = dezena;
                console.log(`Corresponde! Aposta ${betNumber} = dezena do resultado ${resultNum}`);
              }
            }
            
            // Verificar 3º prêmio
            if (resultNumber3) {
              const resultNum = resultNumber3.padStart(4, '0');
              const dezena = getDezenaFromMilhar(resultNum);
              console.log(`Resultado 3° prêmio (Milhar): ${resultNum}, dezena: ${dezena}`);
              
              if (dezena === betNumber) {
                prizeResults["3"] = dezena;
                console.log(`Corresponde! Aposta ${betNumber} = dezena do resultado ${resultNum}`);
              }
            }
            
            // Verificar 4º prêmio
            if (resultNumber4) {
              const resultNum = resultNumber4.padStart(4, '0');
              const dezena = getDezenaFromMilhar(resultNum);
              console.log(`Resultado 4° prêmio (Milhar): ${resultNum}, dezena: ${dezena}`);
              
              if (dezena === betNumber) {
                prizeResults["4"] = dezena;
                console.log(`Corresponde! Aposta ${betNumber} = dezena do resultado ${resultNum}`);
              }
            }
            
            // Verificar 5º prêmio
            if (resultNumber5) {
              const resultNum = resultNumber5.padStart(4, '0');
              const dezena = getDezenaFromMilhar(resultNum);
              console.log(`Resultado 5° prêmio (Milhar): ${resultNum}, dezena: ${dezena}`);
              
              if (dezena === betNumber) {
                prizeResults["5"] = dezena;
                console.log(`Corresponde! Aposta ${betNumber} = dezena do resultado ${resultNum}`);
              }
            }
            
            // Fallback para verificações por animal se o resultado específico não estiver disponível
            if (!resultNumber1 && resultAnimalId) {
              const animal1 = await this.getAnimal(resultAnimalId);
              if (animal1 && animal1.numbers) {
                // Verificar todos os números do animal, não apenas o primeiro
                console.log(`Animal 1° prêmio: ${animal1.name}, números: ${animal1.numbers.join(", ")}`);
                for (const numeroOriginal of animal1.numbers) {
                  const numero = numeroOriginal.length < 2 ? "0".repeat(2 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para dezena)`);
                  
                  const dezena = getDezenaFromMilhar(numero);
                  console.log(`  - Dezena extraída: ${dezena}`);
                  
                  // Caso especial para o número 00 que pode ser interpretado como 100
                  if (dezena === "00" && betNumber === "00") {
                    prizeResults["1"] = "00";
                    console.log(`  - Corresponde! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (dezena === betNumber) {
                    prizeResults["1"] = dezena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 1° prêmio: ${animal1.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId2) {
              const animal2 = await this.getAnimal(resultAnimalId2);
              if (animal2 && animal2.numbers) {
                console.log(`Animal 2° prêmio: ${animal2.name}, números: ${animal2.numbers.join(", ")}`);
                for (const numeroOriginal of animal2.numbers) {
                  const numero = numeroOriginal.length < 2 ? "0".repeat(2 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para dezena)`);
                  
                  const dezena = getDezenaFromMilhar(numero);
                  console.log(`  - Dezena extraída: ${dezena}`);
                  
                  if (dezena === "00" && betNumber === "00") {
                    prizeResults["2"] = "00";
                    console.log(`  - Corresponde! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (dezena === betNumber) {
                    prizeResults["2"] = dezena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 2° prêmio: ${animal2.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId3) {
              const animal3 = await this.getAnimal(resultAnimalId3);
              if (animal3 && animal3.numbers) {
                console.log(`Animal 3° prêmio: ${animal3.name}, números: ${animal3.numbers.join(", ")}`);
                for (const numeroOriginal of animal3.numbers) {
                  const numero = numeroOriginal.length < 2 ? "0".repeat(2 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para dezena)`);
                  
                  const dezena = getDezenaFromMilhar(numero);
                  console.log(`  - Dezena extraída: ${dezena}`);
                  
                  if (dezena === "00" && betNumber === "00") {
                    prizeResults["3"] = "00";
                    console.log(`  - Corresponde! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (dezena === betNumber) {
                    prizeResults["3"] = dezena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 3° prêmio: ${animal3.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId4) {
              const animal4 = await this.getAnimal(resultAnimalId4);
              if (animal4 && animal4.numbers) {
                console.log(`Animal 4° prêmio: ${animal4.name}, números: ${animal4.numbers.join(", ")}`);
                for (const numeroOriginal of animal4.numbers) {
                  const numero = numeroOriginal.length < 2 ? "0".repeat(2 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para dezena)`);
                  
                  const dezena = getDezenaFromMilhar(numero);
                  console.log(`  - Dezena extraída: ${dezena}`);
                  
                  if (dezena === "00" && betNumber === "00") {
                    prizeResults["4"] = "00";
                    console.log(`  - Corresponde! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (dezena === betNumber) {
                    prizeResults["4"] = dezena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 4° prêmio: ${animal4.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId5) {
              const animal5 = await this.getAnimal(resultAnimalId5);
              if (animal5 && animal5.numbers) {
                console.log(`Animal 5° prêmio: ${animal5.name}, números: ${animal5.numbers.join(", ")}`);
                for (const numeroOriginal of animal5.numbers) {
                  const numero = numeroOriginal.length < 2 ? "0".repeat(2 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para dezena)`);
                  
                  const dezena = getDezenaFromMilhar(numero);
                  console.log(`  - Dezena extraída: ${dezena}`);
                  
                  if (dezena === "00" && betNumber === "00") {
                    prizeResults["5"] = "00";
                    console.log(`  - Corresponde! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (dezena === betNumber) {
                    prizeResults["5"] = dezena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 5° prêmio: ${animal5.name}`);
                    break;
                  }
                }
              }
            }
            
            // Verifica se ganhou baseado no tipo de prêmio apostado
            if (premioType === "1" && prizeResults["1"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de dezena ${betNumber} ganhou no 1° prêmio`);
            } else if (premioType === "2" && prizeResults["2"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de dezena ${betNumber} ganhou no 2° prêmio`);
            } else if (premioType === "3" && prizeResults["3"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de dezena ${betNumber} ganhou no 3° prêmio`);
            } else if (premioType === "4" && prizeResults["4"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de dezena ${betNumber} ganhou no 4° prêmio`);
            } else if (premioType === "5" && prizeResults["5"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de dezena ${betNumber} ganhou no 5° prêmio`);
            } else if (premioType === "1-5") {
              // Para apostas em todos os prêmios, verificar todos
              const winners = Object.keys(prizeResults).filter(key => prizeResults[key] === betNumber);
              if (winners.length > 0) {
                isWinner = true;
                console.log(`Aposta de dezena ${betNumber} ganhou nos prêmios: ${winners.join(', ')}`);
              }
            }
          }
          break;
          
        case "hundred": // Centena (3 dígitos)
          if (bet.betNumbers && bet.betNumbers.length > 0) {
            // Obtém o número apostado (centena)
            // Sempre garantir que usamos os 3 últimos dígitos para centena (para ser consistente com a entrada)
            let betNumber = bet.betNumbers[0];
            // Se o número tem mais de 3 dígitos, extraímos apenas os 3 últimos
            if (betNumber.length > 3) {
              console.log(`Convertendo número ${betNumber} para formato de centena (3 dígitos)`);
              betNumber = betNumber.slice(-3);
            }
            // Não adicionamos mais zeros à esquerda, exigimos digitação completa 
            // betNumber permanece como está
            console.log(`Processando aposta de CENTENA: ${betNumber}`);
            
            // Função para extrair os 3 últimos dígitos de um número com 4 dígitos
            // Importante: Sempre extrair os últimos 3 dígitos, nunca adicionar zeros
            const getCentenaFromMilhar = (milhar: string): string => {
              // Garantimos que a milhar tenha 4 dígitos para extrair os 3 últimos corretamente
              const milharCompleta = milhar.padStart(4, '0');
              // Retorna os 3 últimos dígitos (posições 1, 2 e 3 em base 0)
              return milharCompleta.substring(1, 4);
            };

            // Verifica cada prêmio conforme o tipo de aposta
            const prizeResults: Record<string, string> = {};
            
            // Verificar resultados com base nos números diretamente
            // Verificar 1º prêmio
            if (resultNumber1) {
              const resultNum = resultNumber1.padStart(4, '0');
              const centena = getCentenaFromMilhar(resultNum);
              console.log(`Resultado 1° prêmio (Milhar): ${resultNum}, centena: ${centena}`);
              
              if (centena === betNumber) {
                prizeResults["1"] = centena;
                console.log(`Corresponde! Aposta ${betNumber} = centena do resultado ${resultNum}`);
              }
            }
            
            // Verificar 2º prêmio
            if (resultNumber2) {
              const resultNum = resultNumber2.padStart(4, '0');
              const centena = getCentenaFromMilhar(resultNum);
              console.log(`Resultado 2° prêmio (Milhar): ${resultNum}, centena: ${centena}`);
              
              if (centena === betNumber) {
                prizeResults["2"] = centena;
                console.log(`Corresponde! Aposta ${betNumber} = centena do resultado ${resultNum}`);
              }
            }
            
            // Verificar 3º prêmio
            if (resultNumber3) {
              const resultNum = resultNumber3.padStart(4, '0');
              const centena = getCentenaFromMilhar(resultNum);
              console.log(`Resultado 3° prêmio (Milhar): ${resultNum}, centena: ${centena}`);
              
              if (centena === betNumber) {
                prizeResults["3"] = centena;
                console.log(`Corresponde! Aposta ${betNumber} = centena do resultado ${resultNum}`);
              }
            }
            
            // Verificar 4º prêmio
            if (resultNumber4) {
              const resultNum = resultNumber4.padStart(4, '0');
              const centena = getCentenaFromMilhar(resultNum);
              console.log(`Resultado 4° prêmio (Milhar): ${resultNum}, centena: ${centena}`);
              
              if (centena === betNumber) {
                prizeResults["4"] = centena;
                console.log(`Corresponde! Aposta ${betNumber} = centena do resultado ${resultNum}`);
              }
            }
            
            // Verificar 5º prêmio
            if (resultNumber5) {
              const resultNum = resultNumber5.padStart(4, '0');
              const centena = getCentenaFromMilhar(resultNum);
              console.log(`Resultado 5° prêmio (Milhar): ${resultNum}, centena: ${centena}`);
              
              if (centena === betNumber) {
                prizeResults["5"] = centena;
                console.log(`Corresponde! Aposta ${betNumber} = centena do resultado ${resultNum}`);
              }
            }
            
            // Fallback para verificações por animal se o resultado específico não estiver disponível
            if (!resultNumber1 && resultAnimalId) {
              const animal1 = await this.getAnimal(resultAnimalId);
              if (animal1 && animal1.numbers) {
                // Verificar todos os números do animal, não apenas o primeiro
                console.log(`Animal 1° prêmio: ${animal1.name}, números: ${animal1.numbers.join(", ")}`);
                for (const numeroOriginal of animal1.numbers) {
                  // A função pode receber "00" como entrada e precisamos tratá-la como "000" ou "100" dependendo da aposta
                  const numero = numeroOriginal.length < 3 ? "0".repeat(3 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para centena)`);
                  
                  // Tentativa 1: Verificar os últimos 3 dígitos exatamente como estão
                  const centena = getCentenaFromMilhar(numero);
                  console.log(`  - Centena extraída: ${centena}`);
                  
                  // Tentativa 2: Se o número original for "00", verificar também como "100"
                  if (numeroOriginal === "00" && betNumber === "100") {
                    prizeResults["1"] = "100";
                    console.log(`  - Corresponde especial! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (centena === betNumber) {
                    prizeResults["1"] = centena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 1° prêmio: ${animal1.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId2) {
              const animal2 = await this.getAnimal(resultAnimalId2);
              if (animal2 && animal2.numbers) {
                console.log(`Animal 2° prêmio: ${animal2.name}, números: ${animal2.numbers.join(", ")}`);
                for (const numeroOriginal of animal2.numbers) {
                  const numero = numeroOriginal.length < 3 ? "0".repeat(3 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para centena)`);
                  
                  const centena = getCentenaFromMilhar(numero);
                  console.log(`  - Centena extraída: ${centena}`);
                  
                  if (numeroOriginal === "00" && betNumber === "100") {
                    prizeResults["2"] = "100";
                    console.log(`  - Corresponde especial! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (centena === betNumber) {
                    prizeResults["2"] = centena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 2° prêmio: ${animal2.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId3) {
              const animal3 = await this.getAnimal(resultAnimalId3);
              if (animal3 && animal3.numbers) {
                console.log(`Animal 3° prêmio: ${animal3.name}, números: ${animal3.numbers.join(", ")}`);
                for (const numeroOriginal of animal3.numbers) {
                  const numero = numeroOriginal.length < 3 ? "0".repeat(3 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para centena)`);
                  
                  const centena = getCentenaFromMilhar(numero);
                  console.log(`  - Centena extraída: ${centena}`);
                  
                  if (numeroOriginal === "00" && betNumber === "100") {
                    prizeResults["3"] = "100";
                    console.log(`  - Corresponde especial! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (centena === betNumber) {
                    prizeResults["3"] = centena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 3° prêmio: ${animal3.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId4) {
              const animal4 = await this.getAnimal(resultAnimalId4);
              if (animal4 && animal4.numbers) {
                console.log(`Animal 4° prêmio: ${animal4.name}, números: ${animal4.numbers.join(", ")}`);
                for (const numeroOriginal of animal4.numbers) {
                  const numero = numeroOriginal.length < 3 ? "0".repeat(3 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para centena)`);
                  
                  const centena = getCentenaFromMilhar(numero);
                  console.log(`  - Centena extraída: ${centena}`);
                  
                  if (numeroOriginal === "00" && betNumber === "100") {
                    prizeResults["4"] = "100";
                    console.log(`  - Corresponde especial! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (centena === betNumber) {
                    prizeResults["4"] = centena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 4° prêmio: ${animal4.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId5) {
              const animal5 = await this.getAnimal(resultAnimalId5);
              if (animal5 && animal5.numbers) {
                console.log(`Animal 5° prêmio: ${animal5.name}, números: ${animal5.numbers.join(", ")}`);
                for (const numeroOriginal of animal5.numbers) {
                  const numero = numeroOriginal.length < 3 ? "0".repeat(3 - numeroOriginal.length) + numeroOriginal : numeroOriginal;
                  console.log(`- Verificando número ${numero} do animal (formato para centena)`);
                  
                  const centena = getCentenaFromMilhar(numero);
                  console.log(`  - Centena extraída: ${centena}`);
                  
                  if (numeroOriginal === "00" && betNumber === "100") {
                    prizeResults["5"] = "100";
                    console.log(`  - Corresponde especial! Aposta ${betNumber} combina com '00' do animal`);
                    break;
                  }
                  
                  if (centena === betNumber) {
                    prizeResults["5"] = centena;
                    console.log(`  - Corresponde! Número ${betNumber} encontrado no animal do 5° prêmio: ${animal5.name}`);
                    break;
                  }
                }
              }
            }
            
            // Verifica se ganhou baseado no tipo de prêmio apostado
            if (premioType === "1" && prizeResults["1"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de centena ${betNumber} ganhou no 1° prêmio`);
            } else if (premioType === "2" && prizeResults["2"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de centena ${betNumber} ganhou no 2° prêmio`);
            } else if (premioType === "3" && prizeResults["3"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de centena ${betNumber} ganhou no 3° prêmio`);
            } else if (premioType === "4" && prizeResults["4"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de centena ${betNumber} ganhou no 4° prêmio`);
            } else if (premioType === "5" && prizeResults["5"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de centena ${betNumber} ganhou no 5° prêmio`);
            } else if (premioType === "1-5") {
              // Para apostas em todos os prêmios, verificar todos
              const winners = Object.keys(prizeResults).filter(key => prizeResults[key] === betNumber);
              if (winners.length > 0) {
                isWinner = true;
                console.log(`Aposta de centena ${betNumber} ganhou nos prêmios: ${winners.join(', ')}`);
              }
            }
          }
          break;
          
        case "thousand": // Milhar (4 dígitos)
          if (bet.betNumbers && bet.betNumbers.length > 0) {
            // Obtém o número apostado (milhar)
            // Sempre garantir que usamos os 4 dígitos para milhar (para ser consistente com a entrada)
            let betNumber = bet.betNumbers[0];
            // Se o número tem mais de 4 dígitos (improvável), extraímos apenas os 4 últimos
            if (betNumber.length > 4) {
              console.log(`Ajustando número ${betNumber} para formato de milhar (4 dígitos)`);
              betNumber = betNumber.slice(-4);
            }
            // Não adicionamos mais zeros à esquerda, exigimos digitação completa 
            // betNumber permanece como está
            console.log(`Processando aposta de MILHAR: ${betNumber}`);
            
            // Verifica cada prêmio conforme o tipo de aposta
            const prizeResults: Record<string, string> = {};
            
            // Verificar resultados com base nos números diretamente
            // Verificar 1º prêmio
            if (resultNumber1) {
              // Garantir que a milhar do resultado tenha 4 dígitos
              const resultNum = resultNumber1.padStart(4, '0');
              console.log(`Resultado 1° prêmio (Milhar completa): ${resultNum}`);
              
              // Comparação completa de 4 dígitos (milhar)
              if (resultNum === betNumber) {
                prizeResults["1"] = resultNum;
                console.log(`MILHAR CORRESPONDE! Aposta ${betNumber} = resultado completo ${resultNum}`);
              }
            }
            
            // Verificar 2º prêmio
            if (resultNumber2) {
              // Garantir que a milhar do resultado tenha 4 dígitos
              const resultNum = resultNumber2.padStart(4, '0');
              console.log(`Resultado 2° prêmio (Milhar completa): ${resultNum}`);
              
              // Comparação completa de 4 dígitos (milhar)
              if (resultNum === betNumber) {
                prizeResults["2"] = resultNum;
                console.log(`MILHAR CORRESPONDE! Aposta ${betNumber} = resultado completo ${resultNum}`);
              }
            }
            
            // Verificar 3º prêmio
            if (resultNumber3) {
              // Garantir que a milhar do resultado tenha 4 dígitos
              const resultNum = resultNumber3.padStart(4, '0');
              console.log(`Resultado 3° prêmio (Milhar completa): ${resultNum}`);
              
              // Comparação completa de 4 dígitos (milhar)
              if (resultNum === betNumber) {
                prizeResults["3"] = resultNum;
                console.log(`MILHAR CORRESPONDE! Aposta ${betNumber} = resultado completo ${resultNum}`);
              }
            }
            
            // Verificar 4º prêmio
            if (resultNumber4) {
              // Garantir que a milhar do resultado tenha 4 dígitos
              const resultNum = resultNumber4.padStart(4, '0');
              console.log(`Resultado 4° prêmio (Milhar completa): ${resultNum}`);
              
              // Comparação completa de 4 dígitos (milhar)
              if (resultNum === betNumber) {
                prizeResults["4"] = resultNum;
                console.log(`MILHAR CORRESPONDE! Aposta ${betNumber} = resultado completo ${resultNum}`);
              }
            }
            
            // Verificar 5º prêmio
            if (resultNumber5) {
              // Garantir que a milhar do resultado tenha 4 dígitos
              const resultNum = resultNumber5.padStart(4, '0');
              console.log(`Resultado 5° prêmio (Milhar completa): ${resultNum}`);
              
              // Comparação completa de 4 dígitos (milhar)
              if (resultNum === betNumber) {
                prizeResults["5"] = resultNum;
                console.log(`MILHAR CORRESPONDE! Aposta ${betNumber} = resultado completo ${resultNum}`);
              }
            }
            
            // Fallback para verificações por animal se o resultado específico não estiver disponível
            if (!resultNumber1 && resultAnimalId) {
              const animal1 = await this.getAnimal(resultAnimalId);
              if (animal1 && animal1.numbers) {
                // Verificar todos os números do animal, não apenas o primeiro
                for (const numero of animal1.numbers) {
                  if (numero === betNumber) {
                    prizeResults["1"] = numero;
                    console.log(`Número ${betNumber} encontrado no animal do 1° prêmio: ${animal1.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId2) {
              const animal2 = await this.getAnimal(resultAnimalId2);
              if (animal2 && animal2.numbers) {
                for (const numero of animal2.numbers) {
                  if (numero === betNumber) {
                    prizeResults["2"] = numero;
                    console.log(`Número ${betNumber} encontrado no animal do 2° prêmio: ${animal2.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId3) {
              const animal3 = await this.getAnimal(resultAnimalId3);
              if (animal3 && animal3.numbers) {
                for (const numero of animal3.numbers) {
                  if (numero === betNumber) {
                    prizeResults["3"] = numero;
                    console.log(`Número ${betNumber} encontrado no animal do 3° prêmio: ${animal3.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId4) {
              const animal4 = await this.getAnimal(resultAnimalId4);
              if (animal4 && animal4.numbers) {
                for (const numero of animal4.numbers) {
                  if (numero === betNumber) {
                    prizeResults["4"] = numero;
                    console.log(`Número ${betNumber} encontrado no animal do 4° prêmio: ${animal4.name}`);
                    break;
                  }
                }
              }
            }
            
            if (resultAnimalId5) {
              const animal5 = await this.getAnimal(resultAnimalId5);
              if (animal5 && animal5.numbers) {
                for (const numero of animal5.numbers) {
                  if (numero === betNumber) {
                    prizeResults["5"] = numero;
                    console.log(`Número ${betNumber} encontrado no animal do 5° prêmio: ${animal5.name}`);
                    break;
                  }
                }
              }
            }
            
            // Verifica se ganhou baseado no tipo de prêmio apostado
            if (premioType === "1" && prizeResults["1"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de milhar ${betNumber} ganhou no 1° prêmio`);
            } else if (premioType === "2" && prizeResults["2"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de milhar ${betNumber} ganhou no 2° prêmio`);
            } else if (premioType === "3" && prizeResults["3"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de milhar ${betNumber} ganhou no 3° prêmio`);
            } else if (premioType === "4" && prizeResults["4"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de milhar ${betNumber} ganhou no 4° prêmio`);
            } else if (premioType === "5" && prizeResults["5"] === betNumber) {
              isWinner = true;
              console.log(`Aposta de milhar ${betNumber} ganhou no 5° prêmio`);
            } else if (premioType === "1-5") {
              // Para apostas em todos os prêmios, verificar todos
              const winners = Object.keys(prizeResults).filter(key => prizeResults[key] === betNumber);
              if (winners.length > 0) {
                isWinner = true;
                console.log(`Aposta de milhar ${betNumber} ganhou nos prêmios: ${winners.join(', ')}`);
              }
            }
          }
          break;
          
        default:
          console.log(`Tipo de aposta não reconhecido: ${bet.type}`);
          break;
      }
      
      if (isWinner) {
        // Aposta vencedora - calcular o prêmio
        let winAmount: number;
        
        if (gameMode && bet.potentialWinAmount) {
          // Usar o valor potencial pré-calculado e aplicar o multiplicador de prêmio
          winAmount = Math.floor(bet.potentialWinAmount * appliedMultiplier);
          console.log(`Vencedor usando game mode: ${gameMode.name}, valor base: ${bet.potentialWinAmount}, multiplicador: ${appliedMultiplier}, win amount: ${winAmount}`);
        } else {
          // Fallback para cálculo direto
          const baseMultiplier = gameMode ? gameMode.odds / 100 : 20; // Valor padrão para apostas sem game mode
          winAmount = Math.floor(bet.amount * baseMultiplier * appliedMultiplier);
          console.log(`Vencedor usando cálculo direto: valor: ${bet.amount}, multiplicador base: ${baseMultiplier}, multiplicador de prêmio: ${appliedMultiplier}, win amount: ${winAmount}`);
        }
        
        console.log(`Atualizando aposta ID ${bet.id} para status "won" com prêmio ${winAmount}`);
        await this.updateBetStatus(bet.id, "won", winAmount);
        
        console.log(`Atualizando saldo do usuário ID ${bet.userId} com +${winAmount}`);
        await this.updateUserBalance(bet.userId, winAmount);
        
        console.log(`Aposta ID: ${bet.id} processada como vencedora`);
      } else {
        // Aposta perdedora
        console.log(`Atualizando aposta ID ${bet.id} para status "lost" (perdedora)`);
        await this.updateBetStatus(bet.id, "lost");
        console.log(`Aposta ID: ${bet.id} processada como perdedora`);
      }
    }
    
    console.log(`Todas as apostas processadas para o sorteio ID: ${drawId}`);
    return draw;
  }

  async updateDraw(drawId: number, drawData: Partial<Draw>): Promise<Draw | undefined> {
    try {
      console.log(`Updating draw ID ${drawId} with data:`, drawData);
      
      // Validar que o sorteio existe
      const drawExists = await this.getDraw(drawId);
      if (!drawExists) {
        console.log(`Draw ID ${drawId} not found`);
        return undefined;
      }
      
      // Verificar se é um sorteio já concluído (apenas para log)
      if (drawExists.status === "completed") {
        console.log(`Updating a completed draw ID ${drawId} - proceeding anyway`);
      }
      
      // Tratar a data recebida adequadamente
      let dateToUse = drawExists.date;
      if (drawData.date) {
        try {
          // Se for uma string, converte para Date
          const dateStr = drawData.date as string; // Type assertion para string
          if (typeof dateStr === 'string') {
            // Para datas no formato YYYY-MM-DD (vindo do input type="date")
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const dateParts = dateStr.split('-');
              const year = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1; // Mês em JS é 0-indexed
              const day = parseInt(dateParts[2]);
              
              // Pegar a hora do sorteio existente
              const existingDate = new Date(drawExists.date);
              const hours = existingDate.getHours();
              const minutes = existingDate.getMinutes();
              
              dateToUse = new Date(year, month, day, hours, minutes);
              console.log("Converted date from string:", dateToUse);
            } else {
              // Outras tentativas de parse
              dateToUse = new Date(drawData.date);
            }
          } else if (drawData.date instanceof Date) {
            dateToUse = drawData.date;
          }
        } catch (e) {
          console.error("Error parsing date:", e);
          throw new Error("Formato de data inválido");
        }
      }
      
      // Atualizar apenas campos permitidos
      const updatedDraws = await db.update(draws)
        .set({
          name: drawData.name || drawExists.name,
          time: drawData.time || drawExists.time,
          date: dateToUse,
        })
        .where(eq(draws.id, drawId))
        .returning();
      
      if (updatedDraws.length === 0) {
        return undefined;
      }
      
      console.log(`Draw ID ${drawId} updated successfully`);
      return updatedDraws[0];
    } catch (err) {
      console.error(`Error updating draw ID ${drawId}:`, err);
      throw err;
    }
  }
  
  async deleteDraw(drawId: number): Promise<void> {
    try {
      console.log(`Attempting to delete draw ID ${drawId}`);
      
      // Validar que o sorteio existe
      const drawExists = await this.getDraw(drawId);
      if (!drawExists) {
        console.log(`Draw ID ${drawId} not found`);
        throw new Error("Sorteio não encontrado");
      }
      
      // Não permitir excluir sorteios que já foram concluídos
      if (drawExists.status === "completed") {
        console.log(`Cannot delete completed draw ID ${drawId}`);
        throw new Error("Não é possível excluir sorteios já concluídos");
      }
      
      // Verificar se existem apostas associadas a este sorteio
      const bets = await this.getBetsByDrawId(drawId);
      if (bets.length > 0) {
        console.log(`Cannot delete draw ID ${drawId} because it has ${bets.length} associated bets`);
        throw new Error("Não é possível excluir sorteios que possuem apostas associadas");
      }
      
      // Excluir sorteio
      await db.delete(draws).where(eq(draws.id, drawId));
      console.log(`Draw ID ${drawId} deleted successfully`);
    } catch (err) {
      console.error(`Error deleting draw ID ${drawId}:`, err);
      throw err;
    }
  }
  
  async getAllDraws(): Promise<Draw[]> {
    return await db.select().from(draws);
  }

  // Stats
  async getPopularAnimals(): Promise<{animalId: number, count: number}[]> {
    const result = await db
      .select({
        animalId: bets.animalId,
        count: sql`count(*)::int`,
      })
      .from(bets)
      .where(sql`animal_id IS NOT NULL`)
      .groupBy(bets.animalId)
      .orderBy(desc(sql`count(*)`));
    
    // Filtrar entradas nulas e converter contagem para número
    const filteredResult = result
      .filter(item => item.animalId !== null)
      .map(item => ({
        animalId: item.animalId as number, // Forçar tipo como number após filtrar nulos
        count: Number(item.count)
      }));
    
    return filteredResult;
  }
  
  // Game Mode Management
  async getGameMode(id: number): Promise<GameMode | undefined> {
    const [gameMode] = await db.select().from(gameModes).where(eq(gameModes.id, id));
    return gameMode;
  }
  
  async getGameModeByName(name: string): Promise<GameMode | undefined> {
    const [gameMode] = await db.select().from(gameModes).where(eq(gameModes.name, name));
    return gameMode;
  }
  
  async getAllGameModes(): Promise<GameMode[]> {
    return await db.select().from(gameModes).orderBy(asc(gameModes.name));
  }
  
  async createGameMode(gameMode: InsertGameMode): Promise<GameMode> {
    const [newGameMode] = await db.insert(gameModes).values({
      ...gameMode,
      createdAt: new Date(),
    }).returning();
    return newGameMode;
  }
  
  async updateGameMode(id: number, gameModeData: Partial<GameMode>): Promise<GameMode | undefined> {
    // Filter out disallowed fields
    const { id: modeId, createdAt, ...allowedFields } = gameModeData as any;
    
    const [gameMode] = await db
      .update(gameModes)
      .set(allowedFields)
      .where(eq(gameModes.id, id))
      .returning();
    
    return gameMode;
  }
  
  async deleteGameMode(id: number): Promise<void> {
    await db.delete(gameModes).where(eq(gameModes.id, id));
  }
  
  // System Settings Management
  async getSystemSettings(): Promise<SystemSettings | null> {
    try {
      // Query for system settings
      const result = await pool.query(`
        SELECT * FROM system_settings ORDER BY id DESC LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      // Log os valores booleanos recebidos do banco
      console.log("System settings from database:", {
        allowUserRegistration: row.allow_user_registration,
        allowDeposits: row.allow_deposits,
        allowWithdrawals: row.allow_withdrawals,
        maintenanceMode: row.maintenance_mode,
        autoApproveWithdrawals: row.auto_approve_withdrawals,
        autoApproveWithdrawalLimit: row.auto_approve_withdrawal_limit,
        allowWithdrawalsType: typeof row.allow_withdrawals
      });
      
      // Convertendo explicitamente para boolean
      const settings = {
        maxBetAmount: row.max_bet_amount,
        maxPayout: row.max_payout,
        minBetAmount: row.min_bet_amount || 50, // Valor mínimo padrão de 0.50 reais (50 centavos)
        defaultBetAmount: row.default_bet_amount || 200, // Valor padrão de 2.00 reais
        mainColor: row.main_color,
        secondaryColor: row.secondary_color,
        accentColor: row.accent_color,
        allowUserRegistration: Boolean(row.allow_user_registration),
        allowDeposits: Boolean(row.allow_deposits),
        allowWithdrawals: Boolean(row.allow_withdrawals),
        maintenanceMode: Boolean(row.maintenance_mode),
        autoApproveWithdrawals: Boolean(row.auto_approve_withdrawals),
        autoApproveWithdrawalLimit: parseFloat(row.auto_approve_withdrawal_limit) || 0
      };
      
      // Log dos valores após conversão
      console.log("System settings after boolean conversion:", {
        allowUserRegistration: settings.allowUserRegistration,
        allowDeposits: settings.allowDeposits,
        allowWithdrawals: settings.allowWithdrawals,
        maintenanceMode: settings.maintenanceMode
      });
      
      return settings;
    } catch (error) {
      console.error("Error getting system settings:", error);
      return null;
    }
  }
  
  async saveSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
    try {
      console.log("Saving system settings:", settings);
      
      // Garantir que os valores booleanos estejam explicitamente como true/false
      const booleanSettings = {
        ...settings,
        allowUserRegistration: Boolean(settings.allowUserRegistration),
        allowDeposits: Boolean(settings.allowDeposits),
        allowWithdrawals: Boolean(settings.allowWithdrawals),
        maintenanceMode: Boolean(settings.maintenanceMode),
        autoApproveWithdrawals: Boolean(settings.autoApproveWithdrawals),
        autoApproveWithdrawalLimit: Number(settings.autoApproveWithdrawalLimit) || 0
      };
      
      console.log("Normalized boolean settings:", {
        allowUserRegistration: booleanSettings.allowUserRegistration,
        allowDeposits: booleanSettings.allowDeposits,
        allowWithdrawals: booleanSettings.allowWithdrawals,
        maintenanceMode: booleanSettings.maintenanceMode,
        autoApproveWithdrawals: booleanSettings.autoApproveWithdrawals,
        autoApproveWithdrawalLimit: booleanSettings.autoApproveWithdrawalLimit
      });
      
      // Convert from camelCase to snake_case for database
      const result = await pool.query(`
        INSERT INTO system_settings (
          max_bet_amount, 
          max_payout,
          min_bet_amount,
          default_bet_amount,
          main_color, 
          secondary_color, 
          accent_color, 
          allow_user_registration, 
          allow_deposits, 
          allow_withdrawals, 
          maintenance_mode,
          auto_approve_withdrawals,
          auto_approve_withdrawal_limit,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *
      `, [
        booleanSettings.maxBetAmount,
        booleanSettings.maxPayout,
        booleanSettings.minBetAmount || 50,
        booleanSettings.defaultBetAmount || 200,
        booleanSettings.mainColor,
        booleanSettings.secondaryColor,
        booleanSettings.accentColor,
        booleanSettings.allowUserRegistration,
        booleanSettings.allowDeposits,
        booleanSettings.allowWithdrawals,
        booleanSettings.maintenanceMode,
        booleanSettings.autoApproveWithdrawals,
        booleanSettings.autoApproveWithdrawalLimit
      ]);
      
      const row = result.rows[0];
      
      // Log valores salvados no banco
      console.log("Saved settings in database:", {
        allowUserRegistration: row.allow_user_registration,
        allowDeposits: row.allow_deposits,
        allowWithdrawals: row.allow_withdrawals,
        maintenanceMode: row.maintenance_mode,
        autoApproveWithdrawals: row.auto_approve_withdrawals,
        autoApproveWithdrawalLimit: row.auto_approve_withdrawal_limit
      });
      
      // Map back to camelCase for the API
      return {
        maxBetAmount: row.max_bet_amount,
        maxPayout: row.max_payout,
        minBetAmount: row.min_bet_amount || 50,
        defaultBetAmount: row.default_bet_amount || 200,
        mainColor: row.main_color,
        secondaryColor: row.secondary_color,
        accentColor: row.accent_color,
        allowUserRegistration: row.allow_user_registration,
        allowDeposits: row.allow_deposits,
        allowWithdrawals: row.allow_withdrawals,
        maintenanceMode: row.maintenance_mode,
        autoApproveWithdrawals: Boolean(row.auto_approve_withdrawals),
        autoApproveWithdrawalLimit: parseFloat(row.auto_approve_withdrawal_limit) || 0
      };
    } catch (error) {
      console.error("Error saving system settings:", error);
      throw error;
    }
  }

  // Implementação dos métodos para gateway de pagamento
  async getAllPaymentGateways(): Promise<PaymentGateway[]> {
    try {
      const result = await db.select().from(paymentGateways);
      return result;
    } catch (error) {
      console.error("Error getting all payment gateways:", error);
      return [];
    }
  }

  async getPaymentGateway(id: number): Promise<PaymentGateway | undefined> {
    try {
      const [gateway] = await db
        .select()
        .from(paymentGateways)
        .where(eq(paymentGateways.id, id));
      return gateway;
    } catch (error) {
      console.error(`Error getting payment gateway with ID ${id}:`, error);
      return undefined;
    }
  }

  async getPaymentGatewayByType(type: string): Promise<PaymentGateway | undefined> {
    try {
      const [gateway] = await db
        .select()
        .from(paymentGateways)
        .where(eq(paymentGateways.type, type));
      return gateway;
    } catch (error) {
      console.error(`Error getting payment gateway with type ${type}:`, error);
      return undefined;
    }
  }

  async createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway> {
    try {
      const [createdGateway] = await db
        .insert(paymentGateways)
        .values({
          ...gateway,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return createdGateway;
    } catch (error) {
      console.error("Error creating payment gateway:", error);
      throw error;
    }
  }

  async updatePaymentGateway(id: number, gatewayData: Partial<PaymentGateway>): Promise<PaymentGateway | undefined> {
    try {
      const [updatedGateway] = await db
        .update(paymentGateways)
        .set({
          ...gatewayData,
          updatedAt: new Date()
        })
        .where(eq(paymentGateways.id, id))
        .returning();
      return updatedGateway;
    } catch (error) {
      console.error(`Error updating payment gateway with ID ${id}:`, error);
      return undefined;
    }
  }

  async deletePaymentGateway(id: number): Promise<void> {
    try {
      await db
        .delete(paymentGateways)
        .where(eq(paymentGateways.id, id));
    } catch (error) {
      console.error(`Error deleting payment gateway with ID ${id}:`, error);
      throw error;
    }
  }

  // Implementação dos métodos para transações de pagamento
  async createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    try {
      const [createdTransaction] = await db
        .insert(paymentTransactions)
        .values({
          ...transaction,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return createdTransaction;
    } catch (error) {
      console.error("Error creating payment transaction:", error);
      throw error;
    }
  }

  async getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined> {
    try {
      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, id));
      return transaction;
    } catch (error) {
      console.error(`Error getting payment transaction with ID ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Recupera as transações de pagamento de um usuário com múltiplas camadas de segurança
   * para garantir isolamento total de dados entre usuários
   */
  async getUserTransactions(userId: number): Promise<PaymentTransaction[]> {
    try {
      // Verificação preliminar - validar se o ID do usuário é válido
      if (!userId || userId <= 0) {
        console.error(`SEGURANÇA: Tentativa de acesso a transações com ID de usuário inválido (${userId})`);
        return [];
      }
      
      // Verificar se o usuário realmente existe antes de prosseguir
      const userExists = await this.getUser(userId);
      if (!userExists) {
        console.error(`SEGURANÇA: Tentativa de buscar transações para usuário inexistente ID=${userId}`);
        return []; // Retorna lista vazia se o usuário não existir
      }
      
      console.log(`Buscando transações para usuário ID: ${userId}`);
      
      // MÉTODO 1: Consulta primária com filtro rigoroso e explícito por userId
      const transactions = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.userId, userId))
        .orderBy(desc(paymentTransactions.createdAt));
      
      console.log(`Query retornou ${transactions.length} transações para usuário ID: ${userId} diretamente do banco`);
      
      // MÉTODO 2: Verificação individual de cada transação como camada adicional de segurança
      const verifiedTransactions = transactions.filter(transaction => {
        const isOwner = transaction.userId === userId;
        
        // Registrar violações individuais para auditoria detalhada
        if (!isOwner) {
          console.error(`VIOLAÇÃO DE DADOS: Transação ID=${transaction.id} pertence ao usuário ${transaction.userId} mas foi retornada na consulta do usuário ${userId}`);
        }
        
        return isOwner;
      });
      
      // Verificação estatística e alerta crítico
      if (verifiedTransactions.length !== transactions.length) {
        console.error(`ALERTA DE SEGURANÇA CRÍTICO: Consulta de transações para usuário ${userId} retornou ${transactions.length - verifiedTransactions.length} transações de outros usuários!`);
        
        // Registrar detalhes das transações problemáticas para investigação
        const problematicTransactions = transactions.filter(tx => tx.userId !== userId);
        console.error(`DETALHES DE VIOLAÇÃO: ${JSON.stringify(problematicTransactions.map(tx => ({
          id: tx.id,
          wrongUserId: tx.userId,
          amount: tx.amount,
          status: tx.status,
          // Remova a referência a tx.type que não existe no tipo PaymentTransaction
          createdAt: tx.createdAt
        })))}`);
        
        // Alertar sobre possível comprometimento de sistema ou tentativa de ataque
        console.error(`ALERTA DE SEGURANÇA: Potencial comprometimento de segurança detectado ao acessar dados do usuário ${userId}`);
      } else {
        console.log(`SEGURANÇA OK: Todas as ${verifiedTransactions.length} transações pertencem exclusivamente ao usuário ${userId}`);
      }
      
      // MÉTODO 3: Verificação final assegurando que nenhum dado sensível seja vazado
      const sanitizedTransactions = verifiedTransactions.map(transaction => {
        // Verificação tripla de propriedade
        if (transaction.userId !== userId) {
          console.error(`ERRO DE CONSISTÊNCIA: Transação ${transaction.id} apresentou inconsistência de userId após filtro`);
          return null; // Não incluir esta transação no resultado
        }
        
        // Remover informações sensíveis da resposta do gateway
        if (transaction.gatewayResponse) {
          // Se for string, tentamos neutralizar informações sensíveis
          if (typeof transaction.gatewayResponse === 'string') {
            try {
              // Tenta parsear se for JSON
              const responseObj = JSON.parse(transaction.gatewayResponse as string);
              
              // Remove campos sensíveis
              const { 
                apiKey, token, secret, password, auth, webhook_url,
                customer_info, customer_data, payer_details, 
                account_info, ...safeData 
              } = responseObj;
              
              // Substitui a resposta completa por versão sanitizada
              transaction.gatewayResponse = JSON.stringify(safeData);
            } catch (e) {
              // Se não for JSON, trunca para evitar vazamento
              const responseString = transaction.gatewayResponse as string;
              transaction.gatewayResponse = `Resposta original sanitizada (${responseString.length} caracteres)`;
            }
          } else {
            // Se não for string, neutraliza completamente
            transaction.gatewayResponse = 'Dados sanitizados por motivos de segurança';
          }
        }
        
        return transaction;
      }).filter(tx => tx !== null) as PaymentTransaction[];
      
      console.log(`RESPOSTA: Retornando ${sanitizedTransactions.length} transações sanitizadas para usuário ${userId}`);
      return sanitizedTransactions;
    } catch (error) {
      console.error(`ERRO CRÍTICO: Falha ao buscar transações para usuário ${userId}:`, error);
      return [];
    }
  }

  async updateTransactionStatus(
    id: number, 
    status: string, 
    externalId?: string, 
    externalUrl?: string, 
    response?: any
  ): Promise<PaymentTransaction | undefined> {
    try {
      const updateData: Partial<PaymentTransaction> = {
        status,
        updatedAt: new Date()
      };

      if (externalId) updateData.externalId = externalId;
      if (externalUrl) updateData.externalUrl = externalUrl;
      if (response) updateData.gatewayResponse = response;

      const [updatedTransaction] = await db
        .update(paymentTransactions)
        .set(updateData)
        .where(eq(paymentTransactions.id, id))
        .returning();

      return updatedTransaction;
    } catch (error) {
      console.error(`Error updating transaction status with ID ${id}:`, error);
      return undefined;
    }
  }
  
  // Implementação dos métodos para gerenciamento de saques
  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    try {
      console.log(`Criando solicitação de saque para usuário ${withdrawal.userId} no valor de R$ ${withdrawal.amount}`);
      
      // Verificações de segurança e validação
      if (withdrawal.amount <= 0) {
        throw new Error("Valor de saque deve ser positivo");
      }
      
      // Verificar se o usuário existe
      const user = await this.getUser(withdrawal.userId);
      if (!user) {
        throw new Error("Usuário não encontrado");
      }
      
      // Verificar se o usuário tem saldo suficiente
      if (user.balance < withdrawal.amount) {
        throw new Error(`Saldo insuficiente para saque. Saldo atual: R$ ${user.balance.toFixed(2)}`);
      }
      
      // Verificar se saques estão permitidos nas configurações do sistema
      const settings = await this.getSystemSettings();
      if (settings && !settings.allowWithdrawals) {
        throw new Error("Saques estão temporariamente desativados");
      }
      
      // Criar o registro de saque no banco
      const [createdWithdrawal] = await db
        .insert(withdrawals)
        .values({
          userId: withdrawal.userId,
          amount: withdrawal.amount,
          pixKey: withdrawal.pixKey,
          pixKeyType: withdrawal.pixKeyType,
          status: "pending" as WithdrawalStatus,
          requestedAt: new Date()
        })
        .returning();
      
      // Verificar se o saque deve ser aprovado automaticamente
      if (settings && settings.autoApproveWithdrawals && withdrawal.amount <= settings.autoApproveWithdrawalLimit) {
        console.log(`Saque ID=${createdWithdrawal.id} de R$ ${withdrawal.amount} será processado automaticamente (abaixo do limite de R$ ${settings.autoApproveWithdrawalLimit})`);
        
        // Mudamos para "processing" em vez de "approved" - o saque só será aprovado após confirmação do gateway
        await this.updateWithdrawalStatus(createdWithdrawal.id, "processing" as WithdrawalStatus, null, null, "Em processamento via gateway de pagamento PIX");
        
        // Atualizar o saldo do usuário APENAS quando o pagamento for confirmado pelo gateway
        // Não atualizamos o saldo aqui, apenas quando status=approved
        
        // Recarregar o saque para retornar o status atualizado
        const [updatedWithdrawal] = await db
          .select()
          .from(withdrawals)
          .where(eq(withdrawals.id, createdWithdrawal.id));
          
        // Precisamos criar um registro de transação externa para rastrear este saque no gateway de pagamento
        // Este será usado para verificar o status do pagamento posteriormente
        try {
          // Buscar gateway de pagamento ativo para PIX
          const gateway = await this.getPaymentGatewayByType("pushinpay");
          
          if (gateway && gateway.isActive) {
            // Criar transação para rastreamento
            const paymentTx = await this.createPaymentTransaction({
              userId: withdrawal.userId,
              gatewayId: gateway.id,
              amount: withdrawal.amount,
              type: "withdrawal",
              status: "pending",
              description: `Saque PIX (${withdrawal.pixKeyType}: ${withdrawal.pixKey})`,
              metadata: {
                withdrawalId: createdWithdrawal.id
              }
            });
            
            console.log(`Registro de transação PIX ${paymentTx.id} criado para saque ${createdWithdrawal.id}`);
            
            // Atualizar o saque com a referência da transação de pagamento
            await db
              .update(withdrawals)
              .set({ 
                notes: `Em processamento via gateway ${gateway.name}. ID da transação: ${paymentTx.id}`
              })
              .where(eq(withdrawals.id, createdWithdrawal.id));
          } else {
            console.warn(`Nenhum gateway de pagamento PIX ativo encontrado para processar saque ${createdWithdrawal.id}`);
          }
        } catch (err) {
          console.error(`Erro ao registrar transação de saque no gateway: ${err}`);
          // Continuamos mesmo se houver erro aqui, para não bloquear o processo
        }
          
        return updatedWithdrawal;
      } else {
        console.log(`Saque ID=${createdWithdrawal.id} de R$ ${withdrawal.amount} aguardando aprovação manual do administrador`);
      }
      
      return createdWithdrawal;
    } catch (error) {
      console.error("Erro ao criar solicitação de saque:", error);
      throw error;
    }
  }
  
  async getWithdrawal(id: number): Promise<Withdrawal | undefined> {
    try {
      // Usar SQL bruto para evitar problemas com colunas ausentes
      const withdrawalResult = await db.execute(
        `SELECT w.id, w.user_id as "userId", w.amount, w.status, w.pix_key as "pixKey", 
                w.pix_key_type as "pixKeyType", w.requested_at as "requestedAt", 
                w.processed_at as "processedAt", w.processed_by as "processedBy", 
                w.rejection_reason as "rejectionReason", w.notes,
                u.username, u.email as "userEmail"
         FROM withdrawals w
         LEFT JOIN users u ON w.user_id = u.id
         WHERE w.id = $1`,
        [id]
      );
      
      if (!withdrawalResult || withdrawalResult.length === 0) {
        return undefined;
      }
      
      const withdrawal = withdrawalResult[0];
      
      // Se tiver processador, buscar nome do admin
      let adminUsername: string | undefined;
      if (withdrawal.processedBy) {
        const adminQuery = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, withdrawal.processedBy));
        
        if (adminQuery && adminQuery.length > 0) {
          adminUsername = adminQuery[0].username;
        }
      }
      
      // Combinar os resultados em um único objeto
      return {
        ...withdrawal,
        adminUsername: adminUsername
      } as unknown as Withdrawal;
    } catch (error) {
      console.error(`Erro ao buscar saque ID=${id}:`, error);
      return undefined;
    }
  }
  
  async getUserWithdrawals(userId: number): Promise<Withdrawal[]> {
    try {
      // Verificações de segurança
      if (!userId || userId <= 0) {
        console.error(`Tentativa de acessar saques com ID de usuário inválido: ${userId}`);
        return [];
      }
      
      // Usar SQL bruto para evitar problemas com colunas ausentes
      const withdrawalQuery = await db.execute(
        `SELECT id, user_id, amount, status, pix_key, pix_key_type, 
                requested_at, processed_at, processed_by, rejection_reason, notes 
         FROM withdrawals 
         WHERE user_id = $1 
         ORDER BY requested_at DESC`,
        [userId]
      );
      
      // Para cada saque, buscar informações adicionais
      const result = await Promise.all(withdrawalQuery.map(async (withdrawal) => {
        // Se tiver processador, buscar nome do admin
        let adminUsername: string | undefined;
        if (withdrawal.processedBy) {
          const adminQuery = await db
            .select({ username: users.username })
            .from(users)
            .where(eq(users.id, withdrawal.processedBy));
          
          if (adminQuery && adminQuery.length > 0) {
            adminUsername = adminQuery[0].username;
          }
        }
        
        return {
          ...withdrawal,
          adminUsername
        };
      }));
      
      return result as unknown as Withdrawal[];
    } catch (error) {
      console.error(`Erro ao buscar saques do usuário ${userId}:`, error);
      return [];
    }
  }
  
  async getAllWithdrawals(status?: WithdrawalStatus): Promise<Withdrawal[]> {
    try {
      // Usar SQL bruto para evitar problemas com colunas ausentes
      let sqlQuery = `
        SELECT w.id, w.user_id as "userId", w.amount, w.status, w.pix_key as "pixKey", 
               w.pix_key_type as "pixKeyType", w.requested_at as "requestedAt", 
               w.processed_at as "processedAt", w.processed_by as "processedBy", 
               w.rejection_reason as "rejectionReason", w.notes,
               u.username, u.email as "userEmail"
        FROM withdrawals w
        LEFT JOIN users u ON w.user_id = u.id
        ${status ? 'WHERE w.status = $1' : ''}
        ORDER BY w.requested_at DESC
      `;
      
      // Executar a consulta
      const withdrawalResult = await db.execute(sqlQuery, status ? [status] : []);
      
      // Para cada saque, buscar informações adicionais do admin
      const result = await Promise.all(withdrawalResult.map(async (withdrawal: any) => {
        // Se tiver processador, buscar nome do admin
        let adminUsername: string | undefined;
        if (withdrawal.processedBy) {
          const adminQuery = await db
            .select({ username: users.username })
            .from(users)
            .where(eq(users.id, withdrawal.processedBy));
          
          if (adminQuery && adminQuery.length > 0) {
            adminUsername = adminQuery[0].username;
          }
        }
        
        return {
          ...withdrawal,
          adminUsername
        };
      }));
      
      return result as unknown as Withdrawal[];
    } catch (error) {
      console.error("Erro ao buscar todos os saques:", error);
      return [];
    }
  }
  
  async updateWithdrawalStatus(
    id: number, 
    status: WithdrawalStatus, 
    processedBy?: number, 
    rejectionReason?: string, 
    notes?: string
  ): Promise<Withdrawal | undefined> {
    try {
      // Buscar informações do saque antes de atualizar
      const withdrawal = await this.getWithdrawal(id);
      if (!withdrawal) {
        throw new Error(`Saque ID=${id} não encontrado`);
      }
      
      // Validar a transição de status
      if (withdrawal.status === 'approved' || withdrawal.status === 'rejected') {
        throw new Error(`Saque já foi ${withdrawal.status === 'approved' ? 'aprovado' : 'rejeitado'} e não pode ser modificado`);
      }
      
      // Preparar dados para atualização
      const updateData: any = {
        status,
        processedAt: new Date(),
      };
      
      if (processedBy) updateData.processedBy = processedBy;
      if (rejectionReason) updateData.rejectionReason = rejectionReason;
      if (notes) updateData.notes = notes;
      
      // Atualizar o status do saque
      const [updatedWithdrawal] = await db
        .update(withdrawals)
        .set(updateData)
        .where(eq(withdrawals.id, id))
        .returning();
      
      if (!updatedWithdrawal) {
        throw new Error(`Falha ao atualizar saque ID=${id}`);
      }
      
      // Se o saque foi aprovado, atualizar o saldo do usuário
      if (status === 'approved') {
        console.log(`Saque ID=${id} aprovado, atualizando saldo do usuário ${withdrawal.userId}`);
        
        // Reduzir o saldo do usuário
        await this.updateUserBalance(withdrawal.userId, -withdrawal.amount);
        
        // Registrar esta transação no histórico financeiro
        await this.createTransaction({
          userId: withdrawal.userId,
          type: "withdrawal" as TransactionType,
          amount: withdrawal.amount,
          description: `Saque aprovado por admin${processedBy ? ` (ID=${processedBy})` : ''}`,
          relatedId: id
        });
      }
      
      // Recuperar os detalhes completos do saque atualizado
      return await this.getWithdrawal(id);
    } catch (error) {
      console.error(`Erro ao atualizar status do saque ID=${id}:`, error);
      throw error;
    }
  }
  
  // Implementação dos métodos para histórico de transações financeiras
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    try {
      const [createdTransaction] = await db
        .insert(transactions)
        .values({
          userId: transaction.userId,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description || null,
          relatedId: transaction.relatedId || null,
          createdAt: new Date()
        })
        .returning();
      
      return createdTransaction;
    } catch (error) {
      console.error("Erro ao criar registro de transação:", error);
      throw error;
    }
  }
  
  async getUserTransactionHistory(userId: number): Promise<Transaction[]> {
    try {
      // Verificações de segurança
      if (!userId || userId <= 0) {
        console.error(`Tentativa de acessar histórico de transações com ID de usuário inválido: ${userId}`);
        return [];
      }
      
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt));
      
      return result;
    } catch (error) {
      console.error(`Erro ao buscar histórico de transações do usuário ${userId}:`, error);
      return [];
    }
  }
  
  async getAllTransactions(type?: TransactionType, startDate?: Date, endDate?: Date): Promise<Transaction[]> {
    try {
      // Começar com a query básica
      let query = db
        .select({
          transaction: transactions,
          username: users.username
        })
        .from(transactions)
        .innerJoin(users, eq(transactions.userId, users.id));
      
      // Adicionar condições se necessário
      if (type) {
        query = query.where(eq(transactions.type, type));
      }
      
      if (startDate) {
        query = query.where(
          sql`${transactions.createdAt} >= ${startDate}`
        );
      }
      
      if (endDate) {
        query = query.where(
          sql`${transactions.createdAt} <= ${endDate}`
        );
      }
      
      // Ordenar resultados
      query = query.orderBy(desc(transactions.createdAt));
      
      // Executar query
      const result = await query;
      
      // Formatar resultado
      return result.map(row => ({
        ...row.transaction,
        username: row.username
      })) as unknown as Transaction[];
    } catch (error) {
      console.error("Erro ao buscar todas as transações:", error);
      return [];
    }
  }
  
  async getTransactionsSummary(startDate?: Date, endDate?: Date): Promise<{
    deposits: { count: number, total: number },
    withdrawals: { count: number, total: number },
    bets: { count: number, total: number },
    wins: { count: number, total: number }
  }> {
    try {
      // Criar query base para filtragem por data
      let dateCondition = '';
      const params: any[] = [];
      
      if (startDate) {
        dateCondition += ' AND created_at >= $' + (params.length + 1);
        params.push(startDate);
      }
      
      if (endDate) {
        dateCondition += ' AND created_at <= $' + (params.length + 1);
        params.push(endDate);
      }
      
      // Consulta para depósitos
      const depositsQuery = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'deposit'${dateCondition}
      `, params);
      
      // Consulta para saques
      const withdrawalsQuery = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'withdrawal'${dateCondition}
      `, params);
      
      // Consulta para apostas
      const betsQuery = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'bet'${dateCondition}
      `, params);
      
      // Consulta para ganhos
      const winsQuery = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE type = 'win'${dateCondition}
      `, params);
      
      return {
        deposits: {
          count: parseInt(depositsQuery.rows[0].count),
          total: parseFloat(depositsQuery.rows[0].total)
        },
        withdrawals: {
          count: parseInt(withdrawalsQuery.rows[0].count),
          total: parseFloat(withdrawalsQuery.rows[0].total)
        },
        bets: {
          count: parseInt(betsQuery.rows[0].count),
          total: parseFloat(betsQuery.rows[0].total)
        },
        wins: {
          count: parseInt(winsQuery.rows[0].count),
          total: parseFloat(winsQuery.rows[0].total)
        }
      };
    } catch (error) {
      console.error("Erro ao gerar resumo de transações:", error);
      return {
        deposits: { count: 0, total: 0 },
        withdrawals: { count: 0, total: 0 },
        bets: { count: 0, total: 0 },
        wins: { count: 0, total: 0 }
      };
    }
  }
}

export const storage = new DatabaseStorage();
