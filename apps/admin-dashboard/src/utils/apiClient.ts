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
      // Phase 6-7 Cookie Auth Primary: 이 레거시 클라이언트는 localStorage 토큰만 보냈다.
      // 쿠키 전략에서는 localStorage 가 비어 있어 항상 401 → 강제 로그아웃이었다.
      credentials: 'include',
    });

    // 401 을 여기서 로그아웃으로 확정하지 않는다.
    //   이 클라이언트에는 refresh 절차가 없어, access token 만 만료된 정상 세션도
    //   localStorage 를 비우고 /login 으로 하드 이동시켜 세션을 잃게 만들었다.
    //   인증 만료 판정과 로그아웃은 canonical 인증 계약(authClient / 라우트 가드)이 담당한다.
    if (response.status === 401 && !skipAuth) {
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