import * as vscode from 'vscode';
import { TokenStorage } from './auth/tokenStorage';
import { AuthManager } from './auth/authManager';
import { PageClient } from './api/pageClient';
import { loginCommand } from './commands/loginCommand';
import { convertAndSaveCommand } from './commands/convertCommand';

/**
 * Extension activation
 * Called when extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('O4O Integration Extension is now active');

  // Initialize services
  const tokenStorage = new TokenStorage(context.secrets);
  const authManager = new AuthManager(tokenStorage);
  const pageClient = new PageClient(authManager);

  // Register login command
  const loginDisposable = vscode.commands.registerCommand('o4o.login', async () => {
    await loginCommand(authManager);
  });

  // Register convert & save command
  const convertDisposable = vscode.commands.registerCommand('o4o.convertAndSave', async () => {
    await convertAndSaveCommand(authManager, pageClient);
  });

  // Add to subscriptions
  context.subscriptions.push(loginDisposable);
  context.subscriptions.push(convertDisposable);

  // Show welcome message on first activation
  const hasShownWelcome = context.globalState.get<boolean>('hasShownWelcome');
  if (!hasShownWelcome) {
    vscode.window.showInformationMessage(
      'O4O Integration Extension activated! Use "O4O: Login" to get started.',
      'Show Commands'
    ).then((action) => {
      if (action === 'Show Commands') {
        vscode.commands.executeCommand('workbench.action.showCommands', 'O4O:');
      }
    });

    context.globalState.update('hasShownWelcome', true);
  }
}

/**
 * Extension deactivation
 * Called when extension is deactivated
 */
export function deactivate() {
  console.log('O4O Integration Extension is now deactivated');
}
