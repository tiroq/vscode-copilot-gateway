import * as vscode from 'vscode';

export type PlanPeriod = 'daily' | 'weekly' | 'monthly';
export type OffLimitMode = 'soft' | 'hard';

export interface GatewayConfig {
    // Server settings
    host: string;
    port: number;
    authToken: string;
    
    // Queue settings
    maxConcurrent: number;
    maxQueue: number;
    
    // Retry settings
    maxRetries: number;
    backoffBaseMs: number;
    backoffMaxMs: number;
    backoffJitter: number;
    
    // Plan settings
    planEnabled: boolean;
    planPeriod: PlanPeriod;
    planLimitRequests: number;
    planResetAt: string;
    planOffLimitMode: OffLimitMode;
}

export class ConfigManager {
    private static readonly CONFIG_PREFIX = 'copilot-gateway';
    
    public static getConfig(): GatewayConfig {
        const config = vscode.workspace.getConfiguration(this.CONFIG_PREFIX);
        
        return {
            host: config.get<string>('host', '127.0.0.1'),
            port: config.get<number>('port', 32123),
            authToken: config.get<string>('authToken', ''),
            maxConcurrent: config.get<number>('maxConcurrent', 1),
            maxQueue: config.get<number>('maxQueue', 50),
            maxRetries: config.get<number>('maxRetries', 6),
            backoffBaseMs: config.get<number>('backoffBaseMs', 400),
            backoffMaxMs: config.get<number>('backoffMaxMs', 15000),
            backoffJitter: config.get<number>('backoffJitter', 0.2),
            planEnabled: config.get<boolean>('plan.enabled', true),
            planPeriod: config.get<PlanPeriod>('plan.period', 'daily'),
            planLimitRequests: config.get<number>('plan.limitRequests', 2000),
            planResetAt: config.get<string>('plan.resetAt', '00:00'),
            planOffLimitMode: config.get<OffLimitMode>('plan.offLimitMode', 'soft')
        };
    }
    
    public static async updateConfig(key: string, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_PREFIX);
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
}
