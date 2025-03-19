import mongoose from 'mongoose';

// Esquema de progresso das aulas
const lessonProgressSchema = new mongoose.Schema({
    lessonId: {
        type: String,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    lastWatched: {
        type: Date,
        default: null
    },
    watchTime: {
        type: Number,
        default: 0 // Tempo assistido em minutos (ou segundos, dependendo do uso)
    }
});

// Esquema de progresso dos módulos
const moduleProgressSchema = new mongoose.Schema({
    moduleId: {
        type: String,
        required: true
    },
    lessons: {
        type: [lessonProgressSchema],
        default: []
    },
    completed: {
        type: Boolean,
        default: false
    },
    lastAccessed: {
        type: Date,
        default: null
    }
});

// Esquema principal de histórico
const historySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    modules: {
        type: [moduleProgressSchema],
        default: []
    },
    progress: {
        type: Number,
        default: 0 // Progresso geral em %
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    certificateUrl: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Método para calcular o progresso geral
historySchema.methods.calculateProgress = function() {
    if (!this.modules.length) {
        this.progress = 0;
        return this.progress;
    }

    const totalLessons = this.modules.reduce((total, module) =>
        total + module.lessons.length, 0
    );

    const completedLessons = this.modules.reduce((total, module) =>
        total + module.lessons.filter(lesson => lesson.completed).length, 0
    );

    this.progress = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100) 
        : 0;

    return this.progress;
};

// Método para verificar se o curso está completo
historySchema.methods.checkCompletion = function() {
    if (this.progress === 100 && !this.completedAt) {
        this.completedAt = new Date();
    }
    return this.completedAt !== null;
};

// Método para verificar progresso de um módulo
historySchema.methods.getModuleProgress = function(moduleId) {
    const module = this.modules.find(mod => mod.moduleId === moduleId);
    if (!module) return null;

    const totalLessons = module.lessons.length;
    const completedLessons = module.lessons.filter(lesson => lesson.completed).length;

    return {
        progress: totalLessons > 0 
            ? Math.round((completedLessons / totalLessons) * 100) 
            : 0,
        completed: module.completed
    };
};

// Método para inicializar o histórico com módulos e aulas
historySchema.statics.initializeForCourse = function(userId, course) {
    return new this({
        user: userId,
        course: course._id,
        modules: course.modules.map(module => ({
            moduleId: module._id.toString(),
            lessons: module.lessons.map(lesson => ({
                lessonId: lesson._id.toString(),
                completed: false
            }))
        }))
    });
};

const History = mongoose.model('History', historySchema);

export default History;
