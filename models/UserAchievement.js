import mongoose from 'mongoose';

const userAchievementSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    achievement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Achievement',
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    progress: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Índice composto para evitar duplicatas
userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });

const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

export default UserAchievement; 