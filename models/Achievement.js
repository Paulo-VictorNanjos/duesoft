import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['cursos', 'provas', 'experiência', 'social'],
        required: true
    },
    condition: {
        type: {
            type: String,
            enum: ['coursesCompleted', 'examsPassed', 'experienceReached', 'messagesExchanged'],
            required: true
        },
        value: {
            type: Number,
            required: true
        }
    },
    xpReward: {
        type: Number,
        default: 100
    },
    rarity: {
        type: String,
        enum: ['comum', 'raro', 'épico', 'lendário'],
        required: true
    },
    isHighlighted: {
        type: Boolean,
        default: false
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
}, {
    timestamps: true
});

const Achievement = mongoose.model('Achievement', achievementSchema);
export default Achievement; 