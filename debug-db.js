// Script para verificar banco de dados
import pg from 'pg';
const { Pool } = pg;

// Criar pool de conexão usando os mesmos parâmetros do servidor
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  console.log('VERIFICAÇÃO DE BANCO DE DADOS');
  console.log('============================');
  
  try {
    // 1. Verificar conexão básica
    console.log('1. Teste de conexão básica...');
    const testResult = await pool.query('SELECT NOW() as time');
    console.log(`   ✅ Conexão OK: ${testResult.rows[0].time}`);
    
    // 2. Listar tabelas
    console.log('\n2. Listando tabelas no banco de dados...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const tablesResult = await pool.query(tablesQuery);
    console.log(`   Encontradas ${tablesResult.rows.length} tabelas:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // 3. Verificar animais
    console.log('\n3. Verificando tabela animals...');
    const animalsResult = await pool.query('SELECT COUNT(*) FROM animals');
    console.log(`   Total de animais: ${animalsResult.rows[0].count}`);
    
    if (parseInt(animalsResult.rows[0].count) > 0) {
      const animalSample = await pool.query('SELECT * FROM animals LIMIT 3');
      console.log('   Exemplos de animais:');
      animalSample.rows.forEach(animal => {
        console.log(`   - ID: ${animal.id}, Nome: ${animal.name}, Grupo: ${animal.group}`);
      });
    }
    
    // 4. Verificar usuários
    console.log('\n4. Verificando tabela users...');
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`   Total de usuários: ${usersResult.rows[0].count}`);
    
    if (parseInt(usersResult.rows[0].count) > 0) {
      const userSample = await pool.query('SELECT id, username, email, role FROM users LIMIT 3');
      console.log('   Exemplos de usuários:');
      userSample.rows.forEach(user => {
        console.log(`   - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
      });
    }
    
    // 5. Verificar configurações
    console.log('\n5. Verificando tabela system_settings...');
    try {
      const settingsResult = await pool.query('SELECT * FROM system_settings LIMIT 1');
      if (settingsResult.rows.length > 0) {
        console.log('   Configurações encontradas:');
        console.log('   - Site Name:', settingsResult.rows[0].site_name);
        console.log('   - Main Color:', settingsResult.rows[0].main_color);
      } else {
        console.log('   ⚠️ Tabela system_settings está vazia');
      }
    } catch (err) {
      console.log('   ❌ Erro ao verificar system_settings:', err.message);
    }
    
    // 6. Verificar admin
    console.log('\n6. Verificando usuário admin...');
    try {
      const adminResult = await pool.query("SELECT * FROM users WHERE username = 'admin' LIMIT 1");
      if (adminResult.rows.length > 0) {
        console.log('   ✅ Usuário admin encontrado');
        console.log('   - ID:', adminResult.rows[0].id);
        console.log('   - Role:', adminResult.rows[0].role);
      } else {
        console.log('   ⚠️ Usuário admin não encontrado');
      }
    } catch (err) {
      console.log('   ❌ Erro ao verificar usuário admin:', err.message);
    }
    
    console.log('\nVERIFICAÇÃO COMPLETA');
  } catch (err) {
    console.error('❌ ERRO FATAL:', err);
  } finally {
    await pool.end();
  }
}

// Executar verificação
checkTables().catch(console.error);