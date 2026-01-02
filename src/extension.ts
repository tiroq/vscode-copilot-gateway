import * as vscode from 'vscode';
import { GatewayServer } from './server';
import { StatusBarManager } from './statusBar';
import { DashboardPanel } from './dashboard';

let server: GatewayServer | undefined;
let statusBarManager: StatusBarManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Copilot Gateway extension is now active');

    // Initialize status bar
    statusBarManager = new StatusBarManager();
    context.subscriptions.push(statusBarManager);

    // Initialize server
    server = new GatewayServer(context, statusBarManager);

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
        vscode.commands.registerCommand('copilot-gateway.showDashboard', () => {
            DashboardPanel.createOrShow(context, server);
        })
    );

    // Auto-start if configured
    const config = vscode.workspace.getConfiguration('copilot-gateway');
    if (config.get<boolean>('autoStart', true)) {
        await server.start();
    }
}

export async function deactivate() {
    await server?.stop();
}
