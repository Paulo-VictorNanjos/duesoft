import express from 'express';
import auth from '../middlewares/auth.js';
import Course from '../models/Course.js';
import History from '../models/History.js';
import CertificateGenerator from '../utils/certificateGenerator.js';
import { checkPlanAccess } from '../middlewares/planAccess.js';
import path from 'path';
import Logger from '../utils/logger.js';
import fs from 'fs';

const router = express.Router();

router.get('/:courseId', auth, checkPlanAccess('certificates'), async (req, res) => {
    try {
        Logger.info('Iniciando geração de certificado', {
            courseId: req.params.courseId,
            user: req.user.email
        });
        
        const [course, history] = await Promise.all([
            Course.findOne({
                _id: req.params.courseId,
                company: req.user.company._id
            }),
            History.findOne({
                user: req.user._id,
                course: req.params.courseId,
                progress: 100
            })
        ]);
        
        if (!course) {
            Logger.error('Curso não encontrado', { courseId: req.params.courseId });
            return res.status(404).send('Curso não encontrado');
        }
        
        if (!history) {
            Logger.error('Curso não concluído', { courseId: req.params.courseId });
            return res.status(403).send('Curso não concluído');
        }
        
        const generator = new CertificateGenerator(req.user, course);
        const certificate = await generator.generate();
        
        const filePath = path.join(process.cwd(), 'public', 'certificates', certificate.fileName);
        
        try {
            await fs.promises.access(filePath, fs.constants.R_OK);
        } catch (err) {
            Logger.error('Arquivo do certificado não pode ser acessado', err);
            throw new Error('Erro ao acessar arquivo do certificado');
        }
        
        res.download(
            filePath,
            `certificado-${course.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            (err) => {
                if (err) {
                    Logger.error('Erro ao enviar arquivo', err);
                    if (!res.headersSent) {
                        res.status(500).send('Erro ao baixar certificado');
                    }
                }
            }
        );
    } catch (error) {
        Logger.error('Erro ao gerar certificado', error);
        if (!res.headersSent) {
            res.status(500).send('Erro ao gerar certificado');
        }
    }
});

export default router;
