// Script para reinicializar o banco de dados em produção
import { db, pool } from './server/db.js';
import { users, animals, draws, gameModes, systemSettings } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from './server/auth.js';

async function dropAndRecreateTable(tableName) {
  console.log(`Tentando dropar tabela: ${tableName}`);
  try {
    await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    console.log(`✅ Tabela ${tableName} dropada com sucesso`);
  } catch (error) {
    console.error(`❌ Erro ao dropar tabela ${tableName}:`, error.message);
  }
}

async function resetDatabase() {
  console.log("🔄 Iniciando reset do banco de dados de produção...");
  
  // Lista de todas as tabelas em ordem de dependência (as dependentes primeiro)
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
  
  // 1. Dropar todas as tabelas
  for (const table of tables) {
    await dropAndRecreateTable(table);
  }
  
  console.log("✅ Todas as tabelas foram removidas. Iniciando recriação do banco de dados...");
  
  // 2. Inicialização dos animais
  console.log("🔄 Inicializando os 25 animais...");
  try {
    // Lista dos 25 animais do jogo do bicho com seus grupos e números
    const animalData = [
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
    
    // Inserir todos os animais no banco de dados
    for (const animal of animalData) {
      await db.insert(animals).values(animal);
    }
    console.log("✅ Animais inicializados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar animais:", error);
  }
  
  // 3. Inicializar modalidades de jogo
  console.log("🔄 Inicializando modalidades de jogo...");
  try {
    const gameModeData = [
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
    
    for (const mode of gameModeData) {
      await db.insert(gameModes).values(mode);
    }
    console.log("✅ Modalidades de jogo inicializadas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar modalidades de jogo:", error);
  }
  
  // 4. Inicializar usuário admin
  console.log("🔄 Inicializando usuário admin...");
  try {
    const hashedPassword = await hashPassword("admin");
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      email: "admin@bichomania.com",
      name: "Administrator",
      balance: 0,
      isAdmin: true,
      createdAt: new Date()
    });
    console.log("✅ Usuário admin inicializado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar usuário admin:", error);
  }
  
  // 5. Inicializar configurações do sistema
  console.log("🔄 Inicializando configurações do sistema...");
  try {
    await db.insert(systemSettings).values({
      id: 1,
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
    console.log("✅ Configurações do sistema inicializadas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar configurações do sistema:", error);
  }
  
  // 6. Inicializar sorteios
  console.log("🔄 Inicializando sorteios...");
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const drawTimes = ["10:00", "13:00", "16:00", "19:00", "21:00"];
    
    for (const time of drawTimes) {
      // Sorteio para hoje
      await db.insert(draws).values({
        name: `Sorteio ${time}`,
        date: today,
        time: time,
      });
      
      // Sorteio para amanhã
      await db.insert(draws).values({
        name: `Sorteio ${time}`,
        date: tomorrow,
        time: time,
      });
    }
    console.log("✅ Sorteios inicializados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar sorteios:", error);
  }
  
  console.log("✅ Reset do banco de dados de produção concluído com sucesso!");
  
  // Fechar a conexão com o banco para evitar que o script fique parado
  await pool.end();
}

// Executar a função principal
resetDatabase()
  .then(() => {
    console.log("Script de reset finalizado com sucesso!");
    process.exit(0);
  })
  .catch(error => {
    console.error("Erro no script de reset:", error);
    process.exit(1);
  });