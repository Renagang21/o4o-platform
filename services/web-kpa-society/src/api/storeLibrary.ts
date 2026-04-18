/**
 * Store Library API Client
 *
 * WO-O4O-STORE-LIBRARY-FOUNDATION-V1
 * WO-O4O-NETURE-TO-STORE-MANUAL-FLOW-V1
 * WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1
 * WO-O4O-LIBRARY-SELECTOR-PAGINATION-V1
 *
 * Neture Public 엔드포인트: /api/v1/neture/library/public/:id
 * Store Library CRUD: /api/v1/kpa/pharmacy/library
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

export interface StoreLibraryItem {
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
  url: string | null;
  htmlContent: string | null;
  sourceType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreLibraryParams {
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  assetType?: AssetType;
  url?: string;
  htmlContent?: string;
  sourceType?: string;
}

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
 * Store 자료실 페이지네이션 응답
 */
export interface StoreLibraryPaginatedResponse {
  items: StoreLibraryItem[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Store 자료실 목록 조회 (페이지네이션)
 */
export async function getStoreLibraryItems(opts?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}): Promise<{ success: boolean; data: StoreLibraryPaginatedResponse }> {
  const params = new URLSearchParams();
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.search) params.set('search', opts.search);
  if (opts?.category && opts.category !== 'all') params.set('category', opts.category);
  const qs = params.toString();
  return apiClient.get(`/pharmacy/library${qs ? `?${qs}` : ''}`);
}

/**
 * Store 자료실 단건 조회
 */
export async function getStoreLibraryItem(
  id: string,
): Promise<{ success: boolean; data: StoreLibraryItem }> {
  return apiClient.get(`/pharmacy/library/${id}`);
}

/**
 * Store 자료실 항목 생성
 */
export async function createStoreLibraryItem(
  params: CreateStoreLibraryParams,
): Promise<{ success: boolean; data: StoreLibraryItem }> {
  return apiClient.post('/pharmacy/library', params);
}

export interface UpdateStoreLibraryParams {
  title?: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  url?: string;
  htmlContent?: string;
}

/**
 * Store 자료실 항목 수정
 */
export async function updateStoreLibraryItem(
  id: string,
  params: UpdateStoreLibraryParams,
): Promise<{ success: boolean; data: StoreLibraryItem }> {
  return apiClient.put(`/pharmacy/library/${id}`, params);
}

/**
 * Store 자료실 항목 삭제 (soft-delete)
 */
export async function deleteStoreLibraryItem(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`/pharmacy/library/${id}`);
}
