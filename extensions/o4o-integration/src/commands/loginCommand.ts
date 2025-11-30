import * as vscode from 'vscode';
import { AuthManager } from '../auth/authManager';

/**
 * O4O: Login Command
 * Prompts user for email/password and authenticates with O4O Platform
 */
export async function loginCommand(authManager: AuthManager): Promise<void> {
  try {
    // Check if already authenticated
    const isAuth = await authManager.isAuthenticated();
    if (isAuth) {
      const relogin = await vscode.window.showWarningMessage(
        'You are already logged in. Do you want to login again?',
        'Yes',
        'No'
      );

      if (relogin !== 'Yes') {
        return;
      }
    }

    // Prompt for email
    const email = await vscode.window.showInputBox({
      prompt: 'Enter your O4O Platform email',
      placeHolder: 'user@example.com',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) {
          return 'Email is required';
        }
        if (!value.includes('@')) {
          return 'Please enter a valid email';
        }
        return null;
      },
    });

    if (!email) {
      vscode.window.showInformationMessage('Login cancelled');
      return;
    }

    // Prompt for password
    const password = await vscode.window.showInputBox({
      prompt: 'Enter your O4O Platform password',
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value) {
          return 'Password is required';
        }
        return null;
      },
    });

    if (!password) {
      vscode.window.showInformationMessage('Login cancelled');
      return;
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Logging in to O4O Platform...',
        cancellable: false,
      },
      async () => {
        await authManager.login({ email, password });
      }
    );

    vscode.window.showInformationMessage('✅ Successfully logged in to O4O Platform!');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
