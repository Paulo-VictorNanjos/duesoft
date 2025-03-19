import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config({ path: '.env.production' });

const initDatabase = async () => {
  try {
    console.log('🔄 Conectando ao MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB Atlas');

    // Definir esquemas
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: { type: String, default: 'user' },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    });

    const companySchema = new mongoose.Schema({
      name: String,
      description: String,
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    });

    // Criar modelos
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

    // Verificar se já existem dados
    const userCount = await User.countDocuments();
    const companyCount = await Company.countDocuments();

    if (userCount === 0) {
      console.log('📝 Criando usuário administrador padrão...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Administrador',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('✅ Usuário administrador criado com sucesso');
    } else {
      console.log(`ℹ️ Já existem ${userCount} usuários no banco de dados. Pulando criação.`);
    }

    if (companyCount === 0) {
      console.log('📝 Criando empresa padrão...');
      await Company.create({
        name: 'DueSoft',
        description: 'Empresa principal do sistema',
      });
      console.log('✅ Empresa padrão criada com sucesso');
    } else {
      console.log(`ℹ️ Já existem ${companyCount} empresas no banco de dados. Pulando criação.`);
    }

    console.log('🎉 Inicialização do banco de dados concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na inicialização do banco de dados:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexão com o MongoDB fechada');
  }
};

initDatabase(); 