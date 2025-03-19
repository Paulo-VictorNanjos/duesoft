import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mentor',
        required: true
    },
    mentee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    dateTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    endTime: {
        type: Date,
        required: false
    },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'REFUNDED'],
        default: 'PENDING'
    },
    meetingLink: String,
    googleEventId: String,
    meetingDetails: {
        eventId: String,
        meetLink: String,
        calendarLink: String
    },
    topics: String,
    notes: String,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: String,
    cancellationReason: String,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Middleware para calcular endTime antes de validar
sessionSchema.pre('validate', function(next) {
    if (this.dateTime && this.duration) {
        this.endTime = new Date(this.dateTime.getTime() + this.duration * 60000);
    }
    next();
});

// Método para verificar conflitos
sessionSchema.statics.checkConflict = async function(mentor, dateTime, duration) {
    const endTime = new Date(dateTime.getTime() + duration * 60000);
    
    const conflictingSession = await this.findOne({
        mentor: mentor,
        status: 'scheduled',
        $or: [
            // Nova sessão começa durante uma existente
            {
                dateTime: { $lte: dateTime },
                endTime: { $gt: dateTime }
            },
            // Nova sessão termina durante uma existente
            {
                dateTime: { $lt: endTime },
                endTime: { $gte: endTime }
            }
        ]
    });

    return conflictingSession;
};

// Middleware para verificar conflitos antes de salvar
sessionSchema.pre('save', async function(next) {
    if (this.isNew && this.status === 'scheduled') {
        const conflictingSession = await this.constructor.checkConflict(
            this.mentor,
            this.dateTime,
            this.duration
        );

        if (conflictingSession) {
            throw new Error('Horário já está ocupado');
        }
    }
    next();
});

export default mongoose.model('MentorSession', sessionSchema); 