/**
 * Browser Auth Manager
 * Handles JWT authentication using localStorage and httpOnly cookies
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
const ACCESS_TOKEN_KEY = 'o4o_token';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string; // May be in httpOnly cookie
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

export class BrowserAuthManager {
  /**
   * Login with email and password
   * Stores accessToken in localStorage, refreshToken in httpOnly cookie
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include', // Include cookies for httpOnly
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();

      // Store accessToken in localStorage
      localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);

      // refreshToken is automatically stored in httpOnly cookie by server
      return {
        accessToken: data.data.accessToken,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refreshToken from httpOnly cookie
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Send httpOnly cookie automatically
      });

      if (!response.ok) {
        // Refresh failed - clear tokens and require re-login
        this.clearTokens();
        throw new Error('Session expired. Please login again.');
      }

      const data: AuthResponse = await response.json();

      // Update accessToken in localStorage
      localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);

      return data.data.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get valid access token
   * Automatically refreshes if expired
   */
  async getValidToken(): Promise<string> {
    let token = this.getAccessToken();

    if (!token) {
      throw new Error('Not authenticated. Please login first.');
    }

    // Check if token is expired
    if (this.isTokenExpired(token)) {
      token = await this.refreshToken();
    }

    return token;
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired(token);
  }

  /**
   * Check if JWT token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.parseJWT(token);
      if (!payload.exp) return false;

      // Add 30 second buffer
      const expirationTime = payload.exp * 1000;
      const now = Date.now();

      return now >= expirationTime - 30000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Parse JWT token (simple base64 decode)
   */
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  /**
   * Logout - clear all tokens
   */
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    // httpOnly cookie will be cleared by server or expire naturally
  }

  /**
   * Logout and call logout endpoint
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }
}

// Singleton instance
export const authManager = new BrowserAuthManager();
