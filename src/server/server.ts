import * as vscode from 'vscode';
import * as http from 'http';
import { URL } from 'url';
import { ConfigManager } from '../core/config';
import { SecurityManager } from '../core/security';
import { StatsManager } from '../core/stats';
import { PlanManager } from '../core/plan';
import { RequestQueue } from '../core/queue';
import { RetryManager } from '../core/retry';
import { RoutesHandler } from './routes';

export type ServerState = 'OFF' | 'ON' | 'BUSY' | 'ERR';

export class GatewayServer {
    private server: http.Server | undefined;
    private isRunning: boolean = false;
    private state: ServerState = 'OFF';
    private requestQueue: RequestQueue;
    private retryManager: RetryManager;
    private routesHandler: RoutesHandler;
    private statsManager: StatsManager;
    private planManager: PlanManager;
    private activeRequests: Map<http.ServerResponse, vscode.CancellationTokenSource> = new Map();
    
    constructor(
        private context: vscode.ExtensionContext,
        private onStateChange?: (state: ServerState) => void
    ) {
        const config = ConfigManager.getConfig();
        
        this.statsManager = new StatsManager(context);
        this.planManager = new PlanManager(context);
        this.requestQueue = new RequestQueue(config.maxConcurrent, config.maxQueue);
        this.retryManager = new RetryManager({
            maxRetries: config.maxRetries,
            backoffBaseMs: config.backoffBaseMs,
            backoffMaxMs: config.backoffMaxMs,
            backoffJitter: config.backoffJitter
        });
        this.routesHandler = new RoutesHandler(this.statsManager, this.planManager, this.retryManager);
    }
    
    private setState(state: ServerState): void {
        this.state = state;
        if (this.onStateChange) {
            this.onStateChange(state);
        }
    }
    
    public getState(): ServerState {
        return this.state;
    }
    
    public async start(): Promise<void> {
        if (this.isRunning) {
            vscode.window.showWarningMessage('Copilot Gateway server is already running');
            return;
        }
        
        const config = ConfigManager.getConfig();
        
        // Update components with new config
        this.requestQueue.updateLimits(config.maxConcurrent, config.maxQueue);
        this.retryManager.updateOptions({
            maxRetries: config.maxRetries,
            backoffBaseMs: config.backoffBaseMs,
            backoffMaxMs: config.backoffMaxMs,
            backoffJitter: config.backoffJitter
        });
        
        try {
            await this.startServer();
            this.statsManager.setStartTime(Date.now());
            this.isRunning = true;
            this.setState('ON');
            vscode.window.showInformationMessage(
                `Copilot Gateway started on ${config.host}:${config.port}`
            );
        } catch (error) {
            this.isRunning = false;
            this.setState('ERR');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(
                `Failed to start Copilot Gateway: ${errorMessage}`
            );
        }
    }
    
    public async stop(): Promise<void> {
        if (!this.isRunning || !this.server) {
            vscode.window.showWarningMessage('Copilot Gateway server is not running');
            return;
        }
        
        // Cancel all active requests
        for (const [res, tokenSource] of this.activeRequests.entries()) {
            tokenSource.cancel();
            if (!res.writableEnded) {
                res.end();
            }
        }
        this.activeRequests.clear();
        
        return new Promise((resolve) => {
            this.server?.close(() => {
                this.isRunning = false;
                this.setState('OFF');
                vscode.window.showInformationMessage('Copilot Gateway stopped');
                resolve();
            });
        });
    }
    
    public async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }
    
    public getStats() {
        const stats = this.statsManager.getStats();
        stats.activeRequests = this.requestQueue.getActiveCount();
        stats.queuedRequests = this.requestQueue.getQueueSize();
        this.statsManager.updateUptime();
        return stats;
    }
    
    public getPlanStats() {
        return this.planManager.getPlanStats();
    }
    
    public isServerRunning(): boolean {
        return this.isRunning;
    }
    
    public async resetCurrentPeriod(): Promise<void> {
        await this.planManager.resetCurrentPeriod();
        vscode.window.showInformationMessage('Current period statistics reset');
    }
    
    public async resetAllCounters(): Promise<void> {
        const answer = await vscode.window.showWarningMessage(
            'Are you sure you want to reset all statistics? This cannot be undone.',
            'Reset',
            'Cancel'
        );
        
        if (answer === 'Reset') {
            await this.statsManager.resetAllCounters();
            await this.planManager.resetAllPeriods();
            vscode.window.showInformationMessage('All statistics reset');
        }
    }
    
    private async startServer(): Promise<void> {
        const config = ConfigManager.getConfig();
        
        return new Promise((resolve, reject) => {
            this.server = http.createServer(async (req, res) => {
                await this.handleRequest(req, res);
            });
            
            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${config.port} is already in use`));
                } else {
                    reject(err);
                }
            });
            
            this.server.listen(config.port, config.host, () => {
                resolve();
            });
        });
    }
    
    private async handleRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const config = ConfigManager.getConfig();
        
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
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace(/^Bearer\s+/i, '') || '';
        
        if (!SecurityManager.validateToken(token, config.authToken)) {
            this.statsManager.incrementAuthFail();
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: {
                    message: 'Invalid or missing authentication token',
                    type: 'authentication_error',
                    code: 'invalid_api_key'
                }
            }));
            return;
        }
        
        this.statsManager.incrementRequestTotal();
        
        const url = new URL(req.url || '', `http://${config.host}:${config.port}`);
        const path = url.pathname;
        
        // Update server state based on queue
        const queueSize = this.requestQueue.getQueueSize();
        const activeCount = this.requestQueue.getActiveCount();
        if (activeCount > 0 || queueSize > 0) {
            this.setState('BUSY');
        } else {
            this.setState('ON');
        }
        
        try {
            if (path === '/v1/models' && req.method === 'GET') {
                await this.routesHandler.handleModelsRequest(req, res);
            } else if (path === '/v1/chat/completions' && req.method === 'POST') {
                // Create cancellation token for this request
                const tokenSource = new vscode.CancellationTokenSource();
                this.activeRequests.set(res, tokenSource);
                
                // Handle client disconnect
                res.on('close', () => {
                    tokenSource.cancel();
                    this.activeRequests.delete(res);
                });
                
                try {
                    await this.requestQueue.enqueue(async () => {
                        await this.routesHandler.handleChatCompletionsRequest(
                            req,
                            res,
                            tokenSource.token
                        );
                    });
                } finally {
                    tokenSource.dispose();
                    this.activeRequests.delete(res);
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: {
                        message: 'Not found',
                        type: 'invalid_request_error',
                        code: 'not_found'
                    }
                }));
            }
        } catch (error) {
            // Handle queue overflow
            if (error instanceof Error && error.message === 'QUEUE_OVERFLOW') {
                this.statsManager.incrementQueueOverflow();
                res.writeHead(429, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: {
                        message: 'Request queue is full. Please try again later.',
                        type: 'rate_limit_error',
                        code: 'rate_limit_exceeded'
                    }
                }));
            } else {
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
        
        // Update state after request
        const finalQueueSize = this.requestQueue.getQueueSize();
        const finalActiveCount = this.requestQueue.getActiveCount();
        if (finalActiveCount > 0 || finalQueueSize > 0) {
            this.setState('BUSY');
        } else {
            this.setState('ON');
        }
    }
}
