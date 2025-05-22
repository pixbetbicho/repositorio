// Script para testar as APIs diretamente
import fetch from 'node-fetch';

async function testApi() {
  console.log('TESTE DE API');
  console.log('===========');
  
  // Lista de endpoints para testar
  const endpoints = [
    '/api/animals',
    '/api/settings',
    '/api/draws/upcoming',
    '/api/user',
    '/api/admin/settings',
    '/api/health'
  ];
  
  // Testar cada endpoint
  for (const endpoint of endpoints) {
    console.log(`\nTestando endpoint: ${endpoint}`);
    
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const contentType = response.headers.get('content-type');
      console.log(`Status: ${response.status}`);
      console.log(`Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Resposta JSON recebida:');
        console.log(typeof data === 'object' ? `(${Array.isArray(data) ? data.length : Object.keys(data).length} itens)` : data);
      } else {
        const text = await response.text();
        console.log(`Resposta recebida (primeiros 100 caracteres): ${text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error(`Erro ao testar ${endpoint}:`, error.message);
    }
  }
}

testApi().catch(console.error);