import AiKnowledge from '../models/aiKnowledge.js';
import AiChat from '../models/aiChat.js';
import mistralService from '../services/mistralService.js';

// Upload de novo conhecimento
export const uploadKnowledge = async (req, res) => {
    try {
        const { title, content, category } = req.body;
        
        // Processa o documento e gera embeddings
        const processedChunks = await mistralService.processDocument(content);
        
        // Salva cada chunk como um documento separado
        const savedDocs = await Promise.all(processedChunks.map(chunk => {
            const knowledge = new AiKnowledge({
                company: req.company._id,
                title,
                content: chunk.content,
                category,
                embeddings: chunk.embedding,
                metadata: {
                    sourceType: 'document',
                    createdBy: req.user._id
                }
            });
            return knowledge.save();
        }));

        res.status(201).json({ 
            success: true, 
            message: 'Conhecimento adicionado com sucesso',
            count: savedDocs.length 
        });
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Fazer uma pergunta
export const askQuestion = async (req, res) => {
    try {
        const { question } = req.body;
        
        // Gera embedding para a pergunta
        const questionEmbedding = await mistralService.generateEmbeddings(question);
        
        // Busca conhecimento relevante
        const relevantKnowledge = await AiKnowledge.find({
            company: req.company._id,
            active: true
        }).limit(3);  // Ajuste este limite conforme necessário

        // Concatena o conhecimento relevante para contexto
        const context = relevantKnowledge.map(k => k.content).join('\n\n');
        
        // Obtém resposta do Mistral
        const response = await mistralService.getResponse(question, context);

        // Salva a conversa
        await AiChat.findOneAndUpdate(
            { 
                user: req.user._id, 
                company: req.company._id,
                active: true 
            },
            {
                $push: {
                    conversation: {
                        role: 'user',
                        content: question,
                        timestamp: new Date(),
                        sources: relevantKnowledge.map(k => ({
                            knowledgeId: k._id,
                            relevance: 1
                        }))
                    }
                }
            },
            { upsert: true, new: true }
        );

        // Retorna a resposta com as fontes
        res.json({ 
            success: true, 
            response,
            sources: relevantKnowledge.map(k => ({
                title: k.title,
                preview: k.content.substring(0, 200) + '...'
            }))
        });
    } catch (error) {
        console.error('Erro ao processar pergunta:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Listar histórico de conversas
export const getChatHistory = async (req, res) => {
    try {
        const chats = await AiChat.find({
            user: req.user._id,
            company: req.company._id,
            active: true
        })
        .sort('-updatedAt')
        .limit(10);

        res.json({ success: true, chats });
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Dar feedback em uma resposta
export const provideFeedback = async (req, res) => {
    try {
        const { chatId, messageIndex, helpful, reason } = req.body;

        const chat = await AiChat.findOne({
            _id: chatId,
            user: req.user._id,
            company: req.company._id
        });

        if (!chat) {
            return res.status(404).json({ 
                success: false, 
                error: 'Chat não encontrado' 
            });
        }

        chat.conversation[messageIndex].feedback = { helpful, reason };
        await chat.save();

        res.json({ success: true, message: 'Feedback registrado com sucesso' });
    } catch (error) {
        console.error('Erro ao registrar feedback:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}; 