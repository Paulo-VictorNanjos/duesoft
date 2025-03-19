import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Course from '../models/Course.js';
import { Exam } from '../models/Exam.js';
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';

class ReportGenerator {
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'reports');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async generateReport(type, dateRange, filters) {
        try {
            console.log('Gerando relatório:', { type, dateRange, filters });
            let result;
            switch (type) {
                case 'curso':
                    result = await this.generateCourseReport(dateRange, filters);
                    break;
                case 'prova':
                    result = await this.generateExamReport(dateRange, filters);
                    break;
                case 'usuario':
                    result = await this.generateUserReport(dateRange, filters);
                    break;
                case 'conquista':
                    result = await this.generateAchievementReport(dateRange, filters);
                    break;
                default:
                    throw new Error('Tipo de relatório inválido');
            }

            console.log('Relatório gerado com sucesso:', result);
            return {
                title: `Relatório de ${type.charAt(0).toUpperCase() + type.slice(1)}s`,
                type: type,
                data: result,
                generatedAt: new Date()
            };
        } catch (error) {
            console.error(`Erro ao gerar relatório de ${type}:`, error);
            throw error;
        }
    }

    async generateCourseReport(dateRange, filters) {
        try {
            const courses = await Course.find({});
            
            console.log('Cursos encontrados:', courses.length);

            const processedCourses = courses.map(course => {
                console.log('Processando curso:', {
                    id: course._id,
                    title: course.title,
                    modulesCount: course.modules?.length || 0
                });

                const totalAulas = course.modules?.reduce((total, module) => {
                    return total + (module.lessons?.length || 0);
                }, 0) || 0;

                return {
                    titulo: course.title,
                    descricao: course.description,
                    totalModulos: course.modules?.length || 0,
                    totalAulas: totalAulas,
                    pontuacao: course.experiencePoints || 0,
                    dataCriacao: course.createdAt,
                    modulos: course.modules?.map(module => ({
                        titulo: module.title,
                        totalAulas: module.lessons?.length || 0,
                        aulas: module.lessons?.map(lesson => ({
                            titulo: lesson.title,
                            duracao: lesson.duration || 0
                        })) || []
                    })) || []
                };
            });

            const result = {
                totalCursos: courses.length,
                cursos: processedCourses
            };

            console.log('Resultado final:', result);

            return result;
        } catch (error) {
            console.error('Erro ao gerar relatório de cursos:', error);
            throw error;
        }
    }

    async generateExamReport(dateRange, filters) {
        const exams = await Exam.find({
            createdAt: {
                $gte: new Date(dateRange.start),
                $lte: new Date(dateRange.end)
            }
        }).populate('course');

        return {
            totalProvas: exams.length,
            provas: exams.map(exam => ({
                titulo: exam.title,
                curso: exam.course?.title || 'N/A',
                totalQuestoes: exam.questions.length,
                mediaNotas: exam.attempts?.reduce((acc, att) => 
                    acc + att.score, 0) / (exam.attempts?.length || 1),
                tentativas: exam.attempts?.length || 0,
                dataCriacao: exam.createdAt
            }))
        };
    }

    async generateUserReport(dateRange, filters) {
        const users = await User.find({
            createdAt: {
                $gte: new Date(dateRange.start),
                $lte: new Date(dateRange.end)
            }
        }).populate('completedCourses');

        return {
            totalUsuarios: users.length,
            usuarios: users.map(user => ({
                nome: user.name,
                email: user.email,
                cursosCompletos: user.completedCourses.length,
                pontuacaoTotal: user.experiencePoints,
                ultimoAcesso: user.lastLogin,
                dataCadastro: user.createdAt
            }))
        };
    }

    async generateAchievementReport(dateRange, filters) {
        const achievements = await Achievement.find({
            createdAt: {
                $gte: new Date(dateRange.start),
                $lte: new Date(dateRange.end)
            }
        }).populate('unlockedBy');

        return {
            totalConquistas: achievements.length,
            conquistas: achievements.map(achievement => ({
                titulo: achievement.title,
                descricao: achievement.description,
                pontuacao: achievement.xpReward,
                usuariosDesbloquearam: achievement.unlockedBy?.length || 0,
                raridade: achievement.rarity,
                dataCriacao: achievement.createdAt
            }))
        };
    }

    async generateFile(report) {
        try {
            const fileName = `relatorio-${report.type}-${Date.now()}`;
            const filePath = path.join(this.tempDir, fileName);
            
            let file;
            switch (report.format.toLowerCase()) {
                case 'pdf':
                    file = await this.generatePDF(report, `${filePath}.pdf`);
                    break;
                case 'excel':
                    file = await this.generateExcel(report, `${filePath}.xlsx`);
                    break;
                case 'csv':
                    file = await this.generateCSV(report, `${filePath}.csv`);
                    break;
                default:
                    throw new Error('Formato de arquivo não suportado');
            }
            
            return file;
        } catch (error) {
            console.error('Erro ao gerar arquivo:', error);
            throw error;
        }
    }

    async generatePDF(report, filePath) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const stream = fs.createWriteStream(filePath);

                doc.pipe(stream);
                
                // Cabeçalho
                doc.fontSize(20).text(report.title, { align: 'center' });
                doc.moveDown();
                
                // Conteúdo baseado no tipo de relatório
                if (report.data) {
                    switch (report.type) {
                        case 'curso':
                            this.renderCoursesPDF(doc, report.data);
                            break;
                        case 'prova':
                            this.renderExamsPDF(doc, report.data);
                            break;
                        case 'usuario':
                            this.renderUsersPDF(doc, report.data);
                            break;
                        case 'conquista':
                            this.renderAchievementsPDF(doc, report.data);
                            break;
                    }
                }

                doc.end();

                stream.on('finish', () => {
                    resolve({ path: filePath });
                });

                stream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Métodos auxiliares para renderização PDF
    renderCoursesPDF(doc, data) {
        // Cabeçalho do relatório
        doc.fontSize(16).text('Relatório de Cursos', { align: 'center' });
        doc.moveDown();
        
        // Informações gerais
        doc.fontSize(14).text(`Total de Cursos: ${data.totalCursos}`);
        doc.moveDown();

        // Lista detalhada de cursos
        data.cursos.forEach(curso => {
            // Título do curso
            doc.fontSize(12)
                .fillColor('#000')
                .text(`Curso: ${curso.titulo}`, { underline: true });

            // Detalhes do curso
            doc.fontSize(10)
                .fillColor('#333')
                .text(`Descrição: ${curso.descricao || 'N/A'}`)
                .text(`Total de Módulos: ${curso.totalModulos}`)
                .text(`Total de Aulas: ${curso.totalAulas}`)
                .text(`Pontuação: ${curso.pontuacao}`)
                .text(`Data de Criação: ${new Date(curso.dataCriacao).toLocaleDateString('pt-BR')}`);

            // Detalhes dos módulos
            if (curso.modulos && curso.modulos.length > 0) {
                doc.moveDown()
                    .fontSize(10)
                    .text('Módulos:', { underline: true });

                curso.modulos.forEach(modulo => {
                    doc.text(`  • ${modulo.titulo} (${modulo.totalAulas} aulas)`);
                });
            }

            doc.moveDown(2);
        });
    }

    renderExamsPDF(doc, data) {
        doc.fontSize(16).text('Relatório de Provas', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(14).text(`Total de Provas: ${data.totalProvas}`);
        doc.moveDown();

        data.provas.forEach(prova => {
            doc.fontSize(12)
                .fillColor('#000')
                .text(`Prova: ${prova.title}`, { underline: true });

            doc.fontSize(10)
                .fillColor('#333')
                .text(`Curso: ${prova.course?.title || 'N/A'}`)
                .text(`Total de Questões: ${prova.questions?.length || 0}`)
                .text(`Pontuação Mínima: ${prova.minimumScore}%`)
                .text(`Tentativas Permitidas: ${prova.attempts}`)
                .text(`Pontos de Experiência: ${prova.experiencePoints}`)
                .text(`Status: ${prova.active ? 'Ativo' : 'Inativo'}`)
                .text(`Data de Criação: ${new Date(prova.createdAt).toLocaleDateString('pt-BR')}`);

            doc.moveDown(2);
        });
    }

    renderUsersPDF(doc, data) {
        doc.fontSize(16).text('Relatório de Usuários', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(14).text(`Total de Usuários: ${data.totalUsuarios}`);
        doc.moveDown();

        data.usuarios.forEach(usuario => {
            doc.fontSize(12)
                .fillColor('#000')
                .text(`Usuário: ${usuario.name}`, { underline: true });

            doc.fontSize(10)
                .fillColor('#333')
                .text(`Email: ${usuario.email}`)
                .text(`Cursos Completados: ${usuario.completedCourses?.length || 0}`)
                .text(`Pontuação Total: ${usuario.experiencePoints || 0} XP`)
                .text(`Nível: ${usuario.level || 1}`)
                .text(`Data de Cadastro: ${new Date(usuario.createdAt).toLocaleDateString('pt-BR')}`)
                .text(`Último Acesso: ${usuario.lastLogin ? new Date(usuario.lastLogin).toLocaleString('pt-BR') : 'N/A'}`);

            doc.moveDown(2);
        });
    }

    renderAchievementsPDF(doc, data) {
        doc.fontSize(16).text('Relatório de Conquistas', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(14).text(`Total de Conquistas: ${data.totalConquistas}`);
        doc.moveDown();

        data.conquistas.forEach(conquista => {
            doc.fontSize(12)
                .fillColor('#000')
                .text(`Conquista: ${conquista.title}`, { underline: true });

            doc.fontSize(10)
                .fillColor('#333')
                .text(`Descrição: ${conquista.description}`)
                .text(`Categoria: ${conquista.category}`)
                .text(`Recompensa: ${conquista.xpReward} XP`)
                .text(`Raridade: ${conquista.rarity}`)
                .text(`Condição: ${conquista.condition.value} ${conquista.condition.type}`)
                .text(`Data de Criação: ${new Date(conquista.createdAt).toLocaleDateString('pt-BR')}`);

            doc.moveDown(2);
        });
    }

    // Implemente os outros métodos de renderização (renderExamsPDF, renderUsersPDF, renderAchievementsPDF)
    // seguindo o mesmo padrão
}

export default ReportGenerator; 