import mongoose from 'mongoose';
import Achievement from '../models/Achievement.js';
import dotenv from 'dotenv';

dotenv.config();

const achievements = [
    {
        title: 'Primeiro Passo',
        description: 'Complete seu primeiro curso',
        icon: 'fas fa-graduation-cap',
        category: 'cursos',
        condition: {
            type: 'coursesCompleted',
            value: 1
        },
        xpReward: 100,
        rarity: 'comum'
    },
    {
        title: 'Estudante Dedicado',
        description: 'Complete 5 cursos',
        icon: 'fas fa-book-reader',
        category: 'cursos',
        condition: {
            type: 'coursesCompleted',
            value: 5
        },
        xpReward: 500,
        rarity: 'raro'
    },
    {
        title: 'Mestre do Conhecimento',
        description: 'Complete 10 cursos',
        icon: 'fas fa-crown',
        category: 'cursos',
        condition: {
            type: 'coursesCompleted',
            value: 10
        },
        xpReward: 1000,
        rarity: 'épico'
    }
    // Adicione mais conquistas aqui
];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        await Achievement.deleteMany({});
        await Achievement.insertMany(achievements);
        console.log('Conquistas criadas com sucesso!');
        process.exit();
    })
    .catch(error => {
        console.error('Erro ao criar conquistas:', error);
        process.exit(1);
    }); 