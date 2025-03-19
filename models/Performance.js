import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    courseProgress: {
        type: Number,
        required: true
    },
    averageGrade: {
        type: Number,
        required: true
    }
});

const Performance = mongoose.model('Performance', performanceSchema);
export default Performance; 