// Script para reinicializar o banco de dados em produção - CommonJS versão
const pg = require('pg');
const crypto = require('crypto');
const util = require('util');

// Configurações
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Função auxiliar para hash de senha (mesma do auth.js)
async function hashPassword(password) {
  const scryptAsync = util.promisify(crypto.scrypt);
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// Configuração da conexão
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Função para dropar uma tabela
async function dropTable(tableName) {
  console.log(`Tentando dropar tabela: ${tableName}`);
  try {
    await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    console.log(`✅ Tabela ${tableName} dropada com sucesso`);
  } catch (error) {
    console.error(`❌ Erro ao dropar tabela ${tableName}:`, error.message);
  }
}

// Função principal de reset
async function resetDatabase() {
  console.log("🔄 Iniciando reset do banco de dados de produção...");
  
  // 1. Dropar tabelas existentes
  const tables = [
    'session',
    'transactions',
    'withdrawals',
    'payment_transactions',
    'payment_gateways',
    'bets',
    'draws',
    'game_modes',
    'animals',
    'system_settings',
    'users'
  ];
  
  for (const table of tables) {
    await dropTable(table);
  }
  
  console.log("✅ Todas as tabelas foram removidas. Iniciando recriação...");
  
  // 2. Criar tabelas
  try {
    // Tabela de usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        name TEXT,
        balance REAL NOT NULL DEFAULT 0,
        cpf TEXT UNIQUE,
        pix_key TEXT,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Tabela users criada com sucesso");
    
    // Tabela de animais
    await pool.query(`
      CREATE TABLE IF NOT EXISTS animals (
        id SERIAL PRIMARY KEY,
        group INTEGER NOT NULL,
        name TEXT NOT NULL,
        numbers TEXT NOT NULL
      )
    `);
    console.log("✅ Tabela animals criada com sucesso");
    
    // Tabela de modos de jogo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_modes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        quotation REAL NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER
      )
    `);
    console.log("✅ Tabela game_modes criada com sucesso");
    
    // Tabela de sorteios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS draws (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date DATE NOT NULL,
        time TEXT NOT NULL,
        result_animal_id INTEGER,
        result_animal_id2 INTEGER,
        result_animal_id3 INTEGER,
        result_animal_id4 INTEGER,
        result_animal_id5 INTEGER,
        result_number TEXT,
        result_number2 TEXT,
        result_number3 TEXT,
        result_number4 TEXT,
        result_number5 TEXT
      )
    `);
    console.log("✅ Tabela draws criada com sucesso");
    
    // Tabela de apostas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        draw_id INTEGER NOT NULL,
        game_mode_id INTEGER NOT NULL,
        animal_id INTEGER,
        animal_id2 INTEGER,
        animal_id3 INTEGER,
        animal_id4 INTEGER,
        animal_id5 INTEGER,
        number TEXT,
        amount REAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending',
        win_amount REAL,
        potential_win_amount REAL NOT NULL,
        premio_type TEXT
      )
    `);
    console.log("✅ Tabela bets criada com sucesso");
    
    // Tabela de configurações do sistema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        max_bet_amount REAL NOT NULL DEFAULT 10000,
        max_payout REAL NOT NULL DEFAULT 1000000,
        min_bet_amount REAL NOT NULL DEFAULT 5,
        default_bet_amount REAL NOT NULL DEFAULT 20,
        main_color TEXT NOT NULL DEFAULT '#4f46e5',
        secondary_color TEXT NOT NULL DEFAULT '#6366f1',
        accent_color TEXT NOT NULL DEFAULT '#f97316',
        allow_user_registration BOOLEAN NOT NULL DEFAULT true,
        allow_deposits BOOLEAN NOT NULL DEFAULT true,
        allow_withdrawals BOOLEAN NOT NULL DEFAULT true,
        maintenance_mode BOOLEAN NOT NULL DEFAULT false,
        auto_approve_withdrawals BOOLEAN NOT NULL DEFAULT true,
        auto_approve_withdrawal_limit REAL NOT NULL DEFAULT 30
      )
    `);
    console.log("✅ Tabela system_settings criada com sucesso");
    
    // Tabela de gateways de pagamento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_gateways (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config JSONB,
        active BOOLEAN NOT NULL DEFAULT true
      )
    `);
    console.log("✅ Tabela payment_gateways criada com sucesso");
    
    // Tabela de transações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        gateway_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        type TEXT NOT NULL DEFAULT 'deposit',
        external_id TEXT,
        external_url TEXT,
        response JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Tabela payment_transactions criada com sucesso");
    
    // Tabela de saques
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        pix_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        processed_by INTEGER,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✅ Tabela withdrawals criada com sucesso");
    
    // Tabela de transações gerais
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        reference_id INTEGER,
        reference_type TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Tabela transactions criada com sucesso");
    
    // Tabela de sessões
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);
    console.log("✅ Tabela session criada com sucesso");
    
  } catch (error) {
    console.error("❌ Erro ao criar tabelas:", error.message);
    process.exit(1);
  }
  
  // 3. Inserir dados iniciais
  
  // 3.1 Inserir configurações do sistema
  try {
    await pool.query(`
      INSERT INTO system_settings (
        id, max_bet_amount, max_payout, min_bet_amount, default_bet_amount,
        main_color, secondary_color, accent_color,
        allow_user_registration, allow_deposits, allow_withdrawals,
        maintenance_mode, auto_approve_withdrawals, auto_approve_withdrawal_limit
      ) VALUES (
        1, 10000, 1000000, 5, 20, 
        '#4f46e5', '#6366f1', '#f97316',
        true, true, true, 
        false, true, 30
      )
    `);
    console.log("✅ Configurações do sistema inseridas com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inserir configurações:", error.message);
  }
  
  // 3.2 Inserir usuário admin
  try {
    const hashedPassword = await hashPassword("admin");
    await pool.query(`
      INSERT INTO users (username, password, email, name, balance, is_admin, created_at)
      VALUES ('admin', $1, 'admin@bichomania.com', 'Administrator', 0, true, NOW())
    `, [hashedPassword]);
    console.log("✅ Usuário admin inserido com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inserir usuário admin:", error.message);
  }
  
  // 3.3 Inserir animais
  try {
    const animals = [
      { group: 1, name: 'Avestruz', numbers: "01,02,03,04" },
      { group: 2, name: 'Águia', numbers: "05,06,07,08" },
      { group: 3, name: 'Burro', numbers: "09,10,11,12" },
      { group: 4, name: 'Borboleta', numbers: "13,14,15,16" },
      { group: 5, name: 'Cachorro', numbers: "17,18,19,20" },
      { group: 6, name: 'Cabra', numbers: "21,22,23,24" },
      { group: 7, name: 'Carneiro', numbers: "25,26,27,28" },
      { group: 8, name: 'Camelo', numbers: "29,30,31,32" },
      { group: 9, name: 'Cobra', numbers: "33,34,35,36" },
      { group: 10, name: 'Coelho', numbers: "37,38,39,40" },
      { group: 11, name: 'Cavalo', numbers: "41,42,43,44" },
      { group: 12, name: 'Elefante', numbers: "45,46,47,48" },
      { group: 13, name: 'Galo', numbers: "49,50,51,52" },
      { group: 14, name: 'Gato', numbers: "53,54,55,56" },
      { group: 15, name: 'Jacaré', numbers: "57,58,59,60" },
      { group: 16, name: 'Leão', numbers: "61,62,63,64" },
      { group: 17, name: 'Macaco', numbers: "65,66,67,68" },
      { group: 18, name: 'Porco', numbers: "69,70,71,72" },
      { group: 19, name: 'Pavão', numbers: "73,74,75,76" },
      { group: 20, name: 'Peru', numbers: "77,78,79,80" },
      { group: 21, name: 'Touro', numbers: "81,82,83,84" },
      { group: 22, name: 'Tigre', numbers: "85,86,87,88" },
      { group: 23, name: 'Urso', numbers: "89,90,91,92" },
      { group: 24, name: 'Veado', numbers: "93,94,95,96" },
      { group: 25, name: 'Vaca', numbers: "97,98,99,00" }
    ];
    
    for (const animal of animals) {
      await pool.query(`
        INSERT INTO animals (group, name, numbers)
        VALUES ($1, $2, $3)
      `, [animal.group, animal.name, animal.numbers]);
    }
    console.log("✅ Animais inseridos com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inserir animais:", error.message);
  }
  
  // 3.4 Inserir modos de jogo
  try {
    const gameModes = [
      {
        id: 1,
        name: "Grupo",
        description: "Jogue no grupo do animal",
        quotation: 18,
        active: true,
        sortOrder: 1
      },
      {
        id: 2,
        name: "Centena",
        description: "Jogue nos três últimos números (dezena + unidade)",
        quotation: 900,
        active: true,
        sortOrder: 2
      },
      {
        id: 3,
        name: "Dezena",
        description: "Jogue nos dois últimos números (dezena + unidade)",
        quotation: 90,
        active: true,
        sortOrder: 3
      },
      {
        id: 4,
        name: "Milhar",
        description: "Jogue nos quatro números (milhar completa)",
        quotation: 9000,
        active: true,
        sortOrder: 4
      }
    ];
    
    for (const mode of gameModes) {
      await pool.query(`
        INSERT INTO game_modes (id, name, description, quotation, active, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [mode.id, mode.name, mode.description, mode.quotation, mode.active, mode.sortOrder]);
    }
    console.log("✅ Modos de jogo inseridos com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inserir modos de jogo:", error.message);
  }
  
  // 3.5 Inserir sorteios
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const drawTimes = ["10:00", "13:00", "16:00", "19:00", "21:00"];
    
    for (const time of drawTimes) {
      // Sorteio para hoje
      await pool.query(`
        INSERT INTO draws (name, date, time)
        VALUES ($1, $2, $3)
      `, [`Sorteio ${time}`, formatDate(today), time]);
      
      // Sorteio para amanhã
      await pool.query(`
        INSERT INTO draws (name, date, time)
        VALUES ($1, $2, $3)
      `, [`Sorteio ${time}`, formatDate(tomorrow), time]);
    }
    console.log("✅ Sorteios inseridos com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inserir sorteios:", error.message);
  }
  
  console.log("✅ Reset do banco de dados concluído com sucesso!");
}

// Executar a função principal
resetDatabase()
  .then(() => {
    console.log("Script finalizado com sucesso!");
    pool.end();
    process.exit(0);
  })
  .catch(error => {
    console.error("Erro fatal:", error);
    pool.end();
    process.exit(1);
  });