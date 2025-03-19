import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  event_date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['highlight', 'event', 'free', 'course'],
    default: 'event'
  },
  image_url: {
    type: String
  },
  link: {
    type: String
  },
  tags: [{
    type: String,
    enum: ['ASSINANTES', 'INTERMEDIÁRIO', 'GRÁTIS', 'INICIANTE', 'AVANÇADO']
  }],
  platform: {
    type: String,
    enum: ['Online', 'Presencial', 'Híbrido']
  },
  platform_details: {
    type: String // Ex: "Palco Aberto - Discord", "Youtube"
  },
  instructor: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Índices
newsSchema.index({ company_id: 1, status: 1 });
newsSchema.index({ event_date: 1 });
newsSchema.index({ type: 1 });

const News = mongoose.model('News', newsSchema);

export default News; 