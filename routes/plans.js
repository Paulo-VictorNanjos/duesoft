// routes/plans.js
import express from 'express';
import { stripe } from '../lib/stripe.js';
import Company from '../models/Company.js';
import { sendActivationEmail } from '../utils/email.js';

const router = express.Router();

// Função para obter URLs completas
function getFullUrl(path) {
    const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://studywob.com.br'
        : 'http://plan.localhost:3008';
    return `${baseUrl}${path}`;
}

router.get('/', (req, res) => {
    res.render('plans/index', {
        layout: 'layouts/landing',
        stripePublicKey: process.env.STRIPE_PUBLIC_KEY
    });
});

router.post('/checkout', async (req, res) => {
    try {
        console.log('Dados recebidos:', req.body);
        const { plan, companyData } = req.body;
        
        // Validar dados obrigatórios
        const requiredFields = ['name', 'email', 'domain', 'cpfCnpj', 'address', 'phone', 'responsible'];
        const missingFields = requiredFields.filter(field => !companyData[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                error: 'Dados incompletos',
                missingFields 
            });
        }

        // Mapear planos para preços
        const prices = {
            'basic': process.env.STRIPE_PRICE_BASIC,
            'pro': process.env.STRIPE_PRICE_PRO,
            'enterprise': process.env.STRIPE_PRICE_ENTERPRISE
        };
        
        const priceId = prices[plan];
        if (!priceId) {
            return res.status(400).json({ error: 'Plano inválido' });
        }

        // Criar ou recuperar cliente
        let customer;
        try {
            const customers = await stripe.customers.list({
                email: companyData.email,
                limit: 1
            });
            
            customer = customers.data[0] || await stripe.customers.create({
                email: companyData.email,
                metadata: {
                    companyName: companyData.name,
                    domain: companyData.domain,
                    responsible: companyData.responsible
                }
            });
        } catch (error) {
            console.error('Erro ao criar/buscar cliente:', error);
            throw error;
        }

        // URLs públicas para checkout
        const successUrl = getFullUrl('/plans/success?session_id={CHECKOUT_SESSION_ID}');
        const cancelUrl = getFullUrl('/plans');

        console.log('URLs de redirecionamento:', {
            success: successUrl,
            cancel: cancelUrl
        });

        // Criar sessão de checkout
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                companyData: JSON.stringify(companyData),
                plan: plan,
                stripeCustomerId: customer.id
            },
            allow_promotion_codes: true,
            billing_address_collection: 'required'
        });

        console.log('Sessão criada:', {
            id: session.id,
            url: session.url
        });

        res.json({ 
            sessionId: session.id,
            sessionUrl: session.url
        });

    } catch (error) {
        console.error('Erro no checkout:', error);
        res.status(500).json({ 
            error: 'Erro ao processar checkout',
            details: error.message 
        });
    }
});

router.get('/success', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
        const companyData = JSON.parse(session.metadata.companyData);

        // Criar empresa com os dados completos
        const company = await Company.create({
            name: companyData.name,
            domain: companyData.domain,
            email: companyData.email,
            cpfCnpj: companyData.cpfCnpj,
            address: companyData.address,
            phone: companyData.phone,
            responsible: companyData.responsible,
            plan: session.metadata.plan,
            active: true,
            theme: {
                primaryColor: '#4f46e5',
                secondaryColor: '#4338ca'
            },
            settings: {
                allowUserRegistration: true,
                requireLicenseApproval: true
            }
        });

        console.log('Empresa criada:', company);

        // Enviar email de boas-vindas
        await sendActivationEmail(companyData.email, {
            companyName: companyData.name,
            responsible: companyData.responsible
        });

        res.render('plans/success', {
            layout: 'layouts/landing',
            company: company
        });
    } catch (error) {
        console.error('Erro no sucesso:', error);
        res.redirect('/plans');
    }
});

export default router;
