import Banner from '../models/Banner.js';
import path from 'path';
import fs from 'fs';

class BannerController {
  async create(req, res) {
    try {
      console.log('Dados recebidos:', req.body);
      console.log('Arquivo recebido:', req.file);
      console.log('ID da empresa:', req.company._id);
      
      if (!req.body.start_date || !req.body.end_date) {
        return res.status(400).json({ error: 'As datas de início e término são obrigatórias' });
      }

      const bannerData = {
        ...req.body,
        company_id: req.company._id,
        image_url: req.file ? `/uploads/${req.file.filename}` : null,
        status: req.body.active === 'true' ? 'active' : 'inactive',
        type: req.body.type || 'default',
        start_date: new Date(req.body.start_date),
        end_date: new Date(req.body.end_date)
      };

      // Se for banner de cabeçalho, não precisa de cores
      if (bannerData.type === 'header') {
        delete bannerData.background_color;
        delete bannerData.text_color;
      } else {
        // Para banners promocionais, mantém as cores padrão
        bannerData.background_color = req.body.background_color || '#000000';
        bannerData.text_color = req.body.text_color || '#FFFFFF';
      }

      console.log('Banner data processada:', bannerData);

      if (!bannerData.image_url) {
        return res.status(400).json({ error: 'A imagem do banner é obrigatória' });
      }

      if (bannerData.start_date > bannerData.end_date) {
        return res.status(400).json({ error: 'A data de início não pode ser posterior à data de término' });
      }

      const banner = await Banner.create(bannerData);
      console.log('Banner criado:', banner);
      
      return res.status(201).json(banner);
    } catch (error) {
      console.error('Erro ao criar banner:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  async list(req, res) {
    try {
      console.log('Buscando banners ativos...'); // Log para debug
      
      // Buscar o banner de cabeçalho ativo mais recente
      const headerBanner = await Banner.findOne({
        company_id: req.company._id,
        type: 'header',
        status: 'active',
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() }
      }).sort({ createdAt: -1 });

      // Buscar os banners promocionais ativos
      const promotionalBanners = await Banner.find({
        company_id: req.company._id,
        type: 'default',
        status: 'active',
        start_date: { $lte: new Date() },
        end_date: { $gte: new Date() }
      }).sort({ createdAt: -1 });

      // Retornar os banners separados por tipo
      return res.json({
        headerBanner,
        promotionalBanners
      });
    } catch (error) {
      console.error('Erro ao listar banners:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      console.log('Dados de atualização recebidos:', req.body); // Log para debug
      console.log('ID do banner:', req.params.id); // Log para debug
      console.log('ID da empresa:', req.company._id); // Log para debug
      
      const updateData = { 
        ...req.body,
        status: req.body.active === 'true' ? 'active' : 'inactive',
        type: req.body.type || 'default',
        background_color: req.body.background_color || '#000000',
        text_color: req.body.text_color || '#FFFFFF'
      };

      // Se houver datas, converter para Date
      if (req.body.start_date) {
        updateData.start_date = new Date(req.body.start_date);
      }
      if (req.body.end_date) {
        updateData.end_date = new Date(req.body.end_date);
      }
      
      if (req.file) {
        updateData.image_url = `/uploads/${req.file.filename}`;
        
        // Deletar imagem antiga
        const oldBanner = await Banner.findById(req.params.id);
        if (oldBanner && oldBanner.image_url) {
          const oldImagePath = path.join('public', oldBanner.image_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }

      console.log('Dados de atualização processados:', updateData); // Log para debug

      const banner = await Banner.findOneAndUpdate(
        { _id: req.params.id, company_id: req.company._id },
        updateData,
        { new: true }
      );

      if (!banner) {
        console.log('Banner não encontrado'); // Log para debug
        return res.status(404).json({ error: 'Banner não encontrado' });
      }

      console.log('Banner atualizado:', banner); // Log para debug
      return res.json(banner);
    } catch (error) {
      console.error('Erro ao atualizar banner:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      console.log('Tentando deletar banner:', req.params.id); // Log para debug
      console.log('ID da empresa:', req.company._id); // Log para debug

      const banner = await Banner.findOne({
        _id: req.params.id,
        company_id: req.company._id
      });

      if (!banner) {
        console.log('Banner não encontrado para deleção'); // Log para debug
        return res.status(404).json({ error: 'Banner não encontrado' });
      }

      // Deletar imagem
      if (banner.image_url) {
        const imagePath = path.join('public', banner.image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await Banner.findByIdAndDelete(req.params.id);
      console.log('Banner deletado com sucesso'); // Log para debug
      return res.json({ message: 'Banner deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar banner:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  async listAdmin(req, res) {
    try {
      console.log('Listando todos os banners para admin...'); // Log para debug
      console.log('ID da empresa:', req.company._id); // Log para debug
      
      const banners = await Banner.find({
        company_id: req.company._id
      }).sort({ createdAt: -1 });

      console.log('Banners encontrados:', banners); // Log para debug
      
      res.render('admin/banners/index', { 
        banners,
        user: req.user,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Erro ao listar banners:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async get(req, res) {
    try {
      console.log('Buscando banner específico:', req.params.id); // Log para debug
      console.log('ID da empresa:', req.company._id); // Log para debug

      const banner = await Banner.findOne({
        _id: req.params.id,
        company_id: req.company._id
      });

      if (!banner) {
        console.log('Banner não encontrado'); // Log para debug
        return res.status(404).json({ error: 'Banner não encontrado' });
      }

      console.log('Banner encontrado:', banner); // Log para debug
      return res.json(banner);
    } catch (error) {
      console.error('Erro ao buscar banner:', error);
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new BannerController(); 