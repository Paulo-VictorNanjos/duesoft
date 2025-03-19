import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    contentType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    fileName: String,
    fileSize: Number,
    fileUrl: String,   
    read: {
        type: Boolean,
        default: false
    },
    isTyping: {
        type: Boolean,
        default: false
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);
export default Message; 