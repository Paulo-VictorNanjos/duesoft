import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

async function testConnection() {
  try {
    console.log('Tentando conectar ao MongoDB Atlas...');
    console.log('URI:', process.env.MONGODB_URI.replace(/mongodb\+srv:\/\/[^:]+:([^@]+)@/, 'mongodb+srv://****:****@'));
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conexão com MongoDB Atlas bem-sucedida!');
    
    // Listar as coleções para verificar se o banco de dados existe
    const collections = await mongoose.connection.db.collections();
    console.log('Coleções disponíveis:');
    for (let collection of collections) {
      console.log(`- ${collection.collectionName}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB Atlas:', error);
  } finally {
    // Fechar a conexão
    await mongoose.connection.close();
    console.log('Conexão fechada');
  }
}

testConnection(); 