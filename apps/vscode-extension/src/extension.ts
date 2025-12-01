import * as vscode from 'vscode';
import { AuthManager } from './auth/authManager';
import { convertAndSavePage } from './converter/reactToBlocks';

export function activate(context: vscode.ExtensionContext) {
    console.log('O4O Integration Extension is now active!');

    const authManager = new AuthManager(context);

    let loginDisposable = vscode.commands.registerCommand('o4o.login', async () => {
        await authManager.login();
    });

    let convertDisposable = vscode.commands.registerCommand('o4o.convertAndSave', async () => {
        await convertAndSavePage(context);
    });

    context.subscriptions.push(loginDisposable);
    context.subscriptions.push(convertDisposable);
}

export function deactivate() { }
