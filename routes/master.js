import express from 'express';
import Company from '../models/Company.js';
import upload from '../middlewares/upload.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Middleware para verificar se é um usuário master
const isMasterAdmin = async (req, res, next) => {
    if (!req.user || !req.user.isMaster) {
        console.log('Usuário não é master, redirecionando para dashboard');
        return res.redirect('/dashboard');
    }
    next();
};

// Array de planos disponíveis
const availablePlans = ['basic', 'pro', 'enterprise'];

// Dashboard master - Lista de empresas
router.get('/companies', isMasterAdmin, async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.render('master/companies/index', {
            companies,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        req.flash('error', 'Erro ao carregar empresas');
        res.redirect('/dashboard');
    }
});

// Nova empresa
router.get('/companies/new', isMasterAdmin, async (req, res) => {
    try {
        res.render('master/companies/form', {
            company: {},
            plans: availablePlans
        });
    } catch (error) {
        console.error('Erro ao carregar formulário:', error);
        res.status(500).send('Erro ao carregar formulário');
    }
});

// Criar empresa
router.post('/companies', isMasterAdmin, upload.single('logo'), async (req, res) => {
    try {
        const companyData = {
            name: req.body.name,
            domain: req.body.domain,
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

        await Company.create(companyData);
        req.flash('success', 'Empresa criada com sucesso');
        res.redirect('/master/companies');
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        req.flash('error', 'Erro ao criar empresa: ' + error.message);
        res.redirect('/master/companies/new');
    }
});

// Editar empresa
router.get('/companies/:id/edit', isMasterAdmin, async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).send('Empresa não encontrada');
        }
        
        res.render('master/companies/form', {
            company,
            plans: availablePlans
        });
    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        res.status(500).send('Erro ao carregar empresa');
    }
});

// Atualizar empresa
router.put('/companies/:id', isMasterAdmin, upload.single('logo'), async (req, res) => {
    try {
        console.log('Método PUT recebido');
        console.log('Body:', req.body);
        console.log('File:', req.file);
        
        const companyData = {
            name: req.body.name,
            domain: req.body.domain,
            active: req.body.active === 'true',
            plan: req.body.plan,
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

        // Buscar empresa existente para manter o logo se não houver novo upload
        const existingCompany = await Company.findById(req.params.id);
        
        if (req.file) {
            // Se houver um novo arquivo, atualizar o caminho
            companyData.logo = `/uploads/companies/${req.file.filename}`;
            
            // Opcional: remover logo antigo se existir
            if (existingCompany && existingCompany.logo) {
                const oldLogoPath = path.join('public', existingCompany.logo);
                if (fs.existsSync(oldLogoPath)) {
                    fs.unlinkSync(oldLogoPath);
                }
            }
        } else {
            // Se não houver novo arquivo, manter o logo existente
            companyData.logo = existingCompany.logo;
        }

        const updatedCompany = await Company.findByIdAndUpdate(
            req.params.id,
            companyData,
            { new: true, runValidators: true }
        );

        if (!updatedCompany) {
            throw new Error('Empresa não encontrada');
        }

        req.flash('success', 'Empresa atualizada com sucesso');
        return res.redirect('/master/companies');
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        req.flash('error', 'Erro ao atualizar empresa: ' + error.message);
        return res.redirect(`/master/companies/${req.params.id}/edit`);
    }
});

export default router; 