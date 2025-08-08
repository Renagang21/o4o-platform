/**
 * API Client with authentication support
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Determine API URL based on environment
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      this.baseUrl = 'http://localhost:4000/api/v1';
    } else if (hostname === 'admin.neture.co.kr') {
      this.baseUrl = 'https://api.neture.co.kr/api/v1';
    } else {
      this.baseUrl = '/api/v1';
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async fetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const { skipAuth = false, headers = {}, ...restOptions } = options;

    const finalHeaders = skipAuth
      ? headers
      : { ...this.getAuthHeaders(), ...headers };

    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    const response = await fetch(fullUrl, {
      ...restOptions,
      headers: finalHeaders as HeadersInit,
    });

    // Handle 401 errors (unauthorized)
    if (response.status === 401 && !skipAuth) {
      // Clear tokens and redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    return response;
  }

  async get(url: string, options?: FetchOptions): Promise<any> {
    const response = await this.fetch(url, { ...options, method: 'GET' });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async post(url: string, data?: any, options?: FetchOptions): Promise<any> {
    const response = await this.fetch(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async put(url: string, data?: any, options?: FetchOptions): Promise<any> {
    const response = await this.fetch(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async delete(url: string, options?: FetchOptions): Promise<any> {
    const response = await this.fetch(url, { ...options, method: 'DELETE' });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }
}

export const apiClient = new ApiClient();