import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    options: [{
        text: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            required: true
        }
    }],
    points: {
        type: Number,
        default: 1
    }
});

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    timeLimit: {
        type: Number,
        required: true,
        min: 1
    },
    questions: [{
        type: {
            type: String,
            enum: ['multiple_choice', 'essay'],
            required: true
        },
        questionText: String,
        baseText: String,
        maxScore: Number,
        evaluationCriteria: String,
        expectedAnswer: String,
        image: String,
        options: [{
            text: String,
            isCorrect: Boolean
        }]
    }],
    minimumScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    active: {
        type: Boolean,
        default: true
    },
    attempts: {
        type: Number,
        default: 1,
        min: 1
    },
    experiencePoints: {
        type: Number,
        default: 100
    },
    isCategoryExam: {
        type: Boolean,
        default: false
    },
    targetCategory: {
        type: String,
        enum: ['Pleno', 'Senior'],
        required: function() {
            return this.isCategoryExam;
        }
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    type: {
        type: String,
        enum: ['multiple_choice', 'essay'],
        default: 'multiple_choice'
    }
}, { timestamps: true });

const examAttemptSchema = new mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
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
    answers: [{
        type: {
            type: String,
            enum: ['multiple_choice', 'essay'],
            required: true
        },
        selectedOption: Number,
        text: String,
        score: {
            type: Number,
            default: 0
        },
        feedback: String,
        isCorrect: {
            type: Boolean,
            default: false
        }
    }],
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    score: {
        type: Number,
        default: 0
    },
    passed: {
        type: Boolean,
        default: false
    },
    timeSpent: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'pending_review', 'graded'],
        default: 'in_progress'
    }
}, { timestamps: true });

examAttemptSchema.pre('save', async function(next) {
    try {
        if (this.isNew) {
            const exam = await mongoose.model('Exam').findById(this.exam);
            if (exam && this.answers.length !== exam.questions.length) {
                throw new Error('Número de respostas não corresponde ao número de questões');
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Verificar se os modelos já existem antes de criar
const Exam = mongoose.models.Exam || mongoose.model('Exam', examSchema);
const ExamAttempt = mongoose.models.ExamAttempt || mongoose.model('ExamAttempt', examAttemptSchema);

export { Exam, ExamAttempt };