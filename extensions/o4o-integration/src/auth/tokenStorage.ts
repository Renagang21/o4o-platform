import * as vscode from 'vscode';
import { AuthTokens } from '../types';

/**
 * Token Storage using VS Code SecretStorage API
 * Provides secure storage for JWT tokens
 */
export class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'o4o.accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'o4o.refreshToken';

  constructor(private secretStorage: vscode.SecretStorage) {}

  /**
   * Store authentication tokens securely
   */
  async storeTokens(tokens: AuthTokens): Promise<void> {
    await this.secretStorage.store(TokenStorage.ACCESS_TOKEN_KEY, tokens.accessToken);
    await this.secretStorage.store(TokenStorage.REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  /**
   * Retrieve access token
   */
  async getAccessToken(): Promise<string | undefined> {
    return await this.secretStorage.get(TokenStorage.ACCESS_TOKEN_KEY);
  }

  /**
   * Retrieve refresh token
   */
  async getRefreshToken(): Promise<string | undefined> {
    return await this.secretStorage.get(TokenStorage.REFRESH_TOKEN_KEY);
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    await this.secretStorage.delete(TokenStorage.ACCESS_TOKEN_KEY);
    await this.secretStorage.delete(TokenStorage.REFRESH_TOKEN_KEY);
  }

  /**
   * Check if user is authenticated (has access token)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }
}
