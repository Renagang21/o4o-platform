/**
 * Pharmacy Products API Client — GlycoPharm
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 *
 * B2B 상품 카탈로그 조회 (Hub B2B Revenue Section용).
 * KPA pharmacyProducts 클라이언트 패턴 동일.
 */

import { api } from '@/lib/apiClient';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  purpose: string;
  distributionType: string;
  createdAt: string;
  updatedAt: string;
  supplierId: string;
  supplierName: string;
  supplierLogoUrl: string | null;
  supplierCategory: string | null;
  isApplied: boolean;
  isApproved: boolean;
  isListed: boolean;
}

export interface CatalogResponse {
  success: boolean;
  data: CatalogProduct[];
  pagination: { total: number; limit: number; offset: number };
}

/**
 * 플랫폼 B2B 상품 카탈로그 조회
 */
export async function getCatalog(params?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<CatalogResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.limit != null) searchParams.set('limit', params.limit.toString());
  if (params?.offset != null) searchParams.set('offset', params.offset.toString());

  const queryString = searchParams.toString();
  const res = await api.get(`/kpa/pharmacy/products/catalog${queryString ? `?${queryString}` : ''}`);
  return res.data;
}
