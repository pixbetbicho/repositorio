// Script para corrigir a coluna use_bonus_balance na tabela bets
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixBonusBalanceColumn() {
  try {
    console.log('Verificando a coluna use_bonus_balance na tabela bets...');

    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bets' AND column_name = 'use_bonus_balance'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Coluna use_bonus_balance não existe na tabela bets, adicionando...');
      
      // Adicionar a coluna à tabela
      await pool.query(`
        ALTER TABLE bets 
        ADD COLUMN use_bonus_balance BOOLEAN DEFAULT false
      `);
      
      console.log('Coluna use_bonus_balance adicionada com sucesso!');
    } else {
      console.log('Coluna use_bonus_balance já existe na tabela bets.');
      
      // Verificar o tipo da coluna
      const checkType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bets' AND column_name = 'use_bonus_balance'
      `);
      
      if (checkType.rows.length > 0) {
        const dataType = checkType.rows[0].data_type;
        console.log(`Tipo atual da coluna: ${dataType}`);
        
        // Se não for boolean, converter para boolean
        if (dataType !== 'boolean') {
          console.log(`Convertendo coluna de ${dataType} para boolean...`);
          
          await pool.query(`
            ALTER TABLE bets 
            ALTER COLUMN use_bonus_balance TYPE boolean USING 
            CASE 
              WHEN use_bonus_balance = 'true' THEN true 
              WHEN use_bonus_balance = 't' THEN true
              WHEN use_bonus_balance = '1' THEN true
              ELSE false 
            END
          `);
          
          console.log('Coluna convertida para boolean com sucesso!');
        }
      }
    }
    
    // Atualizar o valor padrão da coluna para false
    await pool.query(`
      ALTER TABLE bets 
      ALTER COLUMN use_bonus_balance SET DEFAULT false
    `);
    console.log('Valor padrão da coluna definido como false.');
    
    // Mostrar todas as colunas da tabela bets para verificação
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'bets'
      ORDER BY column_name
    `);
    
    console.log('Colunas da tabela bets:');
    for (const row of columns.rows) {
      console.log(`${row.column_name} (${row.data_type})`);
    }
    
    console.log('Script executado com sucesso!');
  } catch (error) {
    console.error('Erro ao executar o script:', error);
  } finally {
    // Encerrar a conexão com o banco
    pool.end();
  }
}

// Executar a função
fixBonusBalanceColumn();