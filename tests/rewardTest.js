import RewardService from '../services/RewardService.js';
import VirtualCurrency from '../models/VirtualCurrency.js';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

// Dados de teste
const user = {
    _id: '675906b353664314ac950691',
    level: 1,
    completedCourses: []
};

const company = {
    _id: '6754e293d7a094a9c029f527'
};

const testData = {
  userId: new ObjectId(),
  companyId: new ObjectId(),
  courseId: new ObjectId(),
  examId: new ObjectId(),
  sessionId: new ObjectId(),
  referredUserId: new ObjectId()
};

// Conectar ao MongoDB
await mongoose.connect('mongodb://localhost:27017/student-portal');

console.log('Iniciando testes do sistema de recompensas...\n');

// 1. Testar configurações da moeda virtual
console.log('1. Verificando configurações da moeda virtual...');
const currency = await VirtualCurrency.findOne({ company: company._id });
console.log('Moeda encontrada:', !!currency);
if (currency) {
    console.log('Configurações:', JSON.stringify(currency.settings, null, 2));
}

// 2. Testar recompensa de curso
console.log('\n2. Testando recompensa de curso...');
const courseResult = await RewardService.testCourseReward(
    user,
    company,
    'test_course_id',
    100
);
console.log('Resultado do teste de curso:', courseResult);

// 3. Testar primeiro curso
console.log('\n3. Testando recompensa de primeiro curso...');
const firstCourseResult = await RewardService.testSpecificReward(
    user,
    company,
    'FIRST_COURSE',
    {
        courseId: 'test_first_course_id',
        progress: 100,
        relatedModel: 'Course'
    }
);
console.log('Resultado do primeiro curso:', firstCourseResult);

// 4. Testar todos os tipos de recompensa
console.log('\n4. Testando todos os tipos de recompensa...');
const allResults = await RewardService.testRewards(user, company);
console.log('Resultados completos:', allResults);

// Desconectar do MongoDB
await mongoose.disconnect(); 