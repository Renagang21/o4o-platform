/**
 * Store Library API Client
 *
 * WO-O4O-STORE-LIBRARY-FOUNDATION-V1
 * WO-O4O-NETURE-TO-STORE-MANUAL-FLOW-V1
 * WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1
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
 * Store 자료실 목록 조회
 */
export async function getStoreLibraryItems(): Promise<{ success: boolean; data: StoreLibraryItem[] }> {
  return apiClient.get('/pharmacy/library');
}
