/**
 * Neture Products API
 * B2B 조달 상품 조회
 */

import type { Product } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const productsApi = {
  // 상품 목록 조회
  getProducts: (params?: {
    categoryId?: string;
    supplierId?: string;
    status?: string;
    limit?: number;
    page?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set('category', params.categoryId);
    if (params?.supplierId) query.set('supplier', params.supplierId);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const queryStr = query.toString();
    return fetchApi<ProductsResponse>(`/api/v1/neture/products${queryStr ? `?${queryStr}` : ''}`);
  },

  // 상품 상세 조회
  getProduct: (id: string) =>
    fetchApi<{ data: Product }>(`/api/v1/neture/products/${id}`),
};
