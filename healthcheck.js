// Arquivo healthcheck.js - Usado para verificar se a aplicação está funcionando corretamente
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';

// Carregar variáveis de ambiente
dotenv.config();

// Função para verificar conexão com MongoDB
async function checkMongoDBConnection() {
  try {
    console.log('Testando conexão com MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conexão com MongoDB bem-sucedida');
    
    const collections = await mongoose.connection.db.collections();
    console.log(`Coleções disponíveis: ${collections.length}`);
    
    await mongoose.connection.close();
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão com MongoDB:', error.message);
    return false;
  }
}

// Função para verificar se o servidor web está rodando
function checkWebServer() {
  return new Promise((resolve) => {
    const port = process.env.PORT || 3000;
    const hostname = 'localhost';
    
    console.log(`Verificando servidor web em http://${hostname}:${port}...`);
    
    const req = http.request({
      hostname,
      port,
      path: '/',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`✅ Servidor web respondendo (status ${res.statusCode})`);
        resolve(true);
      } else {
        console.error(`❌ Servidor web retornou status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (e) => {
      console.error(`❌ Erro ao conectar ao servidor web: ${e.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('❌ Tempo esgotado ao tentar conectar ao servidor web');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Função principal de verificação de saúde
async function runHealthCheck() {
  console.log('=== VERIFICAÇÃO DE SAÚDE DA APLICAÇÃO ===');
  console.log('Ambiente:', process.env.NODE_ENV);
  console.log('Porta:', process.env.PORT);
  
  const mongoDBResult = await checkMongoDBConnection();
  const webServerResult = await checkWebServer();
  
  console.log('=== RESULTADOS ===');
  console.log('MongoDB: ' + (mongoDBResult ? 'ONLINE ✅' : 'OFFLINE ❌'));
  console.log('Servidor Web: ' + (webServerResult ? 'ONLINE ✅' : 'OFFLINE ❌'));
  
  if (mongoDBResult && webServerResult) {
    console.log('✅ SISTEMA ESTÁ SAUDÁVEL E FUNCIONANDO CORRETAMENTE');
    process.exit(0);
  } else {
    console.log('❌ SISTEMA APRESENTA PROBLEMAS QUE PRECISAM SER CORRIGIDOS');
    process.exit(1);
  }
}

// Executar verificação
runHealthCheck(); 