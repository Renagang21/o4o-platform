/**
 * Pharmacy Products API Client
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 *
 * POST /pharmacy/products/apply          — 상품 판매 신청
 * GET  /pharmacy/products/applications   — 내 신청 목록
 * GET  /pharmacy/products/approved       — 승인된 상품 목록
 * GET  /pharmacy/products/listings       — 내 매장 진열 상품
 * PUT  /pharmacy/products/listings/:id   — 진열 상품 수정
 */

import { apiClient } from './client';

export interface ProductApplication {
  id: string;
  organization_id: string;
  service_key: string;
  external_product_id: string;
  product_name: string;
  product_metadata: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductListing {
  id: string;
  organization_id: string;
  service_key: string;
  external_product_id: string;
  product_name: string;
  product_metadata: Record<string, unknown>;
  retail_price: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 상품 판매 신청
 */
export async function applyProduct(params: {
  externalProductId: string;
  productName: string;
  productMetadata?: Record<string, unknown>;
}): Promise<{ success: boolean; data: ProductApplication }> {
  return apiClient.post('/pharmacy/products/apply', params);
}

/**
 * 내 신청 목록 조회
 */
export async function getApplications(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ProductApplication>> {
  return apiClient.get('/pharmacy/products/applications', params);
}

/**
 * 승인된 상품 목록
 */
export async function getApprovedProducts(): Promise<{ success: boolean; data: ProductApplication[] }> {
  return apiClient.get('/pharmacy/products/approved');
}

/**
 * 내 매장 진열 상품 목록
 */
export async function getListings(): Promise<{ success: boolean; data: ProductListing[] }> {
  return apiClient.get('/pharmacy/products/listings');
}

/**
 * 진열 상품 수정
 */
export async function updateListing(
  id: string,
  params: {
    retailPrice?: number;
    isActive?: boolean;
    displayOrder?: number;
  }
): Promise<{ success: boolean; data: ProductListing }> {
  return apiClient.put(`/pharmacy/products/listings/${id}`, params);
}
