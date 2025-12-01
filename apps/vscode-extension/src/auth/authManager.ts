import * as vscode from 'vscode';
import axios from 'axios';

const API_BASE_URL = 'https://api.neture.co.kr/api/v1'; // Based on spec

export class AuthManager {
    constructor(private context: vscode.ExtensionContext) { }

    async login() {
        const email = await vscode.window.showInputBox({
            prompt: 'Enter your O4O Email',
            placeHolder: 'user@example.com'
        });

        if (!email) {
            return;
        }

        const password = await vscode.window.showInputBox({
            prompt: 'Enter your O4O Password',
            password: true
        });

        if (!password) {
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                email,
                password
            });

            if (response.data.success) {
                const token = response.data.data.accessToken;
                await this.context.secrets.store('o4o_token', token);
                vscode.window.showInformationMessage(`Successfully logged in as ${email}`);
            } else {
                vscode.window.showErrorMessage('Login failed: ' + response.data.message);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage('Login error: ' + (error.response?.data?.message || error.message));
        }
    }

    async getToken(): Promise<string | undefined> {
        return await this.context.secrets.get('o4o_token');
    }
}
