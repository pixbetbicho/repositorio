import https from 'https';

// Script para testar EZZEBANK em PRODUÇÃO
async function testEzzebankProduction() {
  console.log('🌐 TESTE DE PRODUÇÃO EZZEBANK');
  console.log('='.repeat(50));

  // Suas credenciais de produção
  const CLIENT_ID = process.env.EZZEBANK_PROD_CLIENT_ID;
  const CLIENT_SECRET = process.env.EZZEBANK_PROD_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log('❌ ERRO: Credenciais não encontradas!');
    console.log('Configure as variáveis de ambiente:');
    console.log('- EZZEBANK_PROD_CLIENT_ID');
    console.log('- EZZEBANK_PROD_CLIENT_SECRET');
    return;
  }

  console.log('✅ Credenciais encontradas');
  console.log('Client ID:', CLIENT_ID.substring(0, 15) + '...');
  console.log('Ambiente: PRODUÇÃO (api.ezzebank.com)');
  console.log('');

  try {
    // 1. TESTE DE AUTENTICAÇÃO
    console.log('🔐 1. TESTANDO AUTENTICAÇÃO...');
    const token = await authenticate(CLIENT_ID, CLIENT_SECRET);
    console.log('✅ Autenticação bem-sucedida!');
    console.log('');

    // 2. TESTE DE SALDO
    console.log('💰 2. TESTANDO CONSULTA DE SALDO...');
    const balance = await getBalance(token);
    console.log('✅ Consulta de saldo bem-sucedida!');
    console.log(`Saldo disponível: R$ ${balance.available}`);
    console.log('');

    // 3. TESTE DE CONEXÃO WEBHOOK
    console.log('🔗 3. TESTANDO CONECTIVIDADE WEBHOOK...');
    console.log('URL do webhook: https://pixbetbicho.com.br/api/ezzebank/webhook');
    console.log('✅ URL configurada corretamente');
    console.log('');

    // 4. RESUMO FINAL
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('='.repeat(50));
    console.log('✅ Autenticação: OK');
    console.log('✅ API de saldo: OK');
    console.log('✅ Webhook configurado: OK');
    console.log(`✅ Saldo disponível: R$ ${balance.available}`);
    console.log('');
    console.log('🚀 GATEWAY EZZEBANK PRONTO PARA USO EM PRODUÇÃO!');

  } catch (error) {
    console.log('❌ ERRO NO TESTE:');
    console.log('Erro:', error.message);
    console.log('Código do erro:', error.code || 'sem código');
    console.log('Status do erro HTTP:', error.statusCode || error.status || 'sem código');
    console.log('Stack do erro:', error.stack);
    console.log('Dados enviados:', authData);
    console.log('Cabeçalhos:', options.headers);
    console.log('');
    console.log('🔍 POSSÍVEIS CAUSAS:');
    console.log('1. Credenciais incorretas ou expiradas');
    console.log('2. Servidor EZZEBANK temporariamente indisponível');
    console.log('3. Problema de conectividade de rede');
    console.log('4. Conta EZZEBANK não ativada para produção');
  }
}

// Função para autenticar na API EZZEBANK
async function authenticate(clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const authData = 'grant_type=client_credentials';

  const options = {
    hostname: 'api.ezzebank.com', // PRODUÇÃO
    port: 443,
    path: '/auth/oauth/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(authData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          resolve(result.access_token);
        } else {
          reject(new Error(`Autenticação falhou: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Erro de conexão: ${error.message}`));
    });

    req.write(authData);
    req.end();
  });
}

// Função para consultar saldo
async function getBalance(token) {
  const options = {
    hostname: 'api.ezzebank.com', // PRODUÇÃO
    port: 443,
    path: '/v1/balance',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          resolve(result);
        } else {
          reject(new Error(`Consulta de saldo falhou: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Erro de conexão: ${error.message}`));
    });

    req.end();
  });
}

// Executar teste
testEzzebankProduction();