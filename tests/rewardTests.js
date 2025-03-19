import RewardService from '../services/RewardService.js';
import VirtualCurrency from '../models/VirtualCurrency.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Conectar ao MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Conectado ao MongoDB');
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
        process.exit(1);
    }
}

async function runRewardTests() {
    try {
        console.log('\n=== INICIANDO TESTES DE RECOMPENSAS ===\n');

        // Mock do usuário e empresa
        const mockUser = { 
            _id: new mongoose.Types.ObjectId(),
            level: 5 
        };
        const mockCompany = { 
            _id: new mongoose.Types.ObjectId()
        };

        // Criar configurações de moeda virtual para teste
        const currency = new VirtualCurrency({
            company: mockCompany._id,
            name: 'TestCoin',
            symbol: '🪙',
            settings: {
                earnRules: {
                    courseCompletion: 70,
                    examCompletion: 30,
                    dailyLogin: 10,
                    mentorSession: 50,
                    perfectExamScore: 20,
                    courseStreak: 10,
                    referralBonus: 30,
                    firstCourseCompletion: 60,
                    mentorRating: 20
                },
                bonusRules: {
                    firstActivityOfDay: true,
                    firstActivityBonus: 20,
                    weekendActivity: true,
                    weekendBonus: 25,
                    levelBonus: {
                        enabled: true,
                        bonusPerLevel: 10,
                        levelsRequired: 10
                    },
                    streakBonus: {
                        enabled: true,
                        bonusPerStreak: 20,
                        streakRequired: 3,
                        maxBonus: 100
                    }
                }
            }
        });

        await currency.save();
        console.log('✓ Configurações de teste criadas');

        // Executar testes de recompensa
        const results = await RewardService.testRewards(mockUser, mockCompany);

        // Exibir resultados detalhados
        console.log('\n=== RESULTADOS DOS TESTES ===');
        console.log('\nTestes bem-sucedidos:', results.success.length);
        results.success.forEach(test => {
            console.log(`✓ ${test}`);
        });

        console.log('\nTestes falhos:', results.failed.length);
        results.failed.forEach(test => {
            console.log(`❌ ${test}`);
        });

        // Limpar dados de teste
        await VirtualCurrency.deleteOne({ company: mockCompany._id });
        console.log('\n✓ Dados de teste limpos');

        return results;

    } catch (error) {
        console.error('\n❌ Erro ao executar testes:', error);
        throw error;
    } finally {
        // Desconectar do MongoDB
        await mongoose.disconnect();
        console.log('✓ Desconectado do MongoDB');
    }
}

// Executar testes
console.log('Iniciando testes...\n');
connectDB()
    .then(runRewardTests)
    .then(() => {
        console.log('\n✅ Testes concluídos!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Falha nos testes:', error);
        process.exit(1);
    }); 