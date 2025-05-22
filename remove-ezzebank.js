import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configurando o Neon
neonConfig.webSocketConstructor = ws;

async function removeEzzebankGateways() {
  console.log('Removing Ezzebank gateways from database...');
  
  // Configurar conexão com o banco
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Primeiro, verificamos se existem gateways do tipo ezzebank
    const checkResult = await pool.query(
      "SELECT * FROM payment_gateways WHERE type = 'ezzebank'"
    );
    
    console.log(`Found ${checkResult.rowCount} Ezzebank gateways in database`);
    
    if (checkResult.rowCount > 0) {
      // Obter o(s) ID(s) dos gateways Ezzebank
      const gatewayIds = checkResult.rows.map(row => row.id);
      console.log('Gateway IDs to remove:', gatewayIds);
      
      // Primeiro, verificamos se há transações associadas a esses gateways
      let transactions = [];
      for (const gatewayId of gatewayIds) {
        const txResult = await pool.query(
          "SELECT * FROM payment_transactions WHERE gateway_id = $1",
          [gatewayId]
        );
        console.log(`Found ${txResult.rowCount} transactions for gateway ID ${gatewayId}`);
        transactions = [...transactions, ...txResult.rows];
      }
      
      // Se houver transações, vamos atualizá-las para usar outro gateway
      if (transactions.length > 0) {
        // Primeiro, verificamos se existe um gateway alternativo
        const alternativeGatewayResult = await pool.query(
          "SELECT id FROM payment_gateways WHERE type != 'ezzebank' LIMIT 1"
        );
        
        if (alternativeGatewayResult.rowCount > 0) {
          const alternativeGatewayId = alternativeGatewayResult.rows[0].id;
          console.log(`Using alternative gateway ID ${alternativeGatewayId} for transactions`);
          
          // Atualizar as transações para usar o gateway alternativo
          for (const gatewayId of gatewayIds) {
            const updateResult = await pool.query(
              "UPDATE payment_transactions SET gateway_id = $1 WHERE gateway_id = $2",
              [alternativeGatewayId, gatewayId]
            );
            
            console.log(`Updated ${updateResult.rowCount} transactions from gateway ID ${gatewayId} to ${alternativeGatewayId}`);
          }
        } else {
          console.log('No alternative gateway found. Transactions will be orphaned.');
          // Atenção: em um ambiente de produção, você provavelmente não gostaria de fazer isso
          // Neste caso estamos mudando para NULL apenas para permitir a exclusão do gateway
          for (const gatewayId of gatewayIds) {
            const updateResult = await pool.query(
              "UPDATE payment_transactions SET gateway_id = NULL WHERE gateway_id = $1",
              [gatewayId]
            );
            
            console.log(`Set gateway_id to NULL for ${updateResult.rowCount} transactions from gateway ID ${gatewayId}`);
          }
        }
      }
      
      // Agora podemos remover os gateways com segurança
      for (const gatewayId of gatewayIds) {
        const deleteResult = await pool.query(
          "DELETE FROM payment_gateways WHERE id = $1",
          [gatewayId]
        );
        
        console.log(`Deleted gateway ID ${gatewayId}: ${deleteResult.rowCount} rows affected`);
      }
    } else {
      console.log('No Ezzebank gateways found in database');
    }
  } catch (error) {
    console.error('Error removing Ezzebank gateways:', error);
  } finally {
    // Fechar conexão com o banco
    await pool.end();
  }
}

// Executar a função principal
removeEzzebankGateways();
