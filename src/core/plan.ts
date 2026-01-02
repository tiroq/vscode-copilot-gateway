import * as vscode from 'vscode';
import { ConfigManager } from './config';

export interface PlanStats {
    period: string;
    used: number;
    limit: number;
    offLimit: number;
    left: number;
    usagePct: number;
}

export class PlanManager {
    private context: vscode.ExtensionContext;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    private getPeriodKey(date: Date, period: 'daily' | 'weekly' | 'monthly', resetAt: string): string {
        // Parse resetAt (HH:MM format)
        const [resetHour, resetMinute] = resetAt.split(':').map(Number);
        
        // Adjust date for reset time
        const adjustedDate = new Date(date);
        const currentHour = adjustedDate.getHours();
        const currentMinute = adjustedDate.getMinutes();
        
        // If we haven't reached reset time today, use previous period
        if (currentHour < resetHour || (currentHour === resetHour && currentMinute < resetMinute)) {
            if (period === 'daily') {
                adjustedDate.setDate(adjustedDate.getDate() - 1);
            } else if (period === 'weekly') {
                adjustedDate.setDate(adjustedDate.getDate() - 7);
            } else if (period === 'monthly') {
                adjustedDate.setMonth(adjustedDate.getMonth() - 1);
            }
        }
        
        switch (period) {
            case 'daily':
                return adjustedDate.toISOString().split('T')[0]; // YYYY-MM-DD
            case 'weekly':
                // ISO week format: YYYY-Www
                const year = adjustedDate.getFullYear();
                const week = this.getISOWeek(adjustedDate);
                return `${year}-W${String(week).padStart(2, '0')}`;
            case 'monthly':
                return `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        }
    }
    
    private getISOWeek(date: Date): number {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }
    
    public async recordRequest(): Promise<void> {
        const config = ConfigManager.getConfig();
        if (!config.planEnabled) {
            return;
        }
        
        const periodKey = this.getPeriodKey(new Date(), config.planPeriod, config.planResetAt);
        const buckets = this.context.globalState.get<Record<string, number>>('planBuckets') || {};
        
        buckets[periodKey] = (buckets[periodKey] || 0) + 1;
        
        await this.context.globalState.update('planBuckets', buckets);
    }
    
    public getPlanStats(): PlanStats {
        const config = ConfigManager.getConfig();
        
        if (!config.planEnabled) {
            return {
                period: config.planPeriod,
                used: 0,
                limit: config.planLimitRequests,
                offLimit: 0,
                left: config.planLimitRequests,
                usagePct: 0
            };
        }
        
        const periodKey = this.getPeriodKey(new Date(), config.planPeriod, config.planResetAt);
        const buckets = this.context.globalState.get<Record<string, number>>('planBuckets') || {};
        const used = buckets[periodKey] || 0;
        
        const offLimit = Math.max(0, used - config.planLimitRequests);
        const left = Math.max(0, config.planLimitRequests - used);
        const usagePct = (used / config.planLimitRequests) * 100;
        
        return {
            period: config.planPeriod,
            used,
            limit: config.planLimitRequests,
            offLimit,
            left,
            usagePct
        };
    }
    
    public async resetCurrentPeriod(): Promise<void> {
        const config = ConfigManager.getConfig();
        const periodKey = this.getPeriodKey(new Date(), config.planPeriod, config.planResetAt);
        const buckets = this.context.globalState.get<Record<string, number>>('planBuckets') || {};
        
        delete buckets[periodKey];
        
        await this.context.globalState.update('planBuckets', buckets);
    }
    
    public async resetAllPeriods(): Promise<void> {
        await this.context.globalState.update('planBuckets', {});
    }
}
