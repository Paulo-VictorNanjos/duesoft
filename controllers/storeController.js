import VirtualCurrency from '../models/VirtualCurrency.js';
import VirtualWallet from '../models/VirtualWallet.js';
import StoreItem from '../models/StoreItem.js';
import StoreOrder from '../models/StoreOrder.js';

// Listar itens da loja
export const listItems = async (req, res) => {
    try {
        const items = await StoreItem.find({ company: req.company._id, isActive: true });
        const currency = await VirtualCurrency.findOne({ company: req.company._id });
        
        if (!currency) {
            return res.status(404).json({ success: false, error: 'Moeda virtual não configurada' });
        }
        
        res.json({ success: true, items, currency });
        
    } catch (error) {
        console.error('Erro ao listar itens da loja:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar itens' });
    }
};

// Adicionar item à loja (admin)
export const addItem = async (req, res) => {
    try {
        const { name, description, price, stock } = req.body;
        const active = req.body.active === 'on' || req.body.active === true;
        
        // Criar o item com a imagem
        const item = await StoreItem.create({
            company: req.company._id,
            name,
            description,
            price,
            stock,
            active,
            image: req.file ? `/uploads/store/${req.file.filename}` : null
        });
        
        res.json({ success: true, item });
        
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        res.status(500).json({ success: false, error: 'Erro ao adicionar item' });
    }
};

// Comprar item
export const purchaseItem = async (req, res) => {
    try {
        console.log('=== PROCESSANDO COMPRA ===');
        console.log('Dados recebidos:', req.body);
        
        const { itemId, quantity = 1 } = req.body;
        
        console.log('Buscando item e carteira:', {
            itemId,
            quantity,
            userId: req.user._id,
            companyId: req.company._id
        });
        
        // Buscar item e carteira
        const [item, wallet] = await Promise.all([
            StoreItem.findOne({ 
                _id: itemId, 
                company: req.company._id, 
                active: true 
            }),
            VirtualWallet.findOne({ 
                user: req.user._id, 
                company: req.company._id 
            })
        ]);
        
        console.log('Resultados da busca:', {
            itemEncontrado: !!item,
            carteiraEncontrada: !!wallet,
            item,
            saldoCarteira: wallet?.balance
        });
        
        if (!item) {
            console.log('Item não encontrado ou inativo');
            return res.status(404).json({ success: false, error: 'Item não encontrado' });
        }
        
        if (!wallet) {
            console.log('Carteira não encontrada');
            return res.status(404).json({ success: false, error: 'Carteira não encontrada' });
        }
        
        // Verificar estoque
        if (item.stock < quantity) {
            console.log('Estoque insuficiente:', {
                estoqueDisponivel: item.stock,
                quantidadeSolicitada: quantity
            });
            return res.status(400).json({ success: false, error: 'Estoque insuficiente' });
        }

        // Calcular valor total
        const totalAmount = item.price * quantity;
        console.log('Valor total da compra:', totalAmount);
        
        // Verificar saldo
        if (wallet.balance < totalAmount) {
            console.log('Saldo insuficiente:', {
                saldo: wallet.balance,
                valorCompra: totalAmount
            });
            return res.status(400).json({ success: false, error: 'Saldo insuficiente' });
        }
        
        // Criar ordem
        console.log('Criando ordem de compra');
        const order = await StoreOrder.create({
            company: req.company._id,
            user: req.user._id,
            item: itemId,
            quantity,
            totalAmount,
            status: 'pending',
            deliveryStatus: 'awaiting_approval',
            deliveryDetails: {
                requestedAt: new Date(),
                notes: req.body.notes || ''
            }
        });
        
        console.log('Ordem criada:', order);
        
        // Atualizar estoque
        await StoreItem.findByIdAndUpdate(itemId, {
            $inc: { stock: -quantity }
        });
        
        // Adicionar transação na carteira
        console.log('Adicionando transação na carteira');
        await wallet.addTransaction(
            'DEBIT',
            totalAmount,
            'STORE',
            `Compra: ${item.name} (${quantity}x)`,
            { orderId: order._id }
        );
        
        console.log('Transação adicionada com sucesso');
        
        res.json({ 
            success: true, 
            order,
            newBalance: wallet.balance
        });
        
    } catch (error) {
        console.error('Erro ao processar compra:', error);
        res.status(500).json({ success: false, error: 'Erro ao processar compra' });
    }
};

