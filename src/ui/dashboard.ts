import * as vscode from 'vscode';
import { GatewayServer } from '../server/server';
import { ConfigManager } from '../core/config';
import { SecurityManager } from '../core/security';
import { getDashboardHtml } from './dashboardHtml';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private updateInterval: NodeJS.Timeout | undefined;

    private constructor(
        panel: vscode.WebviewPanel,
        private context: vscode.ExtensionContext,
        private server: GatewayServer | undefined
    ) {
        this.panel = panel;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.update();
        
        // Update dashboard every second
        this.updateInterval = setInterval(() => {
            this.update();
        }, 1000);

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'start':
                        await vscode.commands.executeCommand('copilot-gateway.start');
                        break;
                    case 'stop':
                        await vscode.commands.executeCommand('copilot-gateway.stop');
                        break;
                    case 'restart':
                        await vscode.commands.executeCommand('copilot-gateway.restart');
                        break;
                    case 'toggle':
                        await vscode.commands.executeCommand('copilot-gateway.toggle');
                        break;
                    case 'updateConfig':
                        await ConfigManager.updateConfig(message.key, message.value);
                        break;
                    case 'generateToken':
                        const token = await SecurityManager.generateAndStoreToken();
                        await SecurityManager.copyTokenToClipboard(token);
                        this.update();
                        break;
                    case 'copyToken':
                        const config = ConfigManager.getConfig();
                        if (config.authToken) {
                            await SecurityManager.copyTokenToClipboard(config.authToken);
                        }
                        break;
                    case 'copyExamples':
                        await vscode.commands.executeCommand('copilot-gateway.copyExamples');
                        break;
                    case 'resetCurrentPeriod':
                        await this.server?.resetCurrentPeriod();
                        this.update();
                        break;
                    case 'resetAllCounters':
                        await this.server?.resetAllCounters();
                        this.update();
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    public static createOrShow(
        context: vscode.ExtensionContext,
        server: GatewayServer | undefined
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.panel.reveal(column);
            DashboardPanel.currentPanel.server = server;
            DashboardPanel.currentPanel.update();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'copilotGatewayDashboard',
            'Copilot Gateway Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, context, server);
    }

    private update(): void {
        const config = ConfigManager.getConfig();
        const stats = this.server?.getStats() || {
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
        
        const planStats = this.server?.getPlanStats() || {
            period: 'daily',
            used: 0,
            limit: 2000,
            offLimit: 0,
            left: 2000,
            usagePct: 0
        };
        
        const isRunning = this.server?.isServerRunning() || false;

        this.panel.webview.html = getDashboardHtml({
            config,
            isRunning,
            stats,
            planStats
        });
    }

    public dispose(): void {
        DashboardPanel.currentPanel = undefined;

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
