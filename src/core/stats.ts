import * as vscode from 'vscode';

export interface GatewayStats {
    // Counters
    gateway_requests_total: number;
    gateway_requests_success: number;
    gateway_requests_failed: number;
    gateway_retries_total: number;
    gateway_stream_requests_total: number;
    gateway_queue_overflow_total: number;
    gateway_auth_fail_total: number;
    
    // Latency tracking
    latency_ewma: number;
    latency_max: number;
    
    // Runtime stats
    activeRequests: number;
    queuedRequests: number;
    uptime: number;
    startTime: number;
}

export class StatsManager {
    private stats: GatewayStats;
    private context: vscode.ExtensionContext;
    private readonly EWMA_ALPHA = 0.2; // Weight for EWMA calculation
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.stats = this.loadStats();
    }
    
    private loadStats(): GatewayStats {
        const stored = this.context.globalState.get<Partial<GatewayStats>>('gatewayStats');
        return {
            gateway_requests_total: stored?.gateway_requests_total || 0,
            gateway_requests_success: stored?.gateway_requests_success || 0,
            gateway_requests_failed: stored?.gateway_requests_failed || 0,
            gateway_retries_total: stored?.gateway_retries_total || 0,
            gateway_stream_requests_total: stored?.gateway_stream_requests_total || 0,
            gateway_queue_overflow_total: stored?.gateway_queue_overflow_total || 0,
            gateway_auth_fail_total: stored?.gateway_auth_fail_total || 0,
            latency_ewma: stored?.latency_ewma || 0,
            latency_max: stored?.latency_max || 0,
            activeRequests: 0,
            queuedRequests: 0,
            uptime: 0,
            startTime: 0
        };
    }
    
    private async saveStats(): Promise<void> {
        await this.context.globalState.update('gatewayStats', this.stats);
    }
    
    public getStats(): GatewayStats {
        return { ...this.stats };
    }
    
    public incrementRequestTotal(): void {
        this.stats.gateway_requests_total++;
        this.saveStats();
    }
    
    public incrementSuccess(): void {
        this.stats.gateway_requests_success++;
        this.saveStats();
    }
    
    public incrementFailed(): void {
        this.stats.gateway_requests_failed++;
        this.saveStats();
    }
    
    public incrementRetries(): void {
        this.stats.gateway_retries_total++;
        this.saveStats();
    }
    
    public incrementStreamRequests(): void {
        this.stats.gateway_stream_requests_total++;
        this.saveStats();
    }
    
    public incrementQueueOverflow(): void {
        this.stats.gateway_queue_overflow_total++;
        this.saveStats();
    }
    
    public incrementAuthFail(): void {
        this.stats.gateway_auth_fail_total++;
        this.saveStats();
    }
    
    public recordLatency(latencyMs: number): void {
        // Update EWMA: EWMA = α * new_value + (1 - α) * EWMA
        if (this.stats.latency_ewma === 0) {
            this.stats.latency_ewma = latencyMs;
        } else {
            this.stats.latency_ewma = this.EWMA_ALPHA * latencyMs + (1 - this.EWMA_ALPHA) * this.stats.latency_ewma;
        }
        
        // Update max
        if (latencyMs > this.stats.latency_max) {
            this.stats.latency_max = latencyMs;
        }
        
        this.saveStats();
    }
    
    public setActiveRequests(count: number): void {
        this.stats.activeRequests = count;
    }
    
    public setQueuedRequests(count: number): void {
        this.stats.queuedRequests = count;
    }
    
    public setStartTime(time: number): void {
        this.stats.startTime = time;
    }
    
    public updateUptime(): void {
        if (this.stats.startTime > 0) {
            this.stats.uptime = Date.now() - this.stats.startTime;
        }
    }
    
    public async resetCurrentPeriod(): Promise<void> {
        // This will be implemented with plan tracking
        // For now, just reset runtime counters
        this.stats.activeRequests = 0;
        this.stats.queuedRequests = 0;
        await this.saveStats();
    }
    
    public async resetAllCounters(): Promise<void> {
        this.stats = {
            gateway_requests_total: 0,
            gateway_requests_success: 0,
            gateway_requests_failed: 0,
            gateway_retries_total: 0,
            gateway_stream_requests_total: 0,
            gateway_queue_overflow_total: 0,
            gateway_auth_fail_total: 0,
            latency_ewma: 0,
            latency_max: 0,
            activeRequests: 0,
            queuedRequests: 0,
            uptime: 0,
            startTime: 0
        };
        await this.saveStats();
    }
}
