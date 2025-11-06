/**
 * Post Meta API Service
 * Normalized post_meta table 접근용 API 클라이언트
 * Phase 4-2: post.meta 직접 접근 대체
 */

import { apiClient } from './api';

export interface UpsertMetaDto {
  meta_key: string;
  meta_value: unknown;
}

export interface IncrementMetaDto {
  by?: number; // Default: 1
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
  /**
   * List all metadata for a post
   */
  async list(postId: string): Promise<MetaListResponse> {
    const response = await apiClient.get<MetaListResponse>(`/v1/posts/${postId}/meta`);
    return response.data;
  },

  /**
   * Get metadata by key
   */
  async get(postId: string, key: string): Promise<MetaSingleResponse> {
    const response = await apiClient.get<MetaSingleResponse>(`/v1/posts/${postId}/meta/${key}`);
    return response.data;
  },

  /**
   * Upsert metadata (create or update)
   */
  async set(postId: string, payload: UpsertMetaDto): Promise<MetaSingleResponse> {
    const response = await apiClient.put<MetaSingleResponse>(`/v1/posts/${postId}/meta`, payload);
    return response.data;
  },

  /**
   * Delete metadata by key
   */
  async delete(postId: string, key: string): Promise<MetaDeleteResponse> {
    const response = await apiClient.delete<MetaDeleteResponse>(`/v1/posts/${postId}/meta/${key}`);
    return response.data;
  },

  /**
   * Increment counter metadata
   */
  async increment(postId: string, key: string, by = 1): Promise<MetaSingleResponse> {
    const response = await apiClient.patch<MetaSingleResponse>(
      `/v1/posts/${postId}/meta/${key}/increment`,
      { by }
    );
    return response.data;
  },

  /**
   * Batch fetch metadata for multiple posts
   * Uses Promise.all for parallel requests (no batch endpoint yet)
   */
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

/**
 * Helper: Extract meta value by key from list
 */
export function getMetaValue<T = unknown>(
  items: MetaItemResponse[],
  key: string,
  defaultValue?: T
): T | undefined {
  const item = items.find((i) => i.meta_key === key);
  return item ? (item.meta_value as T) : defaultValue;
}
