import axios, { AxiosInstance } from 'axios';
import { TokenStorage } from './tokenStorage';
import { LoginCredentials, AuthResponse, AuthTokens } from '../types';

/**
 * Authentication Manager
 * Handles login, token refresh, and JWT management
 */
export class AuthManager {
  private static readonly API_BASE_URL = 'https://api.neture.co.kr';
  private apiClient: AxiosInstance;

  constructor(private tokenStorage: TokenStorage) {
    this.apiClient = axios.create({
      baseURL: AuthManager.API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Login to O4O Platform
   * @param credentials User email and password
   * @returns Authentication tokens
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const response = await this.apiClient.post<AuthResponse>(
        '/api/v1/auth/login',
        credentials
      );

      if (!response.data.success) {
        throw new Error('Login failed: Invalid response format');
      }

      const tokens: AuthTokens = {
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken,
      };

      // Store tokens securely
      await this.tokenStorage.storeTokens(tokens);

      return tokens;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Login failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns New authentication tokens
   */
  async refreshToken(): Promise<AuthTokens> {
    try {
      const refreshToken = await this.tokenStorage.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available. Please login again.');
      }

      const response = await this.apiClient.post<AuthResponse>(
        '/api/v1/auth/refresh',
        { refreshToken }
      );

      if (!response.data.success) {
        throw new Error('Token refresh failed: Invalid response format');
      }

      const tokens: AuthTokens = {
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken,
      };

      // Update stored tokens
      await this.tokenStorage.storeTokens(tokens);

      return tokens;
    } catch (error: any) {
      // If refresh fails, clear tokens and require re-login
      await this.tokenStorage.clearTokens();

      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Token refresh failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get current access token (refresh if needed)
   * @returns Valid access token
   */
  async getValidToken(): Promise<string> {
    const accessToken = await this.tokenStorage.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    // TODO: Add JWT expiration check and auto-refresh if needed
    // For now, we assume the token is valid
    return accessToken;
  }

  /**
   * Logout (clear all tokens)
   */
  async logout(): Promise<void> {
    await this.tokenStorage.clearTokens();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.tokenStorage.isAuthenticated();
  }
}
