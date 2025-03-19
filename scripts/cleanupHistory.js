import mongoose from 'mongoose';
import History from '../models/History.js';
import Course from '../models/Course.js';

async function cleanupHistory() {
    try {
        // Encontrar todos os históricos
        const histories = await History.find({});
        
        for (const history of histories) {
            // Verificar se o curso existe
            const courseExists = await Course.findById(history.course);
            
            if (!courseExists) {
                // Se o curso não existe, deletar o histórico
                await History.findByIdAndDelete(history._id);
                console.log(`Deleted history ${history._id} with invalid course reference`);
            }
        }
        
        console.log('Cleanup completed');
    } catch (error) {
        console.error('Cleanup error:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Executar o script
cleanupHistory(); 