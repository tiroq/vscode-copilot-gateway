import * as vscode from 'vscode';
import * as http from 'http';

interface ChatMessage {
    role: string;
    content: string;
}

interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    max_tokens?: number;
    stream?: boolean;
}

export class LanguageModelService {
    private retryAttempts: number;
    private retryDelay: number = 1000; // Base delay in ms

    constructor() {
        const config = vscode.workspace.getConfiguration('copilot-gateway');
        this.retryAttempts = config.get<number>('retryAttempts', 3);
    }

    public async getAvailableModels(): Promise<vscode.LanguageModelChat[]> {
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot'
        });
        return models;
    }

    public async sendChatCompletion(
        request: ChatCompletionRequest,
        res: http.ServerResponse,
        stream: boolean
    ): Promise<void> {
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: request.model
        });

        if (models.length === 0) {
            throw new Error(`Model ${request.model} not available`);
        }

        const model = models[0];
        const messages = request.messages.map(msg =>
            vscode.LanguageModelChatMessage.User(msg.content)
        );

        const options: vscode.LanguageModelChatRequestOptions = {};
        // Note: maxTokens property may not be available in all VS Code versions
        // The Language Model API will handle token limits internally

        if (stream) {
            await this.streamChatCompletion(model, messages, options, res);
        } else {
            await this.nonStreamChatCompletion(model, messages, options, res);
        }
    }

    private async streamChatCompletion(
        model: vscode.LanguageModelChat,
        messages: vscode.LanguageModelChatMessage[],
        options: vscode.LanguageModelChatRequestOptions,
        res: http.ServerResponse
    ): Promise<void> {
        const chatResponse = await this.retryWithBackoff(async () => {
            return await model.sendRequest(messages, options);
        });

        let chunkIndex = 0;
        for await (const fragment of chatResponse.text) {
            const chunk = {
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model.id,
                choices: [
                    {
                        index: 0,
                        delta: chunkIndex === 0 ? { role: 'assistant', content: fragment } : { content: fragment },
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        finish_reason: null
                    }
                ]
            };

            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            chunkIndex++;
        }

        // Send final chunk
        const finalChunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model.id,
            choices: [
                {
                    index: 0,
                    delta: {},
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    finish_reason: 'stop'
                }
            ]
        };

        res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }

    private async nonStreamChatCompletion(
        model: vscode.LanguageModelChat,
        messages: vscode.LanguageModelChatMessage[],
        options: vscode.LanguageModelChatRequestOptions,
        res: http.ServerResponse
    ): Promise<void> {
        const chatResponse = await this.retryWithBackoff(async () => {
            return await model.sendRequest(messages, options);
        });

        let fullText = '';
        for await (const fragment of chatResponse.text) {
            fullText += fragment;
        }

        const response = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model.id,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: fullText
                    },
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    finish_reason: 'stop'
                }
            ],
            usage: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                prompt_tokens: 0,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                completion_tokens: 0,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                total_tokens: 0
            }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(response));
    }

    private async retryWithBackoff<T>(
        operation: () => Promise<T>,
        attempt: number = 0
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= this.retryAttempts) {
                throw error;
            }

            const delay = this.retryDelay * Math.pow(2, attempt);
            await this.sleep(delay);
            return this.retryWithBackoff(operation, attempt + 1);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
