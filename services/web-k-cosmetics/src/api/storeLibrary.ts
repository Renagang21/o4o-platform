/**
 * Store Library API Client — K-Cosmetics
 *
 * WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1
 * Adapted from GlycoPharm storeLibrary.ts for K-Cosmetics.
 *
 * Store Library CRUD: /api/v1/cosmetics/pharmacy/library
 */

import { api } from '../lib/apiClient';

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

export interface StoreLibraryPaginatedResponse {
  items: StoreLibraryItem[];
  page: number;
  limit: number;
  total: number;
}

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
  const res = await api.get(`/cosmetics/pharmacy/library${qs ? `?${qs}` : ''}`);
  return res.data as { success: boolean; data: StoreLibraryPaginatedResponse };
}
