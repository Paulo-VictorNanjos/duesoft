import express from 'express';
import auth from '../../middlewares/auth.js';
import isAdmin from '../../middlewares/admin.js';
import Company from '../../models/Company.js';
import upload from '../../middlewares/upload.js';

const router = express.Router();

// Função auxiliar para gerar URL da empresa
const generateCompanyUrl = (domain) => {
    const baseUrl = process.env.BASE_URL;
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
        return `http://${domain}.${baseUrl}:${process.env.DEV_PORT}`;
    }
    return `https://${domain}.${baseUrl}`; // HTTPS em produção, sem porta
};

// Listar todas as empresas
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.render('admin/companies/index', { 
            companies,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        req.flash('error', 'Erro ao carregar empresas');
        res.redirect('/admin/dashboard');
    }
});

// Formulário para nova empresa
router.get('/new', auth, isAdmin, (req, res) => {
    res.render('admin/companies/form', { 
        company: {},
        plans: ['basic', 'pro', 'enterprise']
    });
});

// Criar empresa
router.post('/', auth, isAdmin, upload.single('logo'), async (req, res) => {
    try {
        console.log('Iniciando criação de empresa');
        
        const domain = req.body.domain
            .toLowerCase()
            .trim()
            .replace(/^https?:\/\//, '')    
            .replace(/:\d+/, '')           
            .replace(/\/$/, '')            
            .split('.')[0];                
        
        console.log('Domínio formatado:', domain);
        
        const existingCompany = await Company.findOne({ domain });
        if (existingCompany) {
            console.log('Domínio já existe:', domain);
            req.flash('error', 'Este domínio já está em uso');
            return res.redirect('/admin/companies/new');
        }

        const companyData = {
            name: req.body.name,
            domain: domain,
            active: req.body.active === 'true',
            plan: req.body.plan || 'basic',
            theme: {
                primaryColor: req.body.primaryColor || '#4f46e5',
                secondaryColor: req.body.secondaryColor || '#4338ca'
            },
            settings: {
                allowUserRegistration: req.body.allowUserRegistration === 'true',
                requireLicenseApproval: req.body.requireLicenseApproval === 'true'
            },
            cpfCnpj: req.body.cpfCnpj,
            address: req.body.address,
            phone: req.body.phone,
            email: req.body.email,
            responsible: req.body.responsible
        };

        if (req.file) {
            companyData.logo = `/uploads/companies/${req.file.filename}`;
        }

        const newCompany = await Company.create(companyData);
        console.log('Empresa criada com sucesso:', newCompany);

        const companyUrl = generateCompanyUrl(domain);
        console.log('URL da empresa:', companyUrl);

        req.flash('success', `Empresa criada com sucesso. Acesse: ${companyUrl}`);
        res.redirect('/admin/companies');
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        req.flash('error', 'Erro ao criar empresa: ' + error.message);
        res.redirect('/admin/companies/new');
    }
});

// Formulário para editar empresa
router.get('/:id/edit', auth, isAdmin, async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            req.flash('error', 'Empresa não encontrada');
            return res.redirect('/admin/companies');
        }
        res.render('admin/companies/form', { 
            company,
            plans: ['basic', 'pro', 'enterprise']
        });
    } catch (error) {
        req.flash('error', 'Erro ao carregar empresa');
        res.redirect('/admin/companies');
    }
});

// Atualizar empresa
router.put('/:id', auth, isAdmin, upload.single('logo'), async (req, res) => {
    try {
        const domain = req.body.domain
            .toLowerCase()
            .trim()
            .replace(/^https?:\/\//, '')
            .replace(/:\d+/, '')
            .replace(/\/$/, '')
            .split('.')[0];

        const existingCompany = await Company.findOne({ 
            domain, 
            _id: { $ne: req.params.id } 
        });
        
        if (existingCompany) {
            req.flash('error', 'Este domínio já está em uso');
            return res.redirect(`/admin/companies/${req.params.id}/edit`);
        }

        const companyData = {
            name: req.body.name,
            domain: domain,
            active: req.body.active === 'true',
            plan: req.body.plan,
            theme: {
                primaryColor: req.body.primaryColor,
                secondaryColor: req.body.secondaryColor
            },
            settings: {
                allowUserRegistration: req.body.allowUserRegistration === 'true',
                requireLicenseApproval: req.body.requireLicenseApproval === 'true'
            },
            cpfCnpj: req.body.cpfCnpj,
            address: req.body.address,
            phone: req.body.phone,
            email: req.body.email,
            responsible: req.body.responsible
        };

        if (req.file) {
            companyData.logo = `/uploads/companies/${req.file.filename}`;
        }

        await Company.findByIdAndUpdate(req.params.id, companyData);
        const companyUrl = generateCompanyUrl(domain);

        req.flash('success', `Empresa atualizada com sucesso. Acesse: ${companyUrl}`);
        res.redirect('/admin/companies');
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        req.flash('error', 'Erro ao atualizar empresa: ' + error.message);
        res.redirect(`/admin/companies/${req.params.id}/edit`);
    }
});

// Ativar/Desativar empresa
router.patch('/:id/toggle-status', auth, isAdmin, async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        company.active = !company.active;
        await company.save();
        
        req.flash('success', `Empresa ${company.active ? 'ativada' : 'desativada'} com sucesso`);
        res.redirect('/admin/companies');
    } catch (error) {
        req.flash('error', 'Erro ao alterar status da empresa');
        res.redirect('/admin/companies');
    }
});

export default router; 