import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Company from '../models/Company.js';
import https from 'https';
import Logger from './logger.js';

class CertificateGenerator {
  constructor(user, course) {
    Logger.debug('Iniciando gerador de certificado', {
      user: user.email,
      course: course.title
    });
    this.user = user;
    this.course = course;
    this.company = null;
    this.outputDir = 'public/certificates';
    this.tempDir = 'tmp/images';
    
    // Criar diretórios necessários
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async downloadImage(url) {
    Logger.debug('Baixando imagem', { url });
    const fileName = path.join(this.tempDir, `${Date.now()}-${Math.random().toString(36).substring(7)}.png`);
    
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        Logger.debug('Status download imagem', { status: response.statusCode });
        const fileStream = fs.createWriteStream(fileName);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          Logger.debug('Download concluído', { fileName });
          resolve(fileName);
        });
        
        fileStream.on('error', (err) => {
          console.error('Erro no download:', err);
          fs.unlink(fileName, () => reject(err));
        });
      }).on('error', (err) => {
        console.error('Erro na requisição:', err);
        reject(err);
      });
    });
  }

  async generate() {
    try {
      Logger.debug('Gerando certificado');
      this.company = await Company.findById(this.course.company);
      const fileName = `certificate-${this.user._id}-${this.course._id}.pdf`;
      const filePath = path.join(this.outputDir, fileName);

      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4'
      });

      const stream = fs.createWriteStream(filePath);
      
      // Criar uma Promise para aguardar o stream terminar
      const streamFinished = new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      doc.pipe(stream);

      // Adicionar background se existir
      if (this.company.certificate?.background) {
        const backgroundPath = await this.downloadImage(this.company.certificate.background);
        doc.image(backgroundPath, 0, 0, {
          width: doc.page.width,
          height: doc.page.height
        });
        fs.unlink(backgroundPath, (err) => {
          if (err) Logger.error('Erro ao deletar imagem temporária:', err);
        });
      }

      await this.addHeader(doc);
      await this.addContent(doc);
      await this.addFooter(doc);

      doc.end();
      
      // Aguardar o stream terminar antes de retornar
      await streamFinished;
      
      // Verificar se o arquivo foi criado corretamente
      if (!fs.existsSync(filePath)) {
        throw new Error('PDF não foi gerado corretamente');
      }
      
      // Verificar o tamanho do arquivo
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error('PDF gerado está vazio');
      }

      Logger.info('Certificado gerado com sucesso', { filePath });
      
      return {
        path: `/certificates/${fileName}`,
        fileName: fileName
      };

    } catch (error) {
      Logger.error('Erro na geração do certificado', error);
      throw error;
    }
  }

  async addHeader(doc) {
    if (this.company?.certificate?.logo) {
      const logoPath = await this.downloadImage(this.company.certificate.logo);
      doc.image(logoPath, 30, 30, {
        width: 100
      });
      fs.unlink(logoPath, (err) => {
        if (err) console.error('Erro ao deletar logo temporária:', err);
      });
    }

    if (!this.company?.certificate?.background) {
      doc
        .fillColor('#1a1a1a')
        .rect(0, 0, doc.page.width, doc.page.height)
        .fill()
        
        .lineWidth(3)
        .strokeColor('#4CAF50')
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .stroke();
    }

    doc
      .fillColor('#fff')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(this.company?.name || 'ada', doc.page.width / 2 - 30, 100, {
        align: 'center'
      })
      
      .fontSize(20)
      .text(this.company?.certificate?.title || 'CERTIFICADO CURSO DIGITAL', 0, 140, {
        align: 'center'
      });
  }

  async addContent(doc) {
    const completionDate = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long'
    });

    // Configurar layout
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Cores
    const textColor = this.company?.certificate?.background ? '#000' : '#fff';
    const titleColor = this.company?.certificate?.background ? '#000' : '#4CAF50';

    // Título principal
    doc
      .fillColor(titleColor)
      .fontSize(36)
      .font('Helvetica-Bold')
      .text(this.company?.certificate?.title || 'Certificado de Conclusão', {
        align: 'center',
        continued: false
      });

    // Subtítulo
    doc
      .moveDown(1)
      .fillColor(textColor)
      .fontSize(18)
      .font('Helvetica')
      .text(this.company?.certificate?.subtitle || 'Este certificado é conferido a', {
        align: 'center',
        continued: false
      });

    // Nome do aluno
    doc
      .moveDown(1)
      .fontSize(48)
      .font('Helvetica-Bold')
      .text(this.user.name, {
        align: 'center',
        continued: false
      });

    // Descrição do curso
    doc
      .moveDown(1.5)
      .fontSize(16)
      .font('Helvetica')
      .text(
        this.company?.certificate?.description?.replace('{courseName}', this.course.title)
          .replace('{hours}', this.calculateDuration().toFixed(1)) || 
        `pela conclusão do curso ${this.course.title} com carga horária de ${this.calculateDuration().toFixed(1)} horas`, {
        align: 'center',
        continued: false
      });

    // Data
    doc
      .moveDown(2)
      .fontSize(14)
      .text(completionDate, {
        align: 'center'
      });

    // Assinatura
    if (this.company?.certificate?.signature?.image) {
      const signaturePath = await this.downloadImage(this.company.certificate.signature.image);
      const signatureWidth = 200;
      const signatureX = (pageWidth - signatureWidth) / 2;
      const signatureY = pageHeight - 180;

      doc.image(signaturePath, signatureX, signatureY, {
        width: signatureWidth
      });

      if (this.company.certificate.signature.name) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(this.company.certificate.signature.name, 0, pageHeight - 100, {
            align: 'center'
          })
          .fontSize(12)
          .font('Helvetica')
          .text(this.company.certificate.signature.role || '', 0, pageHeight - 80, {
            align: 'center'
          });
      }

      fs.unlink(signaturePath, (err) => {
        if (err) Logger.error('Erro ao deletar assinatura temporária:', err);
      });
    }
  }

  generateVerificationCode() {
    return `${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
  }

  async addFooter(doc) {
    const verificationCode = this.generateVerificationCode();
    doc
      .fontSize(8)
      .fillColor('#666')
      .font('Helvetica')
      .text(`Código de validação: ${verificationCode}`, 
            doc.page.width - 200, 
            doc.page.height - 30);
  }

  calculateDuration() {
    const totalMinutes = this.course.modules.reduce((total, module) => {
      return total + module.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
    }, 0);
    return totalMinutes / 60; // Converter minutos para horas
  }
}

export default CertificateGenerator;
