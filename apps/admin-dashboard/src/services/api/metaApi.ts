/**
 * Post Meta API Service (Admin Dashboard)
 * Normalized post_meta table 접근용 API 클라이언트
 * Phase 4-2: post.meta 직접 접근 대체
 */

import axios from 'axios';

// API Base URL 설정 (postApi.ts와 동일한 로직)
const removeTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const ensureApiSegment = (value: string): string => {
  const normalized = removeTrailingSlashes(value.trim());
  if (!normalized) {
    return '/api';
  }

  if (/\/api(\/|$)/.test(normalized)) {
    return normalized;
  }

  return `${normalized}/api`;
};

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const raw = String(import.meta.env.VITE_API_URL).trim();
    return ensureApiSegment(raw);
  }

  if (window.location.hostname === 'admin.neture.co.kr') {
    return ensureApiSegment('https://api.neture.co.kr');
  }

  return ensureApiSegment('http://localhost:3001');
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export interface UpsertMetaDto {
  meta_key: string;
  meta_value: unknown;
}

export interface IncrementMetaDto {
  by?: number;
}

export interface MetaItemResponse {
  id: string;
  post_id: string;
  meta_key: string;
  meta_value: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface MetaListResponse {
  data: MetaItemResponse[];
  meta: {
    total: number;
  };
}

export interface MetaSingleResponse {
  data: MetaItemResponse | null;
}

export interface MetaDeleteResponse {
  data: {
    deleted: boolean;
  };
}

/**
 * Post Meta API Client
 */
export const metaApi = {
  async list(postId: string): Promise<MetaListResponse> {
    const response = await apiClient.get<MetaListResponse>(`/posts/${postId}/meta`);
    return response.data;
  },

  async get(postId: string, key: string): Promise<MetaSingleResponse> {
    const response = await apiClient.get<MetaSingleResponse>(`/posts/${postId}/meta/${key}`);
    return response.data;
  },

  async set(postId: string, payload: UpsertMetaDto): Promise<MetaSingleResponse> {
    const response = await apiClient.put<MetaSingleResponse>(`/posts/${postId}/meta`, payload);
    return response.data;
  },

  async delete(postId: string, key: string): Promise<MetaDeleteResponse> {
    const response = await apiClient.delete<MetaDeleteResponse>(`/posts/${postId}/meta/${key}`);
    return response.data;
  },

  async increment(postId: string, key: string, by = 1): Promise<MetaSingleResponse> {
    const response = await apiClient.patch<MetaSingleResponse>(
      `/posts/${postId}/meta/${key}/increment`,
      { by }
    );
    return response.data;
  },

  async getBatch(postIds: string[], key?: string): Promise<Map<string, MetaItemResponse[]>> {
    const results = await Promise.all(
      postIds.map(async (postId) => {
        try {
          if (key) {
            const response = await metaApi.get(postId, key);
            return { postId, items: response.data ? [response.data] : [] };
          } else {
            const response = await metaApi.list(postId);
            return { postId, items: response.data };
          }
        } catch (error) {
          console.error(`Failed to fetch meta for post ${postId}:`, error);
          return { postId, items: [] };
        }
      })
    );

    const map = new Map<string, MetaItemResponse[]>();
    results.forEach(({ postId, items }) => {
      map.set(postId, items);
    });
    return map;
  },
};

export function getMetaValue<T = unknown>(
  items: MetaItemResponse[],
  key: string,
  defaultValue?: T
): T | undefined {
  const item = items.find((i) => i.meta_key === key);
  return item ? (item.meta_value as T) : defaultValue;
}
