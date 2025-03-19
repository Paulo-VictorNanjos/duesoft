import mongoose from 'mongoose';
import chalk from 'chalk';

const connectDB = async () => {
    try {
        console.log(chalk.cyan('╔════════════════════════════════════════╗'));
        console.log(chalk.cyan('║        SISTEMA LMS DUESOFT 1.0         ║'));
        console.log(chalk.cyan('╚════════════════════════════════════════╝\n'));
        
        console.log(chalk.yellow('📡 Iniciando conexão com MongoDB...'));
        const dbConfig = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            autoIndex: process.env.NODE_ENV !== 'production',
            connectTimeoutMS: 10000,
            keepAlive: true,
            keepAliveInitialDelay: 300000
        };
        const conn = await mongoose.connect(process.env.MONGODB_URI, dbConfig);

        const isDev = process.env.NODE_ENV === 'development';
        console.log(chalk.green('✅ MongoDB Conectado'));
        if (isDev) {
            console.log(chalk.blue(`Host: ${conn.connection.host}`));
        }
        console.log(chalk.green('🏃 Servidor iniciado\n'));
    } catch (error) {
        console.log(chalk.red('╔════════════════════════════════════════╗'));
        console.log(chalk.red('║            ERRO DE CONEXÃO             ║'));
        console.log(chalk.red('╚════════════════════════════════════════╝\n'));
        
        console.error(chalk.red('❌ Detalhes do erro:'), {
            message: error.message,
            code: error.code,
            name: error.name
        });
        
        console.log(chalk.yellow('🔄 Tentando reconectar em 5 segundos...\n'));
        setTimeout(connectDB, 5000);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log(chalk.yellow('⚠️  MongoDB desconectado'));
    console.log(chalk.blue('🔄 Iniciando reconexão automática...\n'));
    setTimeout(connectDB, 5000);
});

export default connectDB;