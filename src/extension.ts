import * as vscode from 'vscode';
import { GatewayServer } from './server/server';
import { StatusBarManager } from './ui/statusBar';
import { DashboardPanel } from './ui/dashboard';
import { SecurityManager } from './core/security';
import { ConfigManager } from './core/config';

let server: GatewayServer | undefined;
let statusBarManager: StatusBarManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Copilot Gateway extension is now active');

    // Initialize status bar
    statusBarManager = new StatusBarManager();
    context.subscriptions.push(statusBarManager);

    // Initialize server with state change callback
    server = new GatewayServer(context, (state) => {
        if (statusBarManager && server) {
            const stats = server.getStats();
            const planStats = server.getPlanStats();
            statusBarManager.setState(state, {
                active: stats.activeRequests,
                queued: stats.queuedRequests
            }, {
                used: planStats.used,
                limit: planStats.limit,
                offLimit: planStats.offLimit
            });
        }
    });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-gateway.start', async () => {
            await server?.start();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-gateway.stop', async () => {
            await server?.stop();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-gateway.restart', async () => {
            await server?.restart();
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-gateway.toggle', async () => {
            if (server?.isServerRunning()) {
                await server.stop();
            } else {
                await server?.start();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-gateway.showDashboard', () => {
            DashboardPanel.createOrShow(context, server);
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-gateway.generateToken', async () => {
            const token = await SecurityManager.generateAndStoreToken();
            await SecurityManager.copyTokenToClipboard(token);
            vscode.window.showInformationMessage('New authentication token generated and copied to clipboard');
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('copilot-gateway.copyExamples', async () => {
            const config = ConfigManager.getConfig();
            const authHeader = config.authToken 
                ? `-H "Authorization: Bearer ${config.authToken}" \\`
                : '';
            
            const examples = `# Copilot Gateway API Examples

## List Models
curl http://${config.host}:${config.port}/v1/models \\
  ${authHeader}

## Chat Completion (Non-streaming)
curl http://${config.host}:${config.port}/v1/chat/completions \\
  ${authHeader}
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'

## Chat Completion (Streaming)
curl http://${config.host}:${config.port}/v1/chat/completions \\
  ${authHeader}
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Write a short poem"}
    ],
    "stream": true
  }'`;
            
            await vscode.env.clipboard.writeText(examples);
            vscode.window.showInformationMessage('API examples copied to clipboard');
        })
    );

    // Note: Server starts manually by user, not auto-start
    // Default is OFF per requirements
}

export async function deactivate() {
    await server?.stop();
}