// Listar pedidos do usuário
export const listOrders = async (req, res) => {
    try {
        const orders = await StoreOrder.find({ 
            user: req.user._id,
            company: req.company._id 
        })
        .populate('item')
        .sort('-createdAt');
        
        res.json({ success: true, orders });
        
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ success: false, error: 'Erro ao listar pedidos' });
    }
};

// Atualizar status do pedido (admin)
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, deliveryStatus, notes } = req.body;

        const order = await StoreOrder.findOne({
            _id: orderId,
            company: req.company._id
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
        }

        // Atualizar status
        if (status) order.status = status;
        if (deliveryStatus) {
            order.deliveryStatus = deliveryStatus;
            order.deliveryDetails.updatedAt = new Date();
            if (notes) order.deliveryDetails.notes = notes;
        }

        await order.save();

        res.json({ success: true, order });

    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({ success: false, error: 'Erro ao atualizar status' });
    }
};

// Página de gerenciamento de pedidos (admin)
export const ordersManagement = async (req, res) => {
    try {
        const orders = await StoreOrder.find({ company: req.company._id })
            .populate('user', 'name email')
            .populate('item', 'name price image')
            .sort('-createdAt');

        res.render('admin/store/orders', {
            orders,
            success: req.flash('success'),
            error: req.flash('error')
        });

    } catch (error) {
        console.error('Erro ao carregar página de pedidos:', error);
        req.flash('error', 'Erro ao carregar página de pedidos');
        res.redirect('/admin/store');
    }
};

// Estatísticas da loja (admin)
export const getStats = async (req, res) => {
    try {
        const [totalOrders, totalRevenue, popularItems] = await Promise.all([
            StoreOrder.countDocuments({ company: req.company._id }),
            StoreOrder.aggregate([
                { $match: { company: req.company._id } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            StoreOrder.aggregate([
                { $match: { company: req.company._id } },
                { $group: { 
                    _id: '$item',
                    totalSold: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$totalAmount' }
                }},
                { $sort: { totalSold: -1 } },
                { $limit: 5 }
            ])
        ]);
        
        res.json({
            success: true,
            stats: {
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                popularItems
            }
        });
        
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
    }
};

// Página de administração da loja
export const admin = async (req, res) => {
    try {
        const [items, orders, stats] = await Promise.all([
            StoreItem.find({ company: req.company._id }).sort('-createdAt'),
            StoreOrder.find({ company: req.company._id })
                .populate('user', 'name email')
                .populate('item', 'name price')
                .sort('-createdAt')
                .limit(10),
            StoreOrder.aggregate([
                { $match: { company: req.company._id } },
                { $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    avgOrderValue: { $avg: '$totalAmount' }
                }}
            ])
        ]);

        const currency = req.virtualCurrency;
        
        res.render('admin/store/index', {
            items,
            orders,
            stats: stats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
            currency,
            success: req.flash('success'),
            error: req.flash('error')
        });
        
    } catch (error) {
        console.error('Erro ao carregar página da loja:', error);
        req.flash('error', 'Erro ao carregar página da loja');
        res.redirect('/admin');
    }
};

// Atualizar item (admin)
export const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, active } = req.body;
        
        console.log('Dados recebidos na atualização:', {
            id,
            name,
            description,
            price,
            stock,
            active,
            body: req.body
        });
        
        const item = await StoreItem.findOne({ 
            _id: id, 
            company: req.company._id 
        });
        
        if (!item) {
            console.log('Item não encontrado:', id);
            return res.status(404).json({ 
                success: false, 
                error: 'Item não encontrado' 
            });
        }
        
        console.log('Item antes da atualização:', {
            id: item._id,
            name: item.name,
            active: item.active
        });
        
        // Atualizar campos
        item.name = name;
        item.description = description;
        item.price = price;
        item.stock = stock;
        item.active = active === 'true' || active === true || active === 'on';
        
        // Se houver nova imagem
        if (req.file) {
            item.image = `/uploads/store/${req.file.filename}`;
        }
        
        console.log('Item após atualização (antes de salvar):', {
            id: item._id,
            name: item.name,
            active: item.active
        });
        
        await item.save();
        
        console.log('Item salvo com sucesso:', {
            id: item._id,
            name: item.name,
            active: item.active
        });
        
        res.json({ 
            success: true, 
            item 
        });
        
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar item' 
        });
    }
};

