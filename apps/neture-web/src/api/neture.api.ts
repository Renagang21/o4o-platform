/**
 * Neture API Client
 *
 * Phase D-2: Neture Web Server (B2C) 구축
 * API 호출은 오직 Neture API만 사용
 */

import axios from 'axios';
import type {
  Product,
  Partner,
  ListResponse,
  SingleResponse,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/neture`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Product API
// ============================================================================

export interface ListProductsParams {
  page?: number;
  limit?: number;
  partner_id?: string;
  category?: string;
  status?: string;
  is_featured?: boolean;
  sort?: 'created_at' | 'price' | 'name' | 'view_count';
  order?: 'asc' | 'desc';
}

export async function listProducts(
  params: ListProductsParams = {}
): Promise<ListResponse<Product>> {
  const response = await apiClient.get<ListResponse<Product>>('/products', {
    params,
  });
  return response.data;
}

export interface SearchProductsParams {
  q: string;
  page?: number;
  limit?: number;
}

export async function searchProducts(
  params: SearchProductsParams
): Promise<ListResponse<Product>> {
  const response = await apiClient.get<ListResponse<Product>>('/products/search', {
    params,
  });
  return response.data;
}

export async function getProduct(id: string): Promise<Product> {
  const response = await apiClient.get<SingleResponse<Product>>(`/products/${id}`);
  return response.data.data;
}

// ============================================================================
// Partner API
// ============================================================================

export interface ListPartnersParams {
  page?: number;
  limit?: number;
  type?: string;
  sort?: 'created_at' | 'name';
  order?: 'asc' | 'desc';
}

export async function listPartners(
  params: ListPartnersParams = {}
): Promise<ListResponse<Partner>> {
  const response = await apiClient.get<ListResponse<Partner>>('/partners', {
    params,
  });
  return response.data;
}

export async function getPartner(id: string): Promise<Partner> {
  const response = await apiClient.get<SingleResponse<Partner>>(`/partners/${id}`);
  return response.data.data;
}

// ============================================================================
// API Client Export
// ============================================================================

export const netureApi = {
  products: {
    list: listProducts,
    search: searchProducts,
    get: getProduct,
  },
  partners: {
    list: listPartners,
    get: getPartner,
  },
};

export default netureApi;
