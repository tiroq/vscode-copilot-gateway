import * as vscode from 'vscode';
import * as http from 'http';
import { ConfigManager } from '../core/config';
import { SecurityManager } from '../core/security';
import { StatsManager } from '../core/stats';
import { PlanManager } from '../core/plan';
import { RetryManager } from '../core/retry';

interface ChatMessage {
    role: string;
    content: string;
}

interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

export class RoutesHandler {
    constructor(
        private statsManager: StatsManager,
        private planManager: PlanManager,
        private retryManager: RetryManager
    ) {}
    
    public async handleModelsRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        try {
            const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
            
            const response = {
                object: 'list',
                data: models.map(model => ({
                    id: model.id || model.name,
                    object: 'model',
                    owned_by: 'copilot-via-vscode'
                }))
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: {
                    message: errorMessage,
                    type: 'internal_error',
                    code: 'internal_error'
                }
            }));
        }
    }
    
    public async handleChatCompletionsRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse,
        cancellationToken: vscode.CancellationToken
    ): Promise<void> {
        const startTime = Date.now();
        
        try {
            const body = await this.readRequestBody(req);
            const data: ChatCompletionRequest = JSON.parse(body);
            
            const stream = data.stream || false;
            
            if (stream) {
                this.statsManager.incrementStreamRequests();
            }
            
            // Record plan usage
            await this.planManager.recordRequest();
            
            // Get models
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: data.model
            });
            
            if (models.length === 0) {
                throw new Error(`Model ${data.model} not available`);
            }
            
            const model = models[0];
            
            // Convert messages
            const messages = this.convertMessages(data.messages);
            
            const options: vscode.LanguageModelChatRequestOptions = {};
            
            if (stream) {
                await this.handleStreamingResponse(model, messages, options, res, cancellationToken);
            } else {
                await this.handleNonStreamingResponse(model, messages, options, res, cancellationToken);
            }
            
            // Record latency
            const latency = Date.now() - startTime;
            this.statsManager.recordLatency(latency);
            this.statsManager.incrementSuccess();
            
        } catch (error) {
            this.statsManager.incrementFailed();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
            }
            
            if (!res.writableEnded) {
                res.end(JSON.stringify({
                    error: {
                        message: errorMessage,
                        type: 'internal_error',
                        code: 'internal_error'
                    }
                }));
            }
        }
    }
    
    private convertMessages(messages: ChatMessage[]): vscode.LanguageModelChatMessage[] {
        const result: vscode.LanguageModelChatMessage[] = [];
        let systemMessages: string[] = [];
        
        // Extract all system messages
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemMessages.push(msg.content);
            }
        }
        
        // Process messages
        let firstUserMessageFound = false;
        for (const msg of messages) {
            if (msg.role === 'system') {
                continue; // Skip, already extracted
            } else if (msg.role === 'user') {
                if (!firstUserMessageFound && systemMessages.length > 0) {
                    // Merge system messages into first user message
                    const systemPrefix = systemMessages.join('\n\n');
                    result.push(vscode.LanguageModelChatMessage.User(`${systemPrefix}\n\n${msg.content}`));
                    firstUserMessageFound = true;
                } else {
                    result.push(vscode.LanguageModelChatMessage.User(msg.content));
                }
            } else if (msg.role === 'assistant') {
                result.push(vscode.LanguageModelChatMessage.Assistant(msg.content));
            } else {
                // Default to user for unknown roles
                result.push(vscode.LanguageModelChatMessage.User(msg.content));
            }
        }
        
        // If no user message was found but we have system messages, add them as user message
        if (!firstUserMessageFound && systemMessages.length > 0) {
            result.unshift(vscode.LanguageModelChatMessage.User(systemMessages.join('\n\n')));
        }
        
        return result;
    }
    
    private async handleStreamingResponse(
        model: vscode.LanguageModelChat,
        messages: vscode.LanguageModelChatMessage[],
        options: vscode.LanguageModelChatRequestOptions,
        res: http.ServerResponse,
        cancellationToken: vscode.CancellationToken
    ): Promise<void> {
        // Don't start SSE until retry loop succeeds
        const chatResponse = await this.retryManager.executeWithRetry(
            async () => {
                if (cancellationToken.isCancellationRequested) {
                    throw new Error('Request cancelled');
                }
                return await model.sendRequest(messages, options, cancellationToken);
            },
            (attempt, error) => {
                this.statsManager.incrementRetries();
            }
        );
        
        // Now start SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        
        let chunkIndex = 0;
        const modelId = model.id || model.name;
        
        try {
            for await (const fragment of chatResponse.text) {
                if (cancellationToken.isCancellationRequested) {
                    break;
                }
                
                const chunk = {
                    id: `chatcmpl-${Date.now()}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: modelId,
                    choices: [
                        {
                            index: 0,
                            delta: chunkIndex === 0 
                                ? { role: 'assistant', content: fragment } 
                                : { content: fragment },
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
                model: modelId,
                choices: [
                    {
                        index: 0,
                        delta: {},
                        finish_reason: 'stop'
                    }
                ]
            };
            
            res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
            res.write('data: [DONE]\n\n');
        } finally {
            res.end();
        }
    }
    
    private async handleNonStreamingResponse(
        model: vscode.LanguageModelChat,
        messages: vscode.LanguageModelChatMessage[],
        options: vscode.LanguageModelChatRequestOptions,
        res: http.ServerResponse,
        cancellationToken: vscode.CancellationToken
    ): Promise<void> {
        const chatResponse = await this.retryManager.executeWithRetry(
            async () => {
                if (cancellationToken.isCancellationRequested) {
                    throw new Error('Request cancelled');
                }
                return await model.sendRequest(messages, options, cancellationToken);
            },
            (attempt, error) => {
                this.statsManager.incrementRetries();
            }
        );
        
        let fullText = '';
        for await (const fragment of chatResponse.text) {
            if (cancellationToken.isCancellationRequested) {
                break;
            }
            fullText += fragment;
        }
        
        const modelId = model.id || model.name;
        
        const response = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: modelId,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: fullText
                    },
                    finish_reason: 'stop'
                }
            ]
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
    }
    
    private readRequestBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', reject);
        });
    }
}
