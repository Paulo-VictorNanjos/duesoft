import express from 'express';
const router = express.Router();

router.get('/privacy-policy', (req, res) => {
    res.render('legal/privacy-policy', { layout: false });
});

router.get('/terms-of-service', (req, res) => {
    res.render('legal/terms-of-service', { layout: false });
});

router.get('/faq', (req, res) => {
    res.render('legal/faq', { layout: false });
});

router.get('/help', (req, res) => {
    res.render('legal/help', { layout: false });
});

router.get('/cookie-policy', (req, res) => {
    res.render('legal/cookie-policy', {
        company: req.company,
        layout: 'layouts/main'
    });
});

export default router; 