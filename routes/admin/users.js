router.put('/:id', auth, isAdmin, upload.single('profilePicture'), async (req, res) => {
    try {
        console.log('Dados recebidos:', req.body);
        console.log('Arquivo:', req.file);
        
        const updates = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            isAdmin: req.body.isAdmin === 'on'
        };

        if (req.file) {
            updates.profilePicture = `/uploads/${req.file.filename}`;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        );

        req.flash('success', 'Usuário atualizado com sucesso');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        req.flash('error', 'Erro ao atualizar usuário');
        res.redirect(`/admin/users/${req.params.id}/edit`);
    }
}); 