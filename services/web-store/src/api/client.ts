/**
 * API 클라이언트 — Unified Store Workspace
 *
 * KPA `api/client.ts` 와 같은 fetch 래퍼(Bearer · 401 refresh · GET 404 재시도 · timeout)다.
 * 차이: base URL 이 module 상수가 아니라 **요청 시점의 서비스 문맥**(`lib/serviceContext`)에서 나온다.
 *   apiClient      → `${VITE_API_BASE_URL}/api/v1/<active service prefix>`  (KPA 의 `/api/v1/kpa` 자리)
 *   coreApiClient  → `${VITE_API_BASE_URL}/api/v1`
 */

import { getAccessToken } from '@o4o/auth-client';
import { tryRefreshToken } from './token-refresh';
import { apiV1Base, apiV1Service } from '../lib/serviceContext';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30_000;

export class ApiClient {
  private readonly resolveBase: () => string;

  constructor(resolveBase: () => string) {
    this.resolveBase = resolveBase;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.resolveBase()}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeout, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    // Cross-domain auth: Add Authorization header with Bearer token
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    // WO-O4O-FORUM-POST-EDIT-SAVE-STABILITY-FIX-V1: AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout ?? DEFAULT_TIMEOUT);

    try {
      // Retry on 404 for GET requests (Cloud Run cold start: routes not yet registered)
      const maxRetries = fetchOptions.method === 'GET' ? 2 : 0;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        // WO-KPA-PHARMACY-PATH-COMPLEXITY-AUDIT-V1:
        // credentials 제거 — authClient(localStorage 전략)와 동일하게 Bearer 토큰만 사용
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        if (response.status === 404 && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        if (!response.ok) {
          // 401: 토큰 갱신 후 재시도
          if (response.status === 401) {
            const newToken = await tryRefreshToken();
            if (newToken) {
              const retryResponse = await fetch(url, {
                ...fetchOptions,
                headers: { ...headers, 'Authorization': `Bearer ${newToken}` },
                signal: controller.signal,
              });
              if (retryResponse.ok) return retryResponse.json() as Promise<T>;
            }
          }

          const body = await response.json().catch(() => ({ message: 'Network error' }));
          const errorMsg = body.error?.message || body.message || (typeof body.error === 'string' ? body.error : null) || `HTTP error! status: ${response.status}`;
          const error: any = new Error(errorMsg);
          error.status = response.status;
          error.code = body.error?.code || body.code;
          error.data = body.data;
          throw error;
        }

        return response.json();
      }

      throw new Error('Request failed after retries');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutError: any = new Error('요청 시간이 초과되었습니다. 다시 시도해 주세요.');
        timeoutError.status = 408;
        timeoutError.code = 'REQUEST_TIMEOUT';
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(apiV1Service);

/** O4O 공통 도메인용 Core API client (서비스 prefix 없음) */
export const coreApiClient = new ApiClient(apiV1Base);
