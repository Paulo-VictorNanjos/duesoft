import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Course from '../models/Course.js';
import History from '../models/History.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado ao MongoDB para backup');
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        process.exit(1);
    }
}

async function copyDirectory(src, dest) {
    try {
        // Verifica se o diretório fonte existe
        try {
            await fs.access(src);
        } catch (error) {
            console.log(`Diretório ${src} não existe - pulando...`);
            return;
        }

        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
        console.log(`Backup do diretório ${src} concluído`);
    } catch (error) {
        console.log(`Pulando diretório ${src} - ${error.message}`);
    }
}

async function createBackup() {
    const date = new Date().toISOString().split('T')[0];
    const backupDir = path.join(__dirname, '..', 'backups', date);
    
    try {
        await fs.mkdir(backupDir, { recursive: true });
        await connectDB();
        
        // Backup do MongoDB
        const data = {
            users: await User.find({}).lean(),
            courses: await Course.find({}).lean(),
            histories: await History.find({}).lean()
        };
        
        await fs.writeFile(
            path.join(backupDir, 'data.json'),
            JSON.stringify(data, null, 2)
        );
        
        // Diretórios para backup
        const dirsToBackup = [
            { src: 'routes', dest: 'code/routes' },
            { src: 'models', dest: 'code/models' },
            { src: 'views', dest: 'code/views' },
            { src: 'public/css', dest: 'code/public/css' },
            { src: 'public/js', dest: 'code/public/js' },
            { src: 'scripts', dest: 'code/scripts' },
            { src: 'middlewares', dest: 'code/middlewares' },
            { src: 'utils', dest: 'code/utils' },
            { src: 'config', dest: 'code/config' },
            { src: 'public/uploads', dest: 'uploads' },
            { src: 'public/videos', dest: 'videos' },
            { src: 'public/certificates', dest: 'certificates' }
        ];
        
        // Criar diretórios públicos se não existirem
        const publicDirs = ['uploads', 'videos', 'certificates', 'js'];
        for (const dir of publicDirs) {
            await fs.mkdir(path.join(__dirname, '..', 'public', dir), { recursive: true });
        }

        // Copiar diretórios
        for (const { src, dest } of dirsToBackup) {
            await copyDirectory(
                path.join(__dirname, '..', src),
                path.join(backupDir, dest)
            );
        }

        // Backup dos arquivos da raiz
        const rootFiles = ['package.json', 'package-lock.json', '.env', 'app.js'];
        await fs.mkdir(path.join(backupDir, 'root'), { recursive: true });
        
        for (const file of rootFiles) {
            try {
                await fs.copyFile(
                    path.join(__dirname, '..', file),
                    path.join(backupDir, 'root', file)
                );
                console.log(`Backup do arquivo ${file} concluído`);
            } catch (error) {
                console.log(`Arquivo ${file} não existe`);
            }
        }
        
        console.log(`Backup concluído em: ${backupDir}`);
        
    } catch (error) {
        console.error('Erro durante backup:', error);
    } finally {
        await mongoose.connection.close();
    }
}

createBackup();

export { createBackup }; 