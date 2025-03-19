import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

const isProd = process.env.NODE_ENV === 'production';

// Configuração CSP permissiva para desenvolvimento
const permissiveCSP = {
    directives: {
        defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
        scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https:",
            "http:",
            "blob:"
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"],
        fontSrc: ["'self'", "data:", "https:", "http:"],
        objectSrc: ["'self'", "data:", "https:", "http:"],
        mediaSrc: ["'self'", "data:", "https:", "http:"],
        frameSrc: ["'self'", "https:", "http:", "localhost:*", "*"],
        frameAncestors: ["'self'", "http://localhost:*", "https://localhost:*", "*"],
        formAction: ["'self'", "https:", "http:"],
        workerSrc: ["'self'", "blob:"]
    }
};

// Configuração CSP mais restritiva para produção
const strictCSP = {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "localhost:*", "*"],
        frameAncestors: ["'self'", "http://localhost:*", "https://localhost:*", "*"],
        upgradeInsecureRequests: []
    }
};

const securityMiddleware = {
    // Configuração do Helmet
    helmet: helmet({
        contentSecurityPolicy: isProd ? strictCSP : permissiveCSP,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: true,
        dnsPrefetchControl: false,
        referrerPolicy: { policy: "no-referrer" },
        strictTransportSecurity: false, // Desabilitar em desenvolvimento
        xssFilter: true,
        noSniff: false, // Permitir sniffing de MIME type
        frameSrc: ["'self'", "https:", "http:", "*"],
        frameAncestors: ["'self'", "https:", "http:", "*"],
        sandbox: [
            'allow-forms', 
            'allow-scripts', 
            'allow-same-origin', 
            'allow-popups', 
            'allow-popups-to-escape-sandbox',
            'allow-modals', 
            'allow-downloads',
            'allow-presentation',
            'allow-orientation-lock'
        ]
    }),

    // Rate Limiter mais permissivo
    rateLimiter: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000, // Aumentado para 1000 requisições
        message: 'Muitas requisições deste IP, tente novamente mais tarde.'
    }),

    // Login Limiter
    loginLimiter: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5, // 5 tentativas
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true // Não conta logins bem-sucedidos
    }),

    // Cookie Consent
    cookieConsent: (req, res, next) => {
        if (!req.cookies.cookieConsent && !req.path.startsWith('/legal')) {
            res.locals.showCookieConsent = true;
        } else {
            res.locals.showCookieConsent = false;
        }
        next();
    }
};

export default securityMiddleware; 