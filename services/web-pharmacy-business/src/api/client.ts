/**
 * API 클라이언트 - KPA Society
 *
 * API Base URL: https://api.neture.co.kr/api/v1/kpa
 * All KPA Society API calls go through the /api/v1/kpa namespace
 *
 * Cross-domain authentication:
 * - Uses Authorization header with Bearer token
 * - Token is stored in localStorage by AuthContext
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';

// VITE_API_BASE_URL is set via Docker build-arg in deploy workflow
// Default: /api/v1/kpa (relative path for local development)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/kpa`
  : '/api/v1/kpa';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30_000;

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
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

export const apiClient = new ApiClient(API_BASE_URL);

// WO-O4O-SURVEY-CORE-PHASE1-V1: O4O 공통 도메인용 Core API client (no /kpa prefix)
const CORE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

export const coreApiClient = new ApiClient(CORE_API_BASE_URL);
