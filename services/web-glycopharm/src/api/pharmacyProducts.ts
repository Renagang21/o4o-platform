/**
 * Pharmacy Products API Client — GlycoPharm
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 *
 * B2B 상품 카탈로그 조회 (Hub B2B Revenue Section용).
 * KPA pharmacyProducts 클라이언트 패턴 동일.
 */

import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

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
  const url = `${API_BASE_URL}/api/v1/kpa/pharmacy/products/catalog${queryString ? `?${queryString}` : ''}`;

  const accessToken = getAccessToken();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Catalog API error: ${response.status}`);
  }

  return response.json();
}
