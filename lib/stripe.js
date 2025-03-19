import dotenv from 'dotenv';
import Stripe from 'stripe';

// Carregar variáveis de ambiente
dotenv.config();

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

// Debug para ver o que está sendo carregado
console.log('Verificando variáveis:', {
    secretKey: secretKey ? 'Presente' : 'Ausente',
    env: process.env.NODE_ENV,
    path: process.cwd()
});

if (!secretKey?.startsWith('sk_')) {
    throw new Error('Stripe Secret Key não encontrada ou inválida nas variáveis de ambiente');
}

// Configuração apenas com propriedades permitidas
const config = {
    apiVersion: '2023-10-16',
    appInfo: {
        name: 'StudyWob',
        version: '1.0.0',
        url: process.env.DOMAIN
    }
};

export const stripe = new Stripe(secretKey, config); 