export const planFeatures = {
    basic: ['courses', 'exams', 'certificates', 'dashboard'],
    pro: ['courses', 'exams', 'certificates', 'dashboard', 'profile', 'ranking', 'achievements', 'mentoring'],
    enterprise: ['courses', 'exams', 'certificates', 'dashboard', 'profile', 'ranking', 'achievements', 'chat', 'adminPanel', 'mentoring']
};

export const checkPlanAccess = (feature) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.company) {
                return res.redirect('/auth/login');
            }

            const plan = req.user.company.plan || 'basic';
            console.log('Plano atual:', plan);
            console.log('Feature solicitada:', feature);
            console.log('Features disponíveis:', planFeatures[plan]);

            if (!planFeatures[plan].includes(feature)) {
                console.log('Acesso negado à feature:', feature);
                
                // Determinar próximo plano que tem a feature
                const nextPlan = Object.entries(planFeatures).find(([plan, features]) => 
                    features.includes(feature) && plan !== req.user.company.plan
                )?.[0] || 'pro';

                // Renderizar a página de feature não disponível
                return res.render('feature-unavailable', {
                    feature: feature,
                    currentPlan: plan,
                    nextPlan: nextPlan,
                    availableFeatures: planFeatures[plan],
                    nextPlanFeatures: planFeatures[nextPlan],
                    requestedFeature: feature,
                    layout: 'layouts/main' // ou o layout que você usa
                });
            }
            
            next();
        } catch (error) {
            console.error('Erro na verificação de plano:', error);
            res.redirect('/dashboard');
        }
    };
};

export const planLimits = {
    basic: {
        maxCourses: 5,
        maxExams: 5,
        maxMentoringSessions: 0
    },
    pro: {
        maxCourses: Infinity,
        maxExams: Infinity,
        maxMentoringSessions: Infinity
    },
    enterprise: {
        maxCourses: Infinity,
        maxExams: Infinity,
        maxMentoringSessions: Infinity
    }
}; 