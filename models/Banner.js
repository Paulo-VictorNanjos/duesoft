import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  link: {
    type: String
  },
  image_url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['default', 'header'],
    default: 'default'
  },
  background_color: {
    type: String,
    default: '#000000'
  },
  text_color: {
    type: String,
    default: '#FFFFFF'
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

bannerSchema.index({ company_id: 1, type: 1, status: 1 });
bannerSchema.index({ start_date: 1, end_date: 1 });

export default mongoose.model('Banner', bannerSchema); 