/**
 * Store Library API Client — GlycoPharm
 *
 * WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1
 * Adapted from KPA storeLibrary.ts for GlycoPharm's Axios-based api client.
 *
 * Store Library CRUD: /api/v1/glycopharm/pharmacy/library
 * Neture Public: /api/v1/neture/library/public/:id
 */

import { api } from '@/lib/apiClient';

export interface NetureLibraryItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  imageUrl: string | null;
}

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
}

export interface UpdateStoreLibraryParams {
  title?: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
}

export interface StoreLibraryPaginatedResponse {
  items: StoreLibraryItem[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Neture 공개 자료 단건 조회 (published 상태만, 인증 불필요)
 */
export async function getNetureLibraryItem(
  id: string,
): Promise<{ success: boolean; data: NetureLibraryItem }> {
  const res = await api.get(`/neture/library/public/${id}`);
  return res.data as { success: boolean; data: NetureLibraryItem };
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
  const res = await api.get(`/glycopharm/pharmacy/library${qs ? `?${qs}` : ''}`);
  return res.data as { success: boolean; data: StoreLibraryPaginatedResponse };
}

/**
 * Store 자료실 단건 조회
 */
export async function getStoreLibraryItem(
  id: string,
): Promise<{ success: boolean; data: StoreLibraryItem }> {
  const res = await api.get(`/glycopharm/pharmacy/library/${id}`);
  return res.data as { success: boolean; data: StoreLibraryItem };
}

/**
 * Store 자료실 항목 생성
 */
export async function createStoreLibraryItem(
  params: CreateStoreLibraryParams,
): Promise<{ success: boolean; data: StoreLibraryItem }> {
  const res = await api.post('/glycopharm/pharmacy/library', params);
  return res.data as { success: boolean; data: StoreLibraryItem };
}

/**
 * Store 자료실 항목 수정
 */
export async function updateStoreLibraryItem(
  id: string,
  params: UpdateStoreLibraryParams,
): Promise<{ success: boolean; data: StoreLibraryItem }> {
  const res = await api.put(`/glycopharm/pharmacy/library/${id}`, params);
  return res.data as { success: boolean; data: StoreLibraryItem };
}

/**
 * Store 자료실 항목 삭제 (soft-delete)
 */
export async function deleteStoreLibraryItem(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const res = await api.delete(`/glycopharm/pharmacy/library/${id}`);
  return res.data as { success: boolean; message: string };
}
