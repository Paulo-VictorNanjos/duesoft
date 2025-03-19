import Mentor from '../models/Mentor.js';

const isMentor = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({
            user: req.user._id,
            company: req.company._id,
            active: true,
            verified: true
        });

        if (!mentor) {
            req.flash('error', 'Acesso permitido apenas para mentores');
            return res.redirect('/dashboard');
        }

        req.mentor = mentor; // Disponibiliza os dados do mentor para a rota
        next();
    } catch (error) {
        console.error('Erro ao verificar mentor:', error);
        req.flash('error', 'Erro ao verificar permissões');
        res.redirect('/dashboard');
    }
};

export default isMentor; 