import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  coverImage: {
    type: String,
    default: '/images/default-course-cover.jpg'
  },
  modules: [{
    title: String,
    lessons: [{
      title: String,
      videoUrl: String,
      videoType: {
        type: String,
        enum: ['local', 'youtube', 'vimeo'],
        default: 'local'
      },
      duration: Number,
      isRequired: {
        type: Boolean,
        default: true
      }
    }],
    slides: [{
      title: String,
      description: String,
      images: [{
        url: String,
        order: Number,
        description: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      order: Number,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  experiencePoints: {
    type: Number,
    default: 100
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  attachments: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    fileUrl: {
      type: String,
      required: true
    },
    fileType: String,
    fileSize: Number,
    downloadCount: {
      type: Number,
      default: 0
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const Course = mongoose.model('Course', courseSchema);

export default Course;
