/**
 * Store Execution Assets API Client
 *
 * WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1
 * (renamed from storeLibrary.ts — store_library_items → store_execution_assets)
 *
 * Store Execution Assets CRUD: /api/v1/kpa/store/assets
 *
 * WO-O4O-SUPPLIER-WORKSPACE-REALIGNMENT-AND-DISTRIBUTION-V1: 종전 "Neture Public /library/public/:id"
 * 클라이언트(`netureClient` · `NetureLibraryItem` · `getNetureLibraryItem`) RETIRE — backend route 부재 + 호출처 0.
 * 매장이 공급자 라이브러리를 보는 공식 경로는 Store Hub (`/hub/contents?sourceDomain=supplier-library`).
 */

import { apiClient } from './client';

export type AssetType = 'file' | 'content' | 'external-link';
export type UsageType = 'pop' | 'qr' | 'signage' | 'banner' | 'notice';

export interface StoreExecutionAsset {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  category: string | null;
  assetType: AssetType;
  usageType: UsageType | null;
  url: string | null;
  htmlContent: string | null;
  sourceType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreAssetParams {
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  assetType?: AssetType;
  usageType?: UsageType;
  url?: string;
  htmlContent?: string;
  sourceType?: string;
}

/**
 * Store 실행 자산 페이지네이션 응답
 */
export interface StoreAssetPaginatedResponse {
  items: StoreExecutionAsset[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Store 실행 자산 목록 조회 (페이지네이션)
 */
export async function getStoreExecutionAssets(opts?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  usageType?: UsageType;
}): Promise<{ success: boolean; data: StoreAssetPaginatedResponse }> {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.search) params.set('search', opts.search);
  if (opts?.category && opts.category !== 'all') params.set('category', opts.category);
  if (opts?.usageType && opts.usageType !== 'all' as any) params.set('usage_type', opts.usageType);
  const qs = params.toString();
  return apiClient.get(`/store/assets${qs ? `?${qs}` : ''}`);
}

/**
 * Store 실행 자산 단건 조회
 */
export async function getStoreExecutionAsset(
  id: string,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return apiClient.get(`/store/assets/${id}`);
}

/**
 * Store 실행 자산 생성
 */
export async function createStoreExecutionAsset(
  params: CreateStoreAssetParams,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return apiClient.post('/store/assets', params);
}

export interface UpdateStoreAssetParams {
  title?: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  usageType?: UsageType;
  url?: string;
  htmlContent?: string;
}

/**
 * Store 실행 자산 수정
 */
export async function updateStoreExecutionAsset(
  id: string,
  params: UpdateStoreAssetParams,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return apiClient.put(`/store/assets/${id}`, params);
}

/**
 * Store 실행 자산 삭제 (soft-delete)
 */
export async function deleteStoreExecutionAsset(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/store/assets/${id}`);
}

