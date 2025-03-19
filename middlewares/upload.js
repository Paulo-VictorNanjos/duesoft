import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Criar pasta de uploads se não existir
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Lista de tipos MIME permitidos para anexos
const allowedMimeTypes = [
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    // Imagens
    'image/jpeg',
    'image/png',
    'image/gif',
    // Arquivos de texto
    'text/plain',
    // Arquivos compactados
    'application/zip',
    'application/x-rar-compressed',
    // Vídeos
    'video/mp4',
    'video/quicktime',
    // Áudios
    'audio/mpeg',
    'audio/wav'
];

const fileFilter = (req, file, cb) => {
    if (req.path.includes('/attachments')) {
        // Para uploads de anexos, verifica se o tipo MIME está na lista permitida
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido. Apenas documentos, imagens, vídeos e áudios são permitidos.'));
        }
    } else {
        // Para outros uploads (como imagens de perfil ou capas de curso), mantém a verificação original
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    }
};

const limits = {
    fileSize: 50 * 1024 * 1024 // 50MB
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: limits
});

export default upload;
