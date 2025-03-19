import mongoose from 'mongoose';
import Company from '../models/Company.js';

mongoose.connect('mongodb://127.0.0.1:27017/student-portal2', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  try {
    // Primeiro, vamos verificar se já existe uma empresa demo
    const existingDemo = await Company.findOne({ isDemo: true });
    if (existingDemo) {
      // Atualizar a empresa demo existente para garantir que o módulo AI está habilitado
      await Company.findByIdAndUpdate(existingDemo._id, {
        $set: {
          'settings.features.ai': true,
          'plan': 'enterprise'  // Garantir que está no plano enterprise
        }
      });
      console.log('Empresa demo atualizada com módulo AI habilitado');
      mongoose.disconnect();
      return;
    }

    const demoCompany = await Company.create({
      name: 'Empresa Demonstração',
      domain: 'demo',
      isDemo: true,
      active: true,
      plan: 'enterprise',
      email: 'demo@empresa.com',
      cpfCnpj: '00.000.000/0000-00',
      address: 'Endereço da Empresa Demo',
      phone: '(00) 0000-0000',
      responsible: 'Administrador Demo',
      theme: {
        primaryColor: '#4f46e5',
        secondaryColor: '#4338ca'
      },
      settings: {
        allowUserRegistration: true,
        requireLicenseApproval: false,
        features: {
          dashboard: true,
          courses: true,
          exams: true,
          chat: true,
          profile: true,
          ranking: true,
          achievements: true,
          ai: true
        }
      }
    });
    console.log('Empresa demo criada com sucesso:', demoCompany);
  } catch (error) {
    console.error('Erro ao criar empresa demo:', error);
  } finally {
    mongoose.disconnect();
  }
}); 