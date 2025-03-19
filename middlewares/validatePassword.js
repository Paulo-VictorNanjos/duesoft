export const validatePassword = (req, res, next) => {
    const { password } = req.body;
    
    // Pelo menos 8 caracteres
    if (password.length < 8) {
        req.flash('error', 'A senha deve ter pelo menos 8 caracteres');
        return res.redirect('back');
    }
    
    // Deve conter números
    if (!/\d/.test(password)) {
        req.flash('error', 'A senha deve conter pelo menos um número');
        return res.redirect('back');
    }
    
    // Deve conter letras maiúsculas e minúsculas
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
        req.flash('error', 'A senha deve conter letras maiúsculas e minúsculas');
        return res.redirect('back');
    }
    
    // Deve conter caracteres especiais
    if (!/[!@#$%^&*]/.test(password)) {
        req.flash('error', 'A senha deve conter pelo menos um caractere especial');
        return res.redirect('back');
    }
    
    next();
}; 