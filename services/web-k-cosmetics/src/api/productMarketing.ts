/**
 * Product Marketing API Client — K-Cosmetics
 *
 * WO-O4O-PRODUCT-MARKETING-POP-BUILDER-EXTRACTION-V1
 *
 * KPA-Society canonical productMarketing API 이식.
 * 상품별 마케팅 자산 그래프 조회/연결/해제.
 * API: /api/v1/cosmetics/pharmacy/products/:productId/marketing
 */

import { api } from '@/lib/apiClient';

export interface ProductMarketingLink {
  id: string;
  assetType: 'qr' | 'library' | 'pop' | 'signage';
  assetId: string;
  createdAt: string;
}

export interface ProductQrAsset {
  id: string;
  title: string;
  slug: string;
  landingType: string;
  isActive: boolean;
  createdAt: string;
  scanCount: number;
}

export interface ProductLibraryAsset {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ProductMarketingSummary {
  totalLinks: number;
  qrCount: number;
  libraryCount: number;
  totalScans: number;
}

export interface ProductMarketingData {
  productId: string;
  links: ProductMarketingLink[];
  qrAssets: ProductQrAsset[];
  libraryAssets: ProductLibraryAsset[];
  summary: ProductMarketingSummary;
}

export async function getProductMarketing(
  productId: string,
): Promise<{ success: boolean; data: ProductMarketingData }> {
  const res = await api.get<{ success: boolean; data: ProductMarketingData }>(
    `/cosmetics/pharmacy/products/${productId}/marketing`,
  );
  return res.data;
}

export async function linkProductMarketingAsset(
  productId: string,
  assetType: string,
  assetId: string,
): Promise<{ success: boolean; data: ProductMarketingLink | null }> {
  const res = await api.post<{ success: boolean; data: ProductMarketingLink | null }>(
    `/cosmetics/pharmacy/products/${productId}/marketing`,
    { assetType, assetId },
  );
  return res.data;
}

export async function unlinkProductMarketingAsset(
  productId: string,
  linkId: string,
): Promise<{ success: boolean }> {
  const res = await api.delete<{ success: boolean }>(
    `/cosmetics/pharmacy/products/${productId}/marketing/${linkId}`,
  );
  return res.data;
}
