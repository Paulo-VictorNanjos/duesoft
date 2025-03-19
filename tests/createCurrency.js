import mongoose from 'mongoose';
import VirtualCurrency from '../models/VirtualCurrency.js';

// Conectar ao MongoDB
await mongoose.connect('mongodb://localhost:27017/student-portal');

// Configuração da moeda virtual
const currencyConfig = {
    company: '6754e293d7a094a9c029f527',
    name: 'Moedas',
    symbol: '💰',
    settings: {
        earnRules: {
            courseCompletion: 10,
            firstCourseCompletion: 30,
            examCompletion: 5,
            perfectExamScore: 10,
            dailyLogin: 1,
            mentorSession: 20,
            mentorRating: 10,
            referralBonus: 50,
            courseStreak: 5
        }
    }
};

// Criar ou atualizar a moeda virtual
const currency = await VirtualCurrency.findOneAndUpdate(
    { company: currencyConfig.company },
    currencyConfig,
    { upsert: true, new: true }
);

console.log('Moeda virtual configurada:', currency);

// Desconectar do MongoDB
await mongoose.disconnect(); 