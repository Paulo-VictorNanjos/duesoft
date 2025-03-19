import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'exam_graded'],
        default: 'info'
    },
    read: {
        type: Boolean,
        default: false
    },
    link: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    examAttempt: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamAttempt'
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam'
    }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification; 