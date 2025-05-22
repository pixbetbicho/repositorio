import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, real, jsonb, varchar, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  name: text("name"),
  // Removido: cpf: text("cpf").unique(),
  balance: real("balance").default(0).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  // Removido: defaultPixKey: text("default_pix_key"),
  // Removido: defaultPixKeyType: text("default_pix_key_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isAdmin: true,
  createdAt: true,
  balance: true,
});

// Animal schema
export const animals = pgTable("animals", {
  id: serial("id").primaryKey(),
  group: integer("group").notNull(),
  name: text("name").notNull(),
  numbers: text("numbers").array().notNull(),
});

export const insertAnimalSchema = createInsertSchema(animals).omit({
  id: true,
});

// Draw status
export const drawStatuses = ["pending", "completed"] as const;
export const DrawStatusEnum = z.enum(drawStatuses);
export type DrawStatus = z.infer<typeof DrawStatusEnum>;

// Prêmio types
export const premioTypes = ["1", "2", "3", "4", "5", "1-5"] as const;
export const PremioTypeEnum = z.enum(premioTypes);
export type PremioType = z.infer<typeof PremioTypeEnum>;

// Bet types
export const betTypes = [
  "group", // Grupo (animal)
  "duque_grupo", // Duque de Grupo (2 animais)
  "terno_grupo", // Terno de Grupo (3 animais)
  "quadra_duque", // Quadra de Duque (4 animais)
  "quina_grupo", // Quina de Grupo (5 animais)
  "dozen", // Dezena (2 números)
  "duque_dezena", // Duque de Dezena (2 dezenas)
  "terno_dezena", // Terno de Dezena (3 dezenas)
  "hundred", // Centena (3 números)
  "thousand", // Milhar (4 números)
  "passe_ida", // Passe IDA (2 animais)
  "passe_ida_volta" // Passe IDA X VOLTA (2 animais)
] as const;
export const BetTypeEnum = z.enum(betTypes);
export type BetType = z.infer<typeof BetTypeEnum>;

// Draws schema
export const draws = pgTable("draws", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  time: text("time").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").default("pending").notNull(),
  // Suporte para 5 prêmios (5 animais diferentes)
  resultAnimalId: integer("result_animal_id"), // Primeiro prêmio (mantido para compatibilidade)
  resultAnimalId2: integer("result_animal_id_2"), // Segundo prêmio
  resultAnimalId3: integer("result_animal_id_3"), // Terceiro prêmio
  resultAnimalId4: integer("result_animal_id_4"), // Quarto prêmio
  resultAnimalId5: integer("result_animal_id_5"), // Quinto prêmio
  // Adicionando suporte para números de milhar em cada prêmio
  resultNumber1: text("result_number_1"), // Número para o primeiro prêmio (milhar)
  resultNumber2: text("result_number_2"), // Número para o segundo prêmio (milhar)
  resultNumber3: text("result_number_3"), // Número para o terceiro prêmio (milhar)
  resultNumber4: text("result_number_4"), // Número para o quarto prêmio (milhar)
  resultNumber5: text("result_number_5"), // Número para o quinto prêmio (milhar)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDrawSchema = createInsertSchema(draws)
  .extend({
    // Aceitar tanto string quanto Date para o campo date
    date: z.union([z.string(), z.date()]),
  })
  .omit({
    id: true,
    status: true,
    resultAnimalId: true,
    resultAnimalId2: true,
    resultAnimalId3: true,
    resultAnimalId4: true,
    resultAnimalId5: true,
    resultNumber1: true,
    resultNumber2: true,
    resultNumber3: true,
    resultNumber4: true,
    resultNumber5: true,
    createdAt: true,
  });

// Bets schema
export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  animalId: integer("animal_id"), // Principal animal para grupo
  animalId2: integer("animal_id_2"), // Para duque, terno, etc.
  animalId3: integer("animal_id_3"), // Para terno, quina, etc.
  animalId4: integer("animal_id_4"), // Para quadra, quina
  animalId5: integer("animal_id_5"), // Para quina
  amount: real("amount").notNull(), // Armazenamos diretamente como valor real (ex: 1.50)
  type: text("type").notNull(), // Tipo da aposta (grupo, dezena, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  drawId: integer("draw_id").notNull(),
  status: text("status").default("pending").notNull(),
  winAmount: real("win_amount"),
  gameModeId: integer("game_mode_id"),
  potentialWinAmount: real("potential_win_amount"),
  betNumbers: text("bet_numbers").array(), // Para armazenar múltiplos números (dezenas, centenas, etc.)
  premioType: text("premio_type").default("1"), // Tipo de prêmio (1, 2, 3, 4, 5, ou 1-5)
  useBonusBalance: boolean("use_bonus_balance").default(false), // Indica se a aposta deve usar saldo de bônus
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
  status: true,
  winAmount: true,
});

