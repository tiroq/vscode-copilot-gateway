import { GatewayConfig } from '../core/config';

interface DashboardData {
    config: GatewayConfig;
    isRunning: boolean;
    stats: any;
    planStats: any;
}

export function getDashboardHtml(data: DashboardData): string {
    const { config, isRunning, stats, planStats } = data;
    
    const uptimeSeconds = Math.floor(stats.uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    
    const progressPct = Math.min(planStats.usagePct, 100);
    const progressClass = planStats.usagePct > 100 ? 'danger' : planStats.usagePct > 80 ? 'warning' : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copilot Gateway Dashboard</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
        h1 { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 10px; }
        h2 { margin-top: 30px; }
        .status { display: inline-block; padding: 5px 12px; border-radius: 3px; font-weight: bold; margin-left: 10px; }
        .status.running { background-color: #4caf50; color: white; }
        .status.stopped { background-color: #f44336; color: white; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background-color: var(--vscode-editor-inactiveSelectionBackground); padding: 15px; border-radius: 5px; border: 1px solid var(--vscode-panel-border); }
        .stat-label { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-value.small { font-size: 18px; }
        .config-item { margin: 15px 0; }
        .config-label { display: block; margin-bottom: 5px; font-weight: 600; }
        input[type="number"], input[type="text"], select { width: 100%; max-width: 400px; padding: 8px; background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; }
        button { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; margin-right: 10px; margin-top: 10px; }
        button:hover { background-color: var(--vscode-button-hoverBackground); }
        button.secondary { background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
        .info-box { background-color: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-textLink-foreground); padding: 15px; margin: 20px 0; }
        .warning-box { background-color: rgba(255, 152, 0, 0.1); border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
        .progress-bar { width: 100%; height: 24px; background-color: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); border-radius: 3px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; background-color: var(--vscode-progressBar-background); transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; }
        .progress-fill.warning { background-color: #ff9800; }
        .progress-fill.danger { background-color: #f44336; }
        code { background-color: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 3px; font-size: 12px; }
    </style>
</head>
<body>
    <h1>Copilot Gateway Dashboard <span class="status ${isRunning ? 'running' : 'stopped'}">${isRunning ? 'RUNNING' : 'STOPPED'}</span></h1>
    
    <div>
        <button onclick="start()">Start</button>
        <button onclick="stop()">Stop</button>
        <button onclick="restart()">Restart</button>
        <button onclick="toggle()" class="secondary">Toggle</button>
    </div>
    
    <h2>Server Statistics</h2>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Total Requests</div><div class="stat-value">${stats.gateway_requests_total}</div></div>
        <div class="stat-card"><div class="stat-label">Successful</div><div class="stat-value">${stats.gateway_requests_success}</div></div>
        <div class="stat-card"><div class="stat-label">Failed</div><div class="stat-value">${stats.gateway_requests_failed}</div></div>
        <div class="stat-card"><div class="stat-label">Active</div><div class="stat-value">${stats.activeRequests}</div></div>
        <div class="stat-card"><div class="stat-label">Queued</div><div class="stat-value">${stats.queuedRequests}</div></div>
        <div class="stat-card"><div class="stat-label">Retries</div><div class="stat-value">${stats.gateway_retries_total}</div></div>
        <div class="stat-card"><div class="stat-label">Overflow</div><div class="stat-value">${stats.gateway_queue_overflow_total}</div></div>
        <div class="stat-card"><div class="stat-label">Auth Fail</div><div class="stat-value">${stats.gateway_auth_fail_total}</div></div>
        <div class="stat-card"><div class="stat-label">Latency EWMA</div><div class="stat-value small">${stats.latency_ewma.toFixed(0)}ms</div></div>
        <div class="stat-card"><div class="stat-label">Latency Max</div><div class="stat-value small">${stats.latency_max}ms</div></div>
        <div class="stat-card"><div class="stat-label">Uptime</div><div class="stat-value small">${uptimeHours}h ${uptimeMinutes % 60}m</div></div>
    </div>
    <button onclick="resetCurrentPeriod()" class="secondary">Reset Period</button>
    <button onclick="resetAllCounters()" class="secondary">Reset All</button>
    
    ${config.planEnabled ? `<h2>Usage Plan (${planStats.period})</h2>
    ${planStats.offLimit > 0 ? `<div class="warning-box">⚠️ Over limit by ${planStats.offLimit} requests</div>` : ''}
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Used</div><div class="stat-value">${planStats.used}</div></div>
        <div class="stat-card"><div class="stat-label">Limit</div><div class="stat-value">${planStats.limit}</div></div>
        <div class="stat-card"><div class="stat-label">Remaining</div><div class="stat-value">${planStats.left}</div></div>
        <div class="stat-card"><div class="stat-label">Off-limit</div><div class="stat-value">${planStats.offLimit}</div></div>
    </div>
    <div class="progress-bar"><div class="progress-fill ${progressClass}" style="width: ${progressPct}%">${planStats.usagePct.toFixed(1)}%</div></div>
    <div class="info-box"><strong>Note:</strong> This tracks Gateway usage only, NOT official Copilot quota.</div>` : ''}
    
    <h2>Configuration</h2>
    <div class="config-item"><label class="config-label">Host</label><input type="text" value="${config.host}" onchange="updateConfig('host', this.value)"></div>
    <div class="config-item"><label class="config-label">Port</label><input type="number" value="${config.port}" min="1024" max="65535" onchange="updateConfig('port', parseInt(this.value))"></div>
    <div class="config-item"><label class="config-label">Auth Token</label><input type="text" value="${config.authToken}" onchange="updateConfig('authToken', this.value)" placeholder="Leave empty to disable">
    <div><button onclick="generateToken()">Generate</button><button onclick="copyToken()">Copy</button></div></div>
    <div class="config-item"><label class="config-label">Max Concurrent (1-4)</label><input type="number" value="${config.maxConcurrent}" min="1" max="4" onchange="updateConfig('maxConcurrent', parseInt(this.value))"></div>
    <div class="config-item"><label class="config-label">Max Queue</label><input type="number" value="${config.maxQueue}" min="1" onchange="updateConfig('maxQueue', parseInt(this.value))"></div>
    <div class="config-item"><label class="config-label">Max Retries</label><input type="number" value="${config.maxRetries}" min="0" onchange="updateConfig('maxRetries', parseInt(this.value))"></div>
    <div class="config-item"><label class="config-label">Plan Enabled</label><input type="checkbox" ${config.planEnabled ? 'checked' : ''} onchange="updateConfig('plan.enabled', this.checked)"></div>
    <div class="config-item"><label class="config-label">Plan Period</label><select onchange="updateConfig('plan.period', this.value)">
        <option value="daily" ${config.planPeriod === 'daily' ? 'selected' : ''}>Daily</option>
        <option value="weekly" ${config.planPeriod === 'weekly' ? 'selected' : ''}>Weekly</option>
        <option value="monthly" ${config.planPeriod === 'monthly' ? 'selected' : ''}>Monthly</option>
    </select></div>
    <div class="config-item"><label class="config-label">Plan Limit</label><input type="number" value="${config.planLimitRequests}" onchange="updateConfig('plan.limitRequests', parseInt(this.value))"></div>
    
    <h2>API</h2>
    <div class="info-box">
        <strong>Base:</strong> <code>http://${config.host}:${config.port}</code><br>
        <code>GET /v1/models</code> | <code>POST /v1/chat/completions</code><br>
        ${config.authToken ? `<strong>Auth:</strong> <code>Bearer ...</code>` : 'Auth: Disabled'}
    </div>
    <button onclick="copyExamples()">Copy Examples</button>
    
    <script>
        const vscode = acquireVsCodeApi();
        function start() { vscode.postMessage({ command: 'start' }); }
        function stop() { vscode.postMessage({ command: 'stop' }); }
        function restart() { vscode.postMessage({ command: 'restart' }); }
        function toggle() { vscode.postMessage({ command: 'toggle' }); }
        function updateConfig(key, value) { vscode.postMessage({ command: 'updateConfig', key, value }); }
        function generateToken() { vscode.postMessage({ command: 'generateToken' }); }
        function copyToken() { vscode.postMessage({ command: 'copyToken' }); }
        function copyExamples() { vscode.postMessage({ command: 'copyExamples' }); }
        function resetCurrentPeriod() { vscode.postMessage({ command: 'resetCurrentPeriod' }); }
        function resetAllCounters() { vscode.postMessage({ command: 'resetAllCounters' }); }
    </script>
</body>
</html>`;
}
