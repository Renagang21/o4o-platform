/**
 * Neture Products API
 * B2B 조달 상품 조회
 */

import type { Product } from '../types';
import { api } from '../lib/apiClient';

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export const productsApi = {
  // 상품 목록 조회
  getProducts: async (params?: {
    categoryId?: string;
    supplierId?: string;
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<ProductsResponse> => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set('category', params.categoryId);
    if (params?.supplierId) query.set('supplier', params.supplierId);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const queryStr = query.toString();
    const { data } = await api.get(`/neture/products${queryStr ? `?${queryStr}` : ''}`);
    return data;
  },

  // 상품 상세 조회
  getProduct: async (id: string): Promise<{ data: Product }> => {
    const { data } = await api.get(`/neture/products/${id}`);
    return data;
  },
};
