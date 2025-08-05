import axios, { AxiosInstance } from 'axios';
import type { LoginCredentials, AuthResponse } from './types';

export class AuthClient {
  private baseURL: string;
  public api: AxiosInstance;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
  }

  async checkSession(): Promise<{ isAuthenticated: boolean; user?: any }> {
    try {
      const response = await this.api.get('/auth/sso/check');
      return response.data;
    } catch (error) {
      return { isAuthenticated: false };
    }
  }
}

// Singleton instance
export const authClient = new AuthClient(
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000/api/v1'
    : '/api/v1'
);