/**
 * API 클라이언트 — Unified Store Workspace
 *
 * KPA `api/client.ts` 와 같은 fetch 래퍼(Bearer · 401 refresh · GET 404 재시도 · timeout)다.
 * 차이: base URL 이 module 상수가 아니라 **요청 시점의 서비스 문맥**(`lib/serviceContext`)에서 나온다.
 *   apiClient      → `${VITE_API_BASE_URL}/api/v1/<active service prefix>`  (KPA 의 `/api/v1/kpa` 자리)
 *   coreApiClient  → `${VITE_API_BASE_URL}/api/v1`
 */

import { getAccessToken } from '@o4o/auth-client';
import { storeScopedFetch } from './storeScopedFetch';
import { readStoreJson } from './storeJsonFetch';
import { apiV1Base, apiV1Service } from '../lib/serviceContext';
import { captureStoreOrganizationHeaders } from '../lib/storeOrganizationHeader';

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
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) url.searchParams.append(key, String(value));
    }
    return url.toString();
  }

  private captureHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    new Headers(extra).forEach((value, name) => headers.set(name, value));
    return captureStoreOrganizationHeaders(headers);
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeout, ...fetchOptions } = options;
    const target = this.buildUrl(endpoint, params);
    const captured = this.captureHeaders(options.headers);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeout ?? DEFAULT_TIMEOUT);
    const request = { ...fetchOptions, headers: captured, signal: abort.signal };
    try {
      const retries = fetchOptions.method === 'GET' ? 2 : 0;
      for (let attempt = 0; attempt <= retries; attempt++) {
        // This client historically reports the original 401 if its replay fails.
        const response = await storeScopedFetch(target, request, undefined, { retainOriginalOnRetryFailure: true, injectAccessToken: false });
        if (response.status === 404 && attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        if (response.ok) return response.json();
        return await readStoreJson<T>(response, (body, status) => {
          const message = body.error?.message || body.message || (typeof body.error === 'string' ? body.error : null) || `HTTP error! status: ${status}`;
          return Object.assign(new Error(message), { status, code: body.error?.code || body.code, data: body.data });
        });
      }
      throw new Error('Request failed after retries');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw Object.assign(new Error('요청 시간이 초과되었습니다. 다시 시도해 주세요.'), { status: 408, code: 'REQUEST_TIMEOUT' });
      }
      throw error;
    } finally {
      clearTimeout(timer);
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
