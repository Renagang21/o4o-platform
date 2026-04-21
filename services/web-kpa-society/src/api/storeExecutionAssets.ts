/**
 * Store Execution Assets API Client
 *
 * WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1
 * (renamed from storeLibrary.ts — store_library_items → store_execution_assets)
 *
 * Store Execution Assets CRUD: /api/v1/kpa/store/assets
 * Neture Public: /api/v1/neture/library/public/:id (unchanged)
 */

import { ApiClient } from './client';
import { apiClient } from './client';

// Neture public API is under /api/v1/neture (not /api/v1/kpa)
const NETURE_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/neture`
  : '/api/v1/neture';

const netureClient = new ApiClient(NETURE_API_BASE);

export interface NetureLibraryItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  imageUrl: string | null;
}

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

/** @deprecated Use StoreExecutionAsset */
export type StoreLibraryItem = StoreExecutionAsset;

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

/** @deprecated Use CreateStoreAssetParams */
export type CreateStoreLibraryParams = CreateStoreAssetParams;

/**
 * Neture 공개 자료 단건 조회 (published 상태만)
 * 인증 불필요
 */
export async function getNetureLibraryItem(
  id: string,
): Promise<{ success: boolean; data: NetureLibraryItem }> {
  return netureClient.get(`/library/public/${id}`);
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

/** @deprecated Use StoreAssetPaginatedResponse */
export type StoreLibraryPaginatedResponse = StoreAssetPaginatedResponse;

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

/** @deprecated Use getStoreExecutionAssets */
export async function getStoreLibraryItems(opts?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}): Promise<{ success: boolean; data: StoreAssetPaginatedResponse }> {
  return getStoreExecutionAssets(opts);
}

/**
 * Store 실행 자산 단건 조회
 */
export async function getStoreExecutionAsset(
  id: string,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return apiClient.get(`/store/assets/${id}`);
}

/** @deprecated Use getStoreExecutionAsset */
export async function getStoreLibraryItem(
  id: string,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return getStoreExecutionAsset(id);
}

/**
 * Store 실행 자산 생성
 */
export async function createStoreExecutionAsset(
  params: CreateStoreAssetParams,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return apiClient.post('/store/assets', params);
}

/** @deprecated Use createStoreExecutionAsset */
export async function createStoreLibraryItem(
  params: CreateStoreAssetParams,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return createStoreExecutionAsset(params);
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

/** @deprecated Use UpdateStoreAssetParams */
export type UpdateStoreLibraryParams = UpdateStoreAssetParams;

/**
 * Store 실행 자산 수정
 */
export async function updateStoreExecutionAsset(
  id: string,
  params: UpdateStoreAssetParams,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return apiClient.put(`/store/assets/${id}`, params);
}

/** @deprecated Use updateStoreExecutionAsset */
export async function updateStoreLibraryItem(
  id: string,
  params: UpdateStoreAssetParams,
): Promise<{ success: boolean; data: StoreExecutionAsset }> {
  return updateStoreExecutionAsset(id, params);
}

/**
 * Store 실행 자산 삭제 (soft-delete)
 */
export async function deleteStoreExecutionAsset(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/store/assets/${id}`);
}

/** @deprecated Use deleteStoreExecutionAsset */
export async function deleteStoreLibraryItem(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return deleteStoreExecutionAsset(id);
}
