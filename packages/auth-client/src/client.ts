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
    this.api.interceptors.request.use((config: any) => {
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
      const response = await this.api.get('/accounts/sso/check');
      return response.data;
    } catch (error) {
      return { isAuthenticated: false };
    }
  }
}

// Singleton instance
// Use environment variable or default based on hostname
const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000/api/v1';
  }
  
  // Check for environment variable first (Vite specific)
  try {
    // @ts-ignore - Vite environment variable
    if ((globalThis as any).import?.meta?.env?.VITE_API_URL) {
      // @ts-ignore
      return (globalThis as any).import.meta.env.VITE_API_URL;
    }
  } catch {
    // Ignore if import.meta is not available
  }
  
  // Check window global variable (for runtime config)
  if ((window as any).__API_URL__) {
    return (window as any).__API_URL__;
  }
  
  // Fallback to hostname-based detection
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000/api/v1';
  } else if (hostname === 'admin.neture.co.kr' || hostname === 'www.neture.co.kr') {
    return 'https://api.neture.co.kr/api/v1';
  }
  
  // Default fallback
  return '/api/v1';
};

export const authClient = new AuthClient(getApiUrl());