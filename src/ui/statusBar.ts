import * as vscode from 'vscode';
import { ServerState } from '../server/server';
import { ConfigManager } from '../core/config';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private currentState: ServerState = 'OFF';
    
    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'copilot-gateway.showDashboard';
        this.updateDisplay();
        this.statusBarItem.show();
    }
    
    public setState(
        state: ServerState,
        queueStats?: { active: number; queued: number },
        planStats?: { used: number; limit: number; offLimit: number }
    ): void {
        this.currentState = state;
        this.updateDisplay(queueStats, planStats);
    }
    
    private updateDisplay(
        queueStats?: { active: number; queued: number },
        planStats?: { used: number; limit: number; offLimit: number }
    ): void {
        const config = ConfigManager.getConfig();
        
        switch (this.currentState) {
            case 'ON':
                this.statusBarItem.text = '$(radio-tower) Gateway: ON';
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'OFF':
                this.statusBarItem.text = '$(circle-slash) Gateway: OFF';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'BUSY':
                this.statusBarItem.text = '$(sync~spin) Gateway: BUSY';
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'ERR':
                this.statusBarItem.text = '$(error) Gateway: ERR';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
        }
        
        // Build tooltip
        const tooltipLines: string[] = [];
        tooltipLines.push('Copilot Gateway');
        tooltipLines.push('');
        
        if (this.currentState === 'ON' || this.currentState === 'BUSY') {
            tooltipLines.push(`Address: ${config.host}:${config.port}`);
            
            if (queueStats) {
                tooltipLines.push(`Queue: ${queueStats.active} running / ${queueStats.queued} queued`);
            }
            
            if (planStats && config.planEnabled) {
                tooltipLines.push('');
                tooltipLines.push(`Usage: ${planStats.used} / ${planStats.limit}`);
                if (planStats.offLimit > 0) {
                    tooltipLines.push(`Off-limit: ${planStats.offLimit}`);
                }
            }
        } else {
            tooltipLines.push('Server stopped');
        }
        
        tooltipLines.push('');
        tooltipLines.push('Click to open dashboard');
        
        this.statusBarItem.tooltip = tooltipLines.join('\n');
    }
    
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
