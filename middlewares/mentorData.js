import Mentor from '../models/Mentor.js';
import MentorSession from '../models/MentorSession.js';

const mentorData = async (req, res, next) => {
    try {
        // Inicializar mentorSessions como array vazio
        res.locals.mentorSessions = [];

        // Se o usuário for mentor e a company existir, buscar suas sessões
        if (req.user?.isMentor && req.company) {
            const mentor = await Mentor.findOne({ 
                user: req.user._id,
                company: req.company._id
            });

            if (mentor) {
                const [upcomingSessions, pastSessions] = await Promise.all([
                    MentorSession.find({
                        mentor: mentor._id,
                        status: 'scheduled',
                        dateTime: { $gte: new Date() }
                    }).sort({ dateTime: 1 }),

                    MentorSession.find({
                        mentor: mentor._id,
                        $or: [
                            { status: { $in: ['completed', 'cancelled'] } },
                            { dateTime: { $lt: new Date() } }
                        ]
                    }).sort({ dateTime: -1 })
                ]);

                // Disponibilizar para todas as views
                res.locals.mentorSessions = upcomingSessions;
                res.locals.pastSessions = pastSessions;
            }
        }

        next();
    } catch (error) {
        console.error('Erro ao carregar dados do mentor:', error);
        next();
    }
};

export default mentorData; 