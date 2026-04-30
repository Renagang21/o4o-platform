/**
 * Pharmacy Products API — K-Cosmetics B2B 상품 카탈로그
 *
 * WO-O4O-HUB-TO-STORE-UX-BRIDGE-V1
 *
 * GlycoPharm pharmacyProducts 패턴 동일, /cosmetics/ 네임스페이스 사용
 */

import { api } from '../lib/apiClient';

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
  /** 내 매장 취급 여부 */
  isAdded: boolean;
}

export interface CatalogResponse {
  success: boolean;
  data: CatalogProduct[];
  pagination: { total: number; limit: number; offset: number };
}

export async function getCatalog(params?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<CatalogResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.limit != null) searchParams.set('limit', params.limit.toString());
  if (params?.offset != null) searchParams.set('offset', params.offset.toString());
  searchParams.set('service_key', 'k-cosmetics');

  const queryString = searchParams.toString();
  const res = await api.get(`/cosmetics/pharmacy/products/catalog${queryString ? `?${queryString}` : ''}`);
  return res.data;
}

export async function applyBySupplyProductId(supplyProductId: string): Promise<void> {
  await api.post('/cosmetics/pharmacy/products/apply', {
    supplyProductId,
    service_key: 'k-cosmetics',
  });
}
