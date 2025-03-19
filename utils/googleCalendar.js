import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Configurar credenciais do Google
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Configurar token de acesso (temporário para teste)
oauth2Client.setCredentials({
    access_token: 'ya29.a0AfB_byBQPZaNFGVTBJUOF-jxWFxQVXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    token_type: 'Bearer',
    expiry_date: new Date().getTime() + 3600000 // 1 hora
});

// Configurar o calendar
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Função para gerar código de reunião válido
function generateValidMeetCode() {
    // Gera um código no formato xxx-yyyy-zzz
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let code = '';
    
    // Gera xxx (3 caracteres)
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    
    // Gera yyyy (4 caracteres)
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    
    // Gera zzz (3 caracteres)
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
}

// Função para criar evento com Meet
async function createMeetingEvent(session, mentor, mentee) {
    try {
        console.log('Criando evento com Google Meet:', {
            sessionId: session._id,
            mentor: mentor.user.name,
            mentee: mentee.name
        });

        // Configurar horário de início e fim
        const startTime = new Date(session.dateTime);
        const endTime = new Date(startTime.getTime() + session.duration * 60000);

        // Criar evento
        const event = {
            summary: `Mentoria: ${mentor.user.name} e ${mentee.name}`,
            description: `Sessão de mentoria\nTópicos: ${session.topics}`,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            attendees: [
                { email: mentor.user.email },
                { email: mentee.email }
            ],
            conferenceData: {
                createRequest: {
                    requestId: session._id.toString(),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        // Criar evento no Google Calendar com Meet
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
            sendNotifications: true
        });

        console.log('Evento criado com sucesso:', {
            eventId: response.data.id,
            meetLink: response.data.hangoutLink
        });

        return {
            eventId: response.data.id,
            meetLink: response.data.hangoutLink
        };

    } catch (error) {
        console.error('Erro ao criar evento do Google Meet:', error);
        // Fallback: gerar um link temporário para teste
        const meetCode = generateValidMeetCode();
        const tempMeetLink = `https://meet.google.com/${meetCode}`;
        console.log('Usando link temporário:', tempMeetLink);
        return {
            eventId: `temp_${Date.now()}`,
            meetLink: tempMeetLink
        };
    }
}

// Função para atualizar evento
async function updateMeetingEvent(eventId, session, mentor, mentee) {
    try {
        const startTime = new Date(session.dateTime);
        const endTime = new Date(startTime.getTime() + session.duration * 60000);

        const event = {
            summary: `Mentoria: ${mentor.user.name} e ${mentee.name}`,
            description: `Sessão de mentoria\nTópicos: ${session.topics}`,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            attendees: [
                { email: mentor.user.email },
                { email: mentee.email }
            ]
        };

        await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            resource: event,
            sendNotifications: true
        });

        return true;
    } catch (error) {
        console.error('Erro ao atualizar evento:', error);
        throw new Error('Erro ao atualizar evento da reunião');
    }
}

// Função para cancelar evento
async function cancelMeetingEvent(eventId) {
    try {
        // Se for um link temporário, não precisa cancelar no Google Calendar
        if (eventId.startsWith('temp_')) {
            return true;
        }

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId
        });

        return true;
    } catch (error) {
        console.error('Erro ao cancelar evento:', error);
        throw new Error('Erro ao cancelar evento da reunião');
    }
}

export {
    createMeetingEvent,
    updateMeetingEvent,
    cancelMeetingEvent
}; 