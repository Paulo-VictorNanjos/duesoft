export const getIndex = async (req, res) => {
    try {
        const landing = await LandingPage.findOne();
        res.render('landing/index', { 
            landing,
            layout: 'landing' // se você estiver usando layouts
        });
    } catch (error) {
        console.error('Erro ao carregar landing page:', error);
        res.render('landing/index', { 
            landing: null,
            layout: 'landing'
        });
    }
}; 