// Game modes and odds schema
export const gameModes = pgTable("game_modes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  odds: integer("odds").notNull(), // Stored in cents (e.g., 8000.00 = 800000)
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGameModeSchema = createInsertSchema(gameModes).omit({
  id: true,
  createdAt: true,
});

// Esquema extendido para validação e tipagem
export const betFormSchema = z.object({
  drawId: z.number().positive("Selecione um sorteio válido"),
  gameModeId: z.number().positive("Selecione uma modalidade de jogo"),
  useBonusBalance: z.boolean().optional().default(false), // Usar saldo de bônus
  amount: z.union([
    z.number()
      .positive("Valor deve ser positivo")
      .refine(
        (val) => {
          // Esta função será substituída em tempo de execução com o valor mínimo real
          // dos system_settings (minBetAmount/100)
          const minBetAmountFromSettings = 0.10; // Valor padrão, será sobrescrito pelo backend
          return val >= minBetAmountFromSettings;
        },
        {
          message: "Valor abaixo do mínimo permitido"
        }
      ),
    z.string()
      .transform((val) => {
        // Transforma a string em número usando parseMoneyValue (que terá que ser implementado no backend)
        // No frontend, o parseMoneyValue já está em utils.ts
        const cleanVal = val
          .replace(/\s+/g, '')
          .replace(/R\$/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
          
        return Number(cleanVal);
      })
  ]),
  type: z.enum(betTypes),
  
  // Campos opcionais dependendo do tipo de aposta
  animalId: z.number().optional(),
  animalId2: z.number().optional(),
  animalId3: z.number().optional(),
  animalId4: z.number().optional(),
  animalId5: z.number().optional(),
  
  // Suporte para apostas numéricas
  betNumber: z.string().optional(), // Campo para compatibilidade com formulários
  betNumbers: z.array(z.string()).optional(), // Campo para o banco de dados
  numbers: z.string().optional(), // Campo de compatibilidade para envios via POST simples
  
  premioType: z.enum(premioTypes).default("1"),
  potentialWinAmount: z.number().optional(),
});

// Export all types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAnimal = z.infer<typeof insertAnimalSchema>;
export type Animal = typeof animals.$inferSelect;

export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof bets.$inferSelect;
export type BetFormData = z.infer<typeof betFormSchema>;

export type InsertDraw = z.infer<typeof insertDrawSchema>;
export type Draw = typeof draws.$inferSelect;

export type InsertGameMode = z.infer<typeof insertGameModeSchema>;
export type GameMode = typeof gameModes.$inferSelect;

// Tipos adicionais para UI
export interface DrawWithDetails extends Draw {
  animal?: Animal;       // Primeiro prêmio
  animal2?: Animal;      // Segundo prêmio
  animal3?: Animal;      // Terceiro prêmio
  animal4?: Animal;      // Quarto prêmio
  animal5?: Animal;      // Quinto prêmio
}

export interface BetWithDetails extends Bet {
  animal?: Animal;
  animal2?: Animal;
  animal3?: Animal;
  animal4?: Animal;
  animal5?: Animal;
  draw?: Draw;
  gameMode?: GameMode;
}

// System Settings Schema
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  maxBetAmount: real("max_bet_amount").notNull().default(10000),
  maxPayout: real("max_payout").notNull().default(1000000),
  minBetAmount: real("min_bet_amount").notNull().default(50),
  defaultBetAmount: real("default_bet_amount").notNull().default(200),
  mainColor: text("main_color").notNull().default("#035faf"),
  secondaryColor: text("secondary_color").notNull().default("#b0d525"),
  accentColor: text("accent_color").notNull().default("#b0d524"),
  allowUserRegistration: boolean("allow_user_registration").notNull().default(true),
  allowDeposits: boolean("allow_deposits").notNull().default(true),
  allowWithdrawals: boolean("allow_withdrawals").notNull().default(true),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  autoApproveWithdrawals: boolean("auto_approve_withdrawals").notNull().default(true),
  autoApproveWithdrawalLimit: real("auto_approve_withdrawal_limit").notNull().default(30),
  siteName: text("site_name").notNull().default("Jogo do Bicho"),
  siteDescription: text("site_description").notNull().default("A melhor plataforma de apostas online"),
  logoUrl: text("logo_url").notNull().default("/img/logo.png"),
  faviconUrl: text("favicon_url").notNull().default("/img/favicon.png"),
  
  // Configurações de bônus de cadastro
  signupBonusEnabled: boolean("signup_bonus_enabled").default(false).notNull(),
  signupBonusAmount: real("signup_bonus_amount").default(10).notNull(),
  signupBonusRollover: real("signup_bonus_rollover").default(3).notNull(),
  signupBonusExpiration: integer("signup_bonus_expiration").default(7).notNull(),
  
  // Configurações de bônus de primeiro depósito
  firstDepositBonusEnabled: boolean("first_deposit_bonus_enabled").default(false).notNull(),
  firstDepositBonusAmount: real("first_deposit_bonus_amount").default(100).notNull(),
  firstDepositBonusRollover: real("first_deposit_bonus_rollover").default(3).notNull(),
  firstDepositBonusExpiration: integer("first_deposit_bonus_expiration").default(7).notNull(),
  firstDepositBonusPercentage: real("first_deposit_bonus_percentage").default(100).notNull(),
  firstDepositBonusMaxAmount: real("first_deposit_bonus_max_amount").default(200).notNull(),
  
  // Configurações de banners
  promotionalBannersEnabled: boolean("promotional_banners_enabled").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SystemSettings = {
  maxBetAmount: number;
  maxPayout: number;
  minBetAmount: number;
  defaultBetAmount: number;
  mainColor: string;
  secondaryColor: string;
  accentColor: string;
  allowUserRegistration: boolean;
  allowDeposits: boolean;
  allowWithdrawals: boolean;
  maintenanceMode: boolean;
  autoApproveWithdrawals: boolean;
  autoApproveWithdrawalLimit: number;
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  
  // Configurações de bônus de cadastro
  signupBonusEnabled: boolean;
  signupBonusAmount: number;
  signupBonusRollover: number;
  signupBonusExpiration: number;
  
  // Configurações de bônus de primeiro depósito
  firstDepositBonusEnabled: boolean;
  firstDepositBonusAmount: number;
  firstDepositBonusRollover: number;
  firstDepositBonusExpiration: number;
  firstDepositBonusPercentage: number;
  firstDepositBonusMaxAmount: number;
  
  // Configurações de banners
  promotionalBannersEnabled: boolean;
  
  // Configurações de apostas com bônus
  allowBonusBets: boolean;
};

// Payment Gateway Types
export const paymentGatewayTypes = ["pushinpay", "mercadopago", "pagseguro", "paypal"] as const; // removido: "ezzebank"
export const PaymentGatewayTypeEnum = z.enum(paymentGatewayTypes);
export type PaymentGatewayType = z.infer<typeof PaymentGatewayTypeEnum>;

// Payment Gateway Schema
export const paymentGateways = pgTable("payment_gateways", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  apiKey: text("api_key"),
  secretKey: text("secret_key"),
  sandbox: boolean("sandbox").default(true).notNull(),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentGatewaySchema = createInsertSchema(paymentGateways)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;
export type PaymentGateway = typeof paymentGateways.$inferSelect;

// Payment Transaction Schema
export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gatewayId: integer("gateway_id").notNull(),
  amount: real("amount").notNull(),
  status: text("status").default("pending").notNull(),
  type: text("type").default("deposit").notNull(),  // Novo campo para identificar se é depósito ou saque
  externalId: text("external_id"),
  externalUrl: text("external_url"),
  gatewayResponse: jsonb("gateway_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    gatewayResponse: true,
  });

export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// Status de saques
export const withdrawalStatuses = ["pending", "processing", "approved", "rejected"] as const;
export const WithdrawalStatusEnum = z.enum(withdrawalStatuses);
export type WithdrawalStatus = z.infer<typeof WithdrawalStatusEnum>;

// Schema de Saques
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(),
  status: text("status", { enum: withdrawalStatuses }).default("pending").notNull(),
  pixKey: text("pix_key").notNull(),
  pixKeyType: text("pix_key_type").notNull(),
  accountInfo: text("account_info"), // Informações genéricas da conta para saque
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals)
  .omit({
    id: true,
    status: true,
    requestedAt: true,
    processedAt: true,
    processedBy: true,
    rejectionReason: true,
    notes: true,
  });

export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;

// Tipos de Transação
export const transactionTypes = ["deposit", "withdrawal", "bet", "win", "bonus"] as const;
export const TransactionTypeEnum = z.enum(transactionTypes);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

// Schema de todas as transações
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type", { enum: transactionTypes }).notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  relatedId: integer("related_id"), // ID do pagamento, saque ou aposta relacionado
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({
    id: true,
    createdAt: true,
  });

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Tipos de bônus
export const bonusTypes = ["signup", "first_deposit", "promotional"] as const;
export const BonusTypeEnum = z.enum(bonusTypes);
export type BonusType = z.infer<typeof BonusTypeEnum>;

// Status dos bônus
export const bonusStatuses = ["active", "completed", "expired"] as const;
export const BonusStatusEnum = z.enum(bonusStatuses);
export type BonusStatus = z.infer<typeof BonusStatusEnum>;

// Bônus atribuídos a usuários
export const userBonuses = pgTable("user_bonuses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: bonusTypes }).notNull(),
  amount: real("amount").notNull(),
  remainingAmount: real("remaining_amount").notNull(),
  rolloverAmount: real("rollover_amount").notNull(), // Valor total que precisa ser apostado para liberar o bônus
  rolledAmount: real("rolled_amount").default(0).notNull(), // Valor já apostado
  status: text("status", { enum: bonusStatuses }).default("active").notNull(),
  expiresAt: timestamp("expires_at"), // Data de expiração do bônus
  completedAt: timestamp("completed_at"), // Data em que o bônus foi completado
  createdAt: timestamp("created_at").defaultNow().notNull(),
  relatedTransactionId: integer("related_transaction_id"), // ID da transação relacionada (para o bônus de primeiro depósito)
});

export const insertUserBonusSchema = createInsertSchema(userBonuses)
  .omit({
    id: true,
    completedAt: true,
    createdAt: true,
  });

// Banners promocionais
export const promotionalBanners = pgTable("promotional_banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  isLoginBanner: boolean("is_login_banner").default(false).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromotionalBannerSchema = createInsertSchema(promotionalBanners)
  .omit({
    id: true,
    createdAt: true,
  });

export type UserBonus = typeof userBonuses.$inferSelect;
export type InsertUserBonus = z.infer<typeof insertUserBonusSchema>;

export type PromotionalBanner = typeof promotionalBanners.$inferSelect;
export type InsertPromotionalBanner = z.infer<typeof insertPromotionalBannerSchema>;

// Adicionando campos ao sistema de configurações
// As configurações de bônus já estão incluídas no schema de system_settings
