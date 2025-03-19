import MistralClient from '@mistralai/mistralai';

// Verificar o que o pacote está exportando
console.log('Conteúdo do pacote Mistral:', MistralClient);

class MistralService {
    constructor() {
        console.log('Inicializando MistralService...');
        const apiKey = process.env.MISTRAL_API_KEY;
        console.log('API Key:', apiKey ? 'Presente' : 'Ausente');
        
        // Inicialização do cliente com a API key como string
        this.client = new MistralClient(apiKey);
        
        // Log para debug da API key
        console.log('API Key sendo usada:', apiKey);
        
        // Log detalhado do cliente
        console.log('=== DETALHES DO CLIENTE MISTRAL ===');
        console.log('Tipo do cliente:', typeof this.client);
        console.log('Cliente é uma instância de MistralClient:', this.client instanceof MistralClient);
        console.log('Métodos do cliente:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.client)));
        console.log('Propriedades do cliente:', Object.keys(this.client));
        
        // Log específico do embeddings
        console.log('=== DETALHES DO EMBEDDINGS ===');
        console.log('Tipo do embeddings:', typeof this.client.embeddings);
        console.log('Propriedades do embeddings:', this.client.embeddings ? Object.keys(this.client.embeddings) : 'undefined');
        
        // Log do objeto MistralClient importado
        console.log('=== DETALHES DA IMPORTAÇÃO ===');
        console.log('MistralClient importado:', MistralClient);
        console.log('Propriedades do MistralClient:', Object.keys(MistralClient));
        console.log('Prototype do MistralClient:', Object.keys(MistralClient.prototype || {}));
    }

    async generateEmbeddings(text) {
        try {
            console.log('Tentando gerar embeddings para:', text);
            
            const response = await this.client.embeddings({
                model: "mistral-embed",
                input: text
            });
            
            console.log('Resposta do embedding:', response);
            
            if (!response?.data?.[0]?.embedding) {
                console.error('Resposta completa:', JSON.stringify(response, null, 2));
                throw new Error('Resposta inválida do serviço de embeddings');
            }
            
            return response.data[0].embedding;
        } catch (error) {
            console.error('Erro ao gerar embeddings:', error.message);
            if (error.response) {
                console.error('Detalhes do erro:', error.response.data);
                console.error('Status:', error.response.status);
                console.error('Headers:', error.response.headers);
            }
            throw error;
        }
    }

    async getResponse(prompt, context) {
        try {
            const messages = [
                {
                    role: "system",
                    content: `Você é um assistente útil e amigável. Use o seguinte contexto para responder à pergunta do usuário:\n\n${context}`
                },
                {
                    role: "user",
                    content: prompt
                }
            ];

            const response = await this.client.chat({
                model: "mistral-tiny",
                messages: messages
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Erro ao obter resposta:', error);
            throw error;
        }
    }

    async processDocument(content) {
        try {
            const chunks = this.splitContent(content);
            const processedChunks = [];

            for (const chunk of chunks) {
                const embedding = await this.generateEmbeddings(chunk);
                processedChunks.push({
                    content: chunk,
                    embedding
                });
            }

            return processedChunks;
        } catch (error) {
            console.error('Erro ao processar documento:', error);
            throw error;
        }
    }

    splitContent(content, maxLength = 1000) {
        const sentences = content.split(/[.!?]+/);
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxLength) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += sentence + '. ';
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}

export default new MistralService(); 