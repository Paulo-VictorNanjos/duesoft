import News from '../models/News.js';
import path from 'path';
import fs from 'fs';

class NewsController {
  async create(req, res) {
    try {
      console.log('Dados recebidos:', req.body);
      console.log('Arquivo recebido:', req.file);

      const newsData = {
        ...req.body,
        company_id: req.company.id,
        image_url: req.file ? `/uploads/${req.file.filename}` : null,
        status: req.body.active === 'true' ? 'active' : 'inactive',
        type: req.body.type || 'event',
        event_date: req.body.date ? new Date(req.body.date) : new Date(),
        time: req.body.time || '19:00',
        description: req.body.description || '',
        content: req.body.content || req.body.description || ''
      };

      if (!newsData.title) {
        return res.status(400).json({ error: 'O título é obrigatório' });
      }

      if (!newsData.description) {
        return res.status(400).json({ error: 'A descrição é obrigatória' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'A imagem é obrigatória' });
      }

      console.log('Dados processados:', newsData);

      const news = await News.create(newsData);
      return res.status(201).json(news);
    } catch (error) {
      console.error('Erro ao criar novidade:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  async list(req, res) {
    try {
      const { type, page = 1, limit = 10 } = req.query;
      const query = {
        company_id: req.company.id,
        status: 'active'
      };

      if (type) {
        query.type = type;
      }

      const news = await News.find(query)
        .sort({ event_date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await News.countDocuments(query);

      return res.json({
        news,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const updateData = { 
        ...req.body,
        status: req.body.active === 'true' ? 'active' : 'inactive',
        type: req.body.type || 'event',
        event_date: req.body.date ? new Date(req.body.date) : new Date(),
        description: req.body.description || '',
        content: req.body.content || req.body.description || ''
      };
      
      if (req.file) {
        updateData.image_url = `/uploads/${req.file.filename}`;
        
        // Deletar imagem antiga
        const oldNews = await News.findById(req.params.id);
        if (oldNews && oldNews.image_url) {
          const oldImagePath = path.join('public', oldNews.image_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }

      const news = await News.findOneAndUpdate(
        { _id: req.params.id, company_id: req.company.id },
        updateData,
        { new: true }
      );

      if (!news) {
        return res.status(404).json({ error: 'Novidade não encontrada' });
      }
      return res.json(news);
    } catch (error) {
      console.error('Erro ao atualizar novidade:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const news = await News.findOne({
        _id: req.params.id,
        company_id: req.company.id
      });

      if (!news) {
        return res.status(404).json({ error: 'News not found' });
      }

      // Deletar imagem
      if (news.image_url) {
        const imagePath = path.join('public', news.image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await news.remove();
      return res.json({ message: 'News deleted successfully' });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async listAdmin(req, res) {
    try {
      const { type, page = 1, limit = 10 } = req.query;
      const query = { company_id: req.company.id };

      if (type) {
        query.type = type;
      }

      const news = await News.find(query)
        .sort({ event_date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await News.countDocuments(query);

      res.render('admin/news/index', { 
        news,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      });
    } catch (error) {
      console.error('Error loading news:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async get(req, res) {
    try {
      const news = await News.findOne({
        _id: req.params.id,
        company_id: req.company.id
      });

      if (!news) {
        return res.status(404).json({ error: 'Notícia não encontrada' });
      }

      return res.json(news);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new NewsController(); 