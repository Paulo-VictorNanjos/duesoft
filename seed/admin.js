import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const userId = '674d0d69d3932c5f1c11d9cb'; // Substitua pelo ID do usuário que você quer tornar master

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const user = await User.findById(userId);
        if (!user) {
            console.error('Usuário não encontrado');
            return process.exit();
        }

        user.isMaster = true;
        await user.save();
        console.log('Usuário foi definido como master com sucesso!');
        process.exit();
    })
    .catch(error => {
        console.error('Erro ao definir usuário como master:', error);
        process.exit(1);
    });