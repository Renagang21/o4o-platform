/**
 * Product Marketing API Client
 *
 * WO-O4O-PRODUCT-MARKETING-GRAPH-V1
 *
 * 상품별 마케팅 자산 그래프 조회/연결/해제.
 * API: /api/v1/kpa/pharmacy/products/:productId/marketing
 */

import { apiClient } from './client';

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
  return apiClient.get(`/pharmacy/products/${productId}/marketing`);
}

export async function linkProductMarketingAsset(
  productId: string,
  assetType: string,
  assetId: string,
): Promise<{ success: boolean; data: ProductMarketingLink | null }> {
  return apiClient.post(`/pharmacy/products/${productId}/marketing`, {
    assetType,
    assetId,
  });
}

export async function unlinkProductMarketingAsset(
  productId: string,
  linkId: string,
): Promise<{ success: boolean }> {
  return apiClient.delete(`/pharmacy/products/${productId}/marketing/${linkId}`);
}
