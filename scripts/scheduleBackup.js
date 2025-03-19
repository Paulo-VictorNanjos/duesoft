import cron from 'node-cron';
import { createBackup } from './backup.js';

// Agendar backup diário às 3h da manhã
cron.schedule('0 3 * * *', async () => {
    try {
        console.log('Iniciando backup agendado...');
        await createBackup();
        console.log('Backup agendado concluído com sucesso!');
    } catch (error) {
        console.error('Erro no backup agendado:', error);
    }
}); 