import * as vscode from 'vscode';
import * as http from 'http';
import { URL } from 'url';
import { StatusBarManager } from './statusBar';
import { RequestQueue } from './requestQueue';
import { LanguageModelService } from './languageModel';

export interface ServerStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    queuedRequests: number;
    activeRequests: number;
    uptime: number;
    startTime: number;
}

export class GatewayServer {
    private server: http.Server | undefined;
    private port: number = 8080;
    private authToken: string = '';
    private requestQueue: RequestQueue;
    private languageModelService: LanguageModelService;
    private stats: ServerStats = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        queuedRequests: 0,
        activeRequests: 0,
        uptime: 0,
        startTime: 0
    };
    private isRunning: boolean = false;

    constructor(
        private context: vscode.ExtensionContext,
        private statusBar: StatusBarManager
    ) {
        this.loadConfiguration();
        const maxConcurrent = vscode.workspace.getConfiguration('copilot-gateway')
            .get<number>('maxConcurrentRequests', 5);
        this.requestQueue = new RequestQueue(maxConcurrent);
        this.languageModelService = new LanguageModelService();
    }

    private loadConfiguration() {
        const config = vscode.workspace.getConfiguration('copilot-gateway');
        this.port = config.get<number>('port', 8080);
        this.authToken = config.get<string>('authToken', '');
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            vscode.window.showWarningMessage('Copilot Gateway server is already running');
            return;
        }

        this.loadConfiguration();

        try {
            await this.startServer();
            this.stats.startTime = Date.now();
            this.isRunning = true;
            this.statusBar.setRunning(this.port);
            vscode.window.showInformationMessage(
                `Copilot Gateway server started on port ${this.port}`
            );
        } catch (error) {
            this.isRunning = false;
            this.statusBar.setStopped();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(
                `Failed to start Copilot Gateway server: ${errorMessage}`
            );
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRunning || !this.server) {
            vscode.window.showWarningMessage('Copilot Gateway server is not running');
            return;
        }

        return new Promise((resolve) => {
            this.server?.close(() => {
                this.isRunning = false;
                this.statusBar.setStopped();
                vscode.window.showInformationMessage('Copilot Gateway server stopped');
                resolve();
            });
        });
    }

    public async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    public getStats(): ServerStats {
        return {
            ...this.stats,
            uptime: this.isRunning ? Date.now() - this.stats.startTime : 0,
            queuedRequests: this.requestQueue.getQueueSize(),
            activeRequests: this.requestQueue.getActiveCount()
        };
    }

    public isServerRunning(): boolean {
        return this.isRunning;
    }

    private async startServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer(async (req, res) => {
                await this.handleRequest(req, res);
            });

            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${this.port} is already in use`));
                } else {
                    reject(err);
                }
            });

            this.server.listen(this.port, () => {
                resolve();
            });
        });
    }

    private async handleRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle OPTIONS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // Authenticate request
        if (this.authToken && !this.authenticate(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        this.stats.totalRequests++;

        const url = new URL(req.url || '', `http://localhost:${this.port}`);
        const path = url.pathname;

        try {
            if (path === '/v1/models' && req.method === 'GET') {
                await this.handleModelsRequest(req, res);
            } else if (path === '/v1/chat/completions' && req.method === 'POST') {
                await this.handleChatCompletionsRequest(req, res);
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            this.stats.failedRequests++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: errorMessage }));
        }
    }

    private authenticate(req: http.IncomingMessage): boolean {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return false;
        }

        const token = authHeader.replace(/^Bearer\s+/i, '');
        return token === this.authToken;
    }

    private async handleModelsRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const models = await this.languageModelService.getAvailableModels();
        
        const response = {
            object: 'list',
            data: models.map(model => ({
                id: model.id,
                object: 'model',
                created: Date.now(),
                // eslint-disable-next-line @typescript-eslint/naming-convention
                owned_by: model.vendor,
                permission: [],
                root: model.id,
                parent: null
            }))
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        this.stats.successfulRequests++;
    }

    private async handleChatCompletionsRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const body = await this.readRequestBody(req);
        const data = JSON.parse(body);

        const stream = data.stream || false;

        if (stream) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
        }

        await this.requestQueue.enqueue(async () => {
            try {
                await this.languageModelService.sendChatCompletion(data, res, stream);
                this.stats.successfulRequests++;
            } catch (error) {
                this.stats.failedRequests++;
                throw error;
            }
        });

        if (!stream) {
            res.end();
        }
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
