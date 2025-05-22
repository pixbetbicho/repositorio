
import { pool } from './server/db';

async function recreateDatabase() {
  console.log('Recriando o banco de dados...');
  
  try {
    // Dropa todas as tabelas
    await pool.query(`
      DROP TABLE IF EXISTS bets CASCADE;
      DROP TABLE IF EXISTS game_modes CASCADE;
      DROP TABLE IF EXISTS draws CASCADE;
      DROP TABLE IF EXISTS animals CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS system_settings CASCADE;
      DROP TABLE IF EXISTS session CASCADE;
    `);
    
    console.log('Tabelas removidas com sucesso');
    
    // Cria tabela usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        name TEXT,
        balance INTEGER NOT NULL DEFAULT 0,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // Cria tabela animais
    await pool.query(`
      CREATE TABLE IF NOT EXISTS animals (
        id SERIAL PRIMARY KEY,
        "group" INTEGER NOT NULL,
        name TEXT NOT NULL,
        numbers TEXT[] NOT NULL,
        UNIQUE("group")
      );
    `);
    
    // Cria tabela sorteios
    await pool.query(`
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
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // Cria tabela game_modes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_modes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        odds INTEGER NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // Cria tabela apostas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        animal_id INTEGER,
        animal_id_2 INTEGER,
        animal_id_3 INTEGER,
        animal_id_4 INTEGER,
        animal_id_5 INTEGER,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        draw_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        win_amount INTEGER,
        game_mode_id INTEGER,
        potential_win_amount INTEGER,
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
    `);
    
    // Cria tabela configurações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        max_bet_amount INTEGER NOT NULL,
        max_payout INTEGER NOT NULL,
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
    
    console.log('Tabelas criadas com sucesso');
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao recriar o banco de dados:', error);
    process.exit(1);
  }
}

recreateDatabase();

