import mongoose from 'mongoose';

const mentorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    specialties: [{
        type: String,
        required: true
    }],
    biography: {
        type: String,
        required: true
    },
    experience: {
        type: String,
        required: true
    },
    hourlyRate: {
        type: Number,
        required: true
    },
    availability: [{
        dayOfWeek: Number,
        startTime: String,
        endTime: String
    }],
    rating: {
        type: Number,
        default: 0
    },
    reviewsCount: {
        type: Number,
        default: 0
    },
    reviews: [{
        mentee: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        rating: Number,
        comment: String,
        date: { 
            type: Date, 
            default: Date.now 
        }
    }],
    active: {
        type: Boolean,
        default: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    metrics: {
        totalSessions: { type: Number, default: 0 },
        completedSessions: { type: Number, default: 0 },
        cancelledSessions: { type: Number, default: 0 },
        averageSessionDuration: { type: Number, default: 0 }
    },
    preferences: {
        maxSessionsPerDay: { type: Number, default: 4 },
        sessionDuration: { type: Number, default: 60 },
        breakBetweenSessions: { type: Number, default: 15 }
    }
}, { timestamps: true });

mentorSchema.statics.isMentor = async function(userId, companyId) {
    const mentor = await this.findOne({
        user: userId,
        company: companyId,
        active: true,
        verified: true
    });
    return !!mentor;
};

mentorSchema.statics.findMentorWithDetails = async function(userId, companyId) {
    const mentor = await this.findOne({
        user: userId,
        company: companyId
    }).lean();

    console.log('Detalhes do Mentor:', {
        found: !!mentor,
        active: mentor?.active,
        verified: mentor?.verified,
        userId,
        companyId
    });

    return mentor;
};

mentorSchema.methods.updateMetrics = async function() {
    const sessions = await mongoose.model('MentorSession').find({ mentor: this._id });
    
    this.metrics = {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        cancelledSessions: sessions.filter(s => s.status === 'cancelled').length,
        averageSessionDuration: sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length || 0
    };

    await this.save();
};

mentorSchema.methods.isAvailable = function(dateTime) {
    const day = new Date(dateTime).getDay();
    const time = new Date(dateTime).toTimeString().slice(0, 5);
    
    const dayAvailability = this.availability.find(a => a.dayOfWeek === day);
    if (!dayAvailability) return false;

    return time >= dayAvailability.startTime && time <= dayAvailability.endTime;
};

export default mongoose.model('Mentor', mentorSchema); 