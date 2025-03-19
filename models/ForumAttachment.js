import mongoose from 'mongoose';
import fs from 'fs/promises';

const forumAttachmentSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: [true, 'O nome do arquivo é obrigatório'],
        trim: true
    },
    originalname: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    encoding: {
        type: String
    },
    size: {
        type: Number,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    url: {
        type: String
    },
    thumbnailUrl: {
        type: String
    },
    type: {
        type: String,
        required: true,
        enum: ['topic', 'reply']
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumTopic'
    },
    reply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumReply'
    },
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    metadata: {
        width: Number,
        height: Number,
        duration: Number,
        format: String,
        pages: Number
    },
    status: {
        type: String,
        enum: ['processing', 'ready', 'error'],
        default: 'processing'
    },
    error: {
        message: String,
        code: String,
        details: mongoose.Schema.Types.Mixed
    },
    downloads: {
        type: Number,
        default: 0
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices
forumAttachmentSchema.index({ company: 1, type: 1 });
forumAttachmentSchema.index({ topic: 1 });
forumAttachmentSchema.index({ reply: 1 });
forumAttachmentSchema.index({ uploader: 1 });
forumAttachmentSchema.index({ mimetype: 1 });
forumAttachmentSchema.index({ status: 1 });

// Validação personalizada
forumAttachmentSchema.pre('validate', function(next) {
    if (this.type === 'topic' && !this.topic) {
        next(new Error('Topic ID is required for topic attachments'));
    } else if (this.type === 'reply' && !this.reply) {
        next(new Error('Reply ID is required for reply attachments'));
    } else {
        next();
    }
});

// Middleware para atualizar timestamps
forumAttachmentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Middleware para remover arquivo físico ao excluir documento
forumAttachmentSchema.pre('remove', async function(next) {
    try {
        await fs.unlink(this.path);
        
        if (this.thumbnailUrl) {
            const thumbnailPath = this.thumbnailUrl.replace(/^\/uploads/, 'uploads');
            await fs.unlink(thumbnailPath);
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Métodos estáticos
forumAttachmentSchema.statics.getAttachments = async function(options = {}) {
    const query = { isActive: true };
    
    if (options.type && options.id) {
        query.type = options.type;
        query[options.type] = options.id;
    }
    
    if (options.mimetype) {
        query.mimetype = new RegExp(options.mimetype, 'i');
    }
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('uploader', 'name avatar');
};

forumAttachmentSchema.statics.getStats = async function(companyId) {
    return this.aggregate([
        { $match: { company: mongoose.Types.ObjectId(companyId) } },
        { $group: {
            _id: '$mimetype',
            count: { $sum: 1 },
            totalSize: { $sum: '$size' },
            totalDownloads: { $sum: '$downloads' }
        }},
        { $sort: { count: -1 } }
    ]);
};

// Métodos de instância
forumAttachmentSchema.methods.incrementDownloads = async function() {
    this.downloads += 1;
    return this.save();
};

forumAttachmentSchema.methods.generateThumbnail = async function() {
    if (!this.mimetype.startsWith('image/')) {
        return;
    }
    
    try {
        const { default: sharp } = await import('sharp');
        const path = await import('path');
        
        const thumbnailFilename = `thumb_${this.filename}`;
        const thumbnailPath = path.join('uploads', 'thumbnails', thumbnailFilename);
        
        await sharp(this.path)
            .resize(200, 200, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
        
        this.thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
        await this.save();
        
    } catch (error) {
        console.error('Error generating thumbnail:', error);
    }
};

forumAttachmentSchema.methods.processFile = async function() {
    try {
        // Processa metadados baseado no tipo de arquivo
        if (this.mimetype.startsWith('image/')) {
            const { default: sharp } = await import('sharp');
            const metadata = await sharp(this.path).metadata();
            
            this.metadata = {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format
            };
            
            await this.generateThumbnail();
        }
        else if (this.mimetype.startsWith('video/')) {
            // Implementar processamento de vídeo se necessário
        }
        else if (this.mimetype === 'application/pdf') {
            // Implementar contagem de páginas PDF se necessário
        }
        
        this.status = 'ready';
        await this.save();
        
    } catch (error) {
        this.status = 'error';
        this.error = {
            message: error.message,
            code: error.code,
            details: error
        };
        await this.save();
    }
};

const ForumAttachment = mongoose.model('ForumAttachment', forumAttachmentSchema);

export default ForumAttachment; 