// Deletar item (admin)
export const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const item = await StoreItem.findOne({ 
            _id: id, 
            company: req.company._id 
        });
        
        if (!item) {
            return res.status(404).json({ 
                success: false, 
                error: 'Item não encontrado' 
            });
        }
        
        await item.deleteOne();
        
        res.json({ 
            success: true, 
            message: 'Item excluído com sucesso' 
        });
        
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao excluir item' 
        });
    }
};

// Buscar item por ID (admin)
export const getItem = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('=== BUSCANDO ITEM ===');
        console.log('ID recebido:', id);
        console.log('Company ID:', req.company._id);
        
        // Buscar o item e a moeda virtual
        const [item, currency] = await Promise.all([
            StoreItem.findOne({ 
                _id: id, 
                company: req.company._id,
                active: true 
            }),
            VirtualCurrency.findOne({ company: req.company._id })
        ]);
        
        console.log('Item encontrado:', item);
        console.log('Moeda encontrada:', currency);
        
        if (!item) {
            console.log('Item não encontrado no banco de dados');
            return res.status(404).json({ 
                success: false, 
                error: 'Item não encontrado' 
            });
        }
        
        if (!currency) {
            console.log('Moeda virtual não configurada');
            return res.status(404).json({ 
                success: false, 
                error: 'Moeda virtual não configurada' 
            });
        }
        
        // Buscar carteira do usuário para verificar saldo
        const wallet = await VirtualWallet.findOne({ 
            user: req.user._id,
            company: req.company._id 
        });
        
        console.log('Carteira encontrada:', {
            userId: req.user._id,
            companyId: req.company._id,
            hasWallet: !!wallet,
            balance: wallet ? wallet.balance : 0
        });
        
        res.json({
            success: true,
            item,
            currency,
            userBalance: wallet ? wallet.balance : 0
        });
        
    } catch (error) {
        console.error('Erro ao carregar detalhes do item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao carregar detalhes do item' 
        });
    }
};

// Página da loja para usuários
export const storePage = async (req, res) => {
    try {
        console.log('=== CARREGANDO LOJA ===');

        // Buscar carteira do usuário
        const wallet = await VirtualWallet.findOne({
            user: req.user._id,
            company: req.company._id
        });

        // Buscar moeda virtual
        const currency = await VirtualCurrency.findOne({
            company: req.company._id
        });

        // Buscar itens da loja
        const items = await StoreItem.find({
            company: req.company._id,
            active: true
        }).sort({ createdAt: -1 });

        // Extrair categorias únicas
        const categories = [...new Set(items.map(item => item.category))];

        console.log('Dados carregados:', {
            hasWallet: !!wallet,
            hasCurrency: !!currency,
            itemsCount: items.length,
            categories
        });

        res.render('store/index', {
            title: 'Loja Virtual',
            wallet,
            currency,
            items,
            categories,
            user: req.user
        });

    } catch (error) {
        console.error('Erro ao carregar loja:', error);
        req.flash('error', 'Erro ao carregar loja');
        res.redirect('/dashboard');
    }
};

// Buscar detalhes do pedido
export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        const order = await StoreOrder.findOne({
            _id: id,
            company: req.company._id
        })
        .populate('user', 'name email')
        .populate('item', 'name price image');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'Pedido não encontrado' 
            });
        }

        res.json({ success: true, order });

    } catch (error) {
        console.error('Erro ao buscar detalhes do pedido:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar detalhes do pedido' 
        });
    }
}; 