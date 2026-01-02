import * as vscode from 'vscode';
import { GatewayServer } from './server';

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
                    case 'start': {
                        await vscode.commands.executeCommand('copilot-gateway.start');
                        break;
                    }
                    case 'stop': {
                        await vscode.commands.executeCommand('copilot-gateway.stop');
                        break;
                    }
                    case 'restart': {
                        await vscode.commands.executeCommand('copilot-gateway.restart');
                        break;
                    }
                    case 'updateConfig': {
                        const config = vscode.workspace.getConfiguration('copilot-gateway');
                        await config.update(message.key, message.value, vscode.ConfigurationTarget.Global);
                        break;
                    }
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
        this.panel.webview.html = this.getHtmlContent();
    }

    private getHtmlContent(): string {
        const config = vscode.workspace.getConfiguration('copilot-gateway');
        const port = config.get<number>('port', 8080);
        const maxConcurrent = config.get<number>('maxConcurrentRequests', 5);
        const retryAttempts = config.get<number>('retryAttempts', 3);
        const autoStart = config.get<boolean>('autoStart', true);
        const authToken = config.get<string>('authToken', '');

        const stats = this.server?.getStats() || {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            queuedRequests: 0,
            activeRequests: 0,
            uptime: 0,
            startTime: 0
        };

        const isRunning = this.server?.isServerRunning() || false;
        const uptimeSeconds = Math.floor(stats.uptime / 1000);
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);
        const uptimeHours = Math.floor(uptimeMinutes / 60);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copilot Gateway Dashboard</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1 {
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        h2 {
            color: var(--vscode-foreground);
            margin-top: 30px;
        }
        .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
            margin-left: 10px;
        }
        .status.running {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
        }
        .status.stopped {
            background-color: var(--vscode-testing-iconFailed);
            color: var(--vscode-editor-background);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 5px;
            border: 1px solid var(--vscode-panel-border);
        }
        .stat-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-foreground);
        }
        .config-section {
            margin: 20px 0;
        }
        .config-item {
            margin: 15px 0;
        }
        .config-label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="number"],
        input[type="text"] {
            width: 100%;
            max-width: 400px;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
        }
        input[type="checkbox"] {
            margin-right: 8px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 3px;
            cursor: pointer;
            margin-right: 10px;
            margin-top: 10px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .button-group {
            margin: 20px 0;
        }
        .info-box {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>
        Copilot Gateway Dashboard
        <span class="status ${isRunning ? 'running' : 'stopped'}">
            ${isRunning ? 'RUNNING' : 'STOPPED'}
        </span>
    </h1>

    <div class="button-group">
        <button onclick="start()">Start Server</button>
        <button onclick="stop()">Stop Server</button>
        <button onclick="restart()">Restart Server</button>
    </div>

    <h2>Statistics</h2>
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Requests</div>
            <div class="stat-value">${stats.totalRequests}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Successful</div>
            <div class="stat-value">${stats.successfulRequests}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Failed</div>
            <div class="stat-value">${stats.failedRequests}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Requests</div>
            <div class="stat-value">${stats.activeRequests}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Queued Requests</div>
            <div class="stat-value">${stats.queuedRequests}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Uptime</div>
            <div class="stat-value">${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s</div>
        </div>
    </div>

    <h2>Configuration</h2>
    <div class="config-section">
        <div class="config-item">
            <label class="config-label" for="port">Port</label>
            <input type="number" id="port" value="${port}" min="1024" max="65535" 
                   onchange="updateConfig('port', parseInt(this.value))">
        </div>
        <div class="config-item">
            <label class="config-label" for="maxConcurrent">Max Concurrent Requests</label>
            <input type="number" id="maxConcurrent" value="${maxConcurrent}" min="1" max="50"
                   onchange="updateConfig('maxConcurrentRequests', parseInt(this.value))">
        </div>
        <div class="config-item">
            <label class="config-label" for="retryAttempts">Retry Attempts</label>
            <input type="number" id="retryAttempts" value="${retryAttempts}" min="0" max="10"
                   onchange="updateConfig('retryAttempts', parseInt(this.value))">
        </div>
        <div class="config-item">
            <label class="config-label" for="authToken">Bearer Auth Token (leave empty to disable)</label>
            <input type="text" id="authToken" value="${authToken}" 
                   onchange="updateConfig('authToken', this.value)">
        </div>
        <div class="config-item">
            <label class="config-label">
                <input type="checkbox" id="autoStart" ${autoStart ? 'checked' : ''}
                       onchange="updateConfig('autoStart', this.checked)">
                Auto-start server on extension activation
            </label>
        </div>
    </div>

    <h2>API Endpoints</h2>
    <div class="info-box">
        <strong>Base URL:</strong> http://localhost:${port}<br><br>
        <strong>GET /v1/models</strong> - List available models<br>
        <strong>POST /v1/chat/completions</strong> - Create chat completion (supports streaming)<br><br>
        ${authToken ? '<strong>Authentication:</strong> Add "Authorization: Bearer ' + authToken + '" header to requests' : '<strong>Authentication:</strong> Disabled'}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function start() {
            vscode.postMessage({ command: 'start' });
        }

        function stop() {
            vscode.postMessage({ command: 'stop' });
        }

        function restart() {
            vscode.postMessage({ command: 'restart' });
        }

        function updateConfig(key, value) {
            vscode.postMessage({ 
                command: 'updateConfig',
                key: key,
                value: value
            });
        }
    </script>
</body>
</html>`;
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
