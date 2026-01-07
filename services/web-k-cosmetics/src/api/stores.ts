/**
 * Stores API 서비스
 * K-Cosmetics 매장 데이터 조회
 */

import type { Store } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export interface StoresResponse {
  data: Store[];
  total: number;
  page: number;
  limit: number;
}

export interface StoreResponse {
  data: Store;
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const storesApi = {
  // 매장 목록 조회
  getStores: (params?: {
    region?: string;
    serviceTag?: string;
    limit?: number;
    page?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.region) query.set('region', params.region);
    if (params?.serviceTag) query.set('serviceTag', params.serviceTag);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const queryStr = query.toString();
    return fetchApi<StoresResponse>(`/api/v1/cosmetics/stores${queryStr ? `?${queryStr}` : ''}`);
  },

  // 매장 상세 조회
  getStore: (idOrSlug: string) =>
    fetchApi<StoreResponse>(`/api/v1/cosmetics/stores/${idOrSlug}`),
};
