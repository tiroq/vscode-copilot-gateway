import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'copilot-gateway.showDashboard';
        this.setStopped();
        this.statusBarItem.show();
    }

    public setRunning(port: number): void {
        this.statusBarItem.text = `$(radio-tower) Gateway: :${port}`;
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.tooltip = `Copilot Gateway running on port ${port}\nClick to show dashboard`;
    }

    public setStopped(): void {
        this.statusBarItem.text = '$(circle-slash) Gateway: Stopped';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.statusBarItem.tooltip = 'Copilot Gateway stopped\nClick to show dashboard';
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
