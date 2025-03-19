import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Course from '../models/Course.js';
import History from '../models/History.js';
import { Exam, ExamAttempt } from '../models/Exam.js';

dotenv.config();
const execAsync = promisify(exec);

async function restoreBackup(date) {
    if (!date) {
        console.error('Data do backup não especificada');
        process.exit(1);
    }

    try {
        // Extrair backup
        await execAsync(`cd backups && tar -xzf ${date}.tar.gz`);
        
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Ler dados do backup
        const data = JSON.parse(
            await fs.readFile(path.join('backups', date, 'data.json'), 'utf8')
        );
        
        // Restaurar dados
        await User.deleteMany({});
        await Course.deleteMany({});
        await History.deleteMany({});
        await Exam.deleteMany({});
        await ExamAttempt.deleteMany({});
        
        await User.insertMany(data.users);
        await Course.insertMany(data.courses);
        await History.insertMany(data.histories);
        await Exam.insertMany(data.exams);
        await ExamAttempt.insertMany(data.examAttempts);
        
        // Restaurar arquivos
        const dirs = ['uploads', 'videos', 'certificates'];
        for (const dir of dirs) {
            const sourceDir = path.join('backups', date, dir);
            const targetDir = path.join('public', dir);
            
            if (await fs.access(sourceDir).then(() => true).catch(() => false)) {
                await execAsync(`xcopy "${sourceDir}" "${targetDir}" /E /I /H /Y`);
            }
        }
        
        console.log('Backup restaurado com sucesso!');
    } catch (error) {
        console.error('Erro durante restauração:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Executar restauração se chamado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const date = process.argv[2];
    restoreBackup(date);
}

export { restoreBackup }; 