import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    phone: {
        type: String,
        trim: true
    },
    profilePicture: String,
    coverPicture: {
        type: String,
        default: ''
    },
    experience: {
        type: Number,
        default: 0,
        max: 100000
    },
    category: {
        type: String,
        enum: ['Junior', 'Pleno', 'Senior'],
        default: 'Junior'
    },
    completedCourses: [{
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        progress: {
            type: Number,
            default: 0
        },
        completedAt: Date,
        finalGrade: Number
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isMaster: {
        type: Boolean,
        default: false
    },
    achievements: [{
        achievement: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Achievement'
        },
        unlockedAt: {
            type: Date,
            default: Date.now
        },
        progress: {
            type: Number,
            default: 0
        }
    }],
    loginDates: [{
        type: Date
    }],
    refreshToken: {
        type: String,
        default: null
    },
    highlightedAchievement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Achievement',
        default: null
    },
    role: { type: String, default: 'user' },
    isMentor: {
        type: Boolean,
        default: false
    },
    cookiePreferences: {
        accepted: Boolean,
        updatedAt: Date
    },
    loginAttempts: {
        type: Number,
        required: true,
        default: 0
    },
    lockUntil: {
        type: Number
    },
    lastLogin: {
        type: Date
    },
    previousLogins: [{
        date: Date,
        ip: String,
        userAgent: String,
        success: Boolean
    }]
}, {
    timestamps: true
});

// Método para calcular apenas o nível (removendo a lógica de categoria)
userSchema.methods.calculateLevel = function() {
    // Cada nível requer 1000 XP
    const level = Math.floor(this.experience / 1000) + 1;
    return Math.min(level, 100); // Máximo nível 100
};

// Novo método para atualizar XP
userSchema.methods.addExperience = function(xpAmount) {
    const oldExperience = this.experience;
    this.experience = Math.max(0, Math.min(this.experience + xpAmount, 1000000)); // Aumentado para 1 milhão
    const xpGained = this.experience - oldExperience;
    
    if (xpGained > 0) {
        this.calculateLevel();
        return true;
    }
    return false;
};

userSchema.methods.incLoginAttempts = async function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5 && !this.lockUntil) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 horas
    }
    return await this.updateOne(updates);
};

const User = mongoose.model('User', userSchema);

export default User;