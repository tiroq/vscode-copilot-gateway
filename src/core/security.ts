import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { ConfigManager } from './config';

export class SecurityManager {
    public static generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }
    
    public static async generateAndStoreToken(): Promise<string> {
        const token = this.generateToken();
        await ConfigManager.updateConfig('authToken', token);
        return token;
    }
    
    public static async copyTokenToClipboard(token: string): Promise<void> {
        await vscode.env.clipboard.writeText(token);
        vscode.window.showInformationMessage('Auth token copied to clipboard');
    }
    
    public static validateToken(providedToken: string, configuredToken: string): boolean {
        if (!configuredToken) {
            return true; // Auth disabled
        }
        return providedToken === configuredToken;
    }
}
