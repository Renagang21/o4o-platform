/**
 * WorkingContent API Client
 *
 * WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1 Phase 2
 *
 * CRUD + Publish for kpa_working_contents
 */

import { getAccessToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface WorkingContentItem {
  id: string;
  source_content_id: string;
  title: string;
  tags: string[];
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkingContentDetail extends WorkingContentItem {
  owner_id: string;
  edited_blocks: Array<{
    type: string;
    content?: string;
    url?: string;
    items?: string[];
  }>;
}

export interface WorkingContentListResponse {
  items: WorkingContentItem[];
  total: number;
  page: number;
  limit: number;
}

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || body?.error || `API error ${res.status}`);
  return body as T;
}

/** 목록 조회 */
export async function fetchWorkingContents(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}): Promise<WorkingContentListResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  if (params?.category) qs.set('category', params.category);
  const query = qs.toString() ? `?${qs}` : '';
  const res = await authFetch<{ success: boolean; data: WorkingContentListResponse }>(
    `/api/v1/kpa/operator/working-contents${query}`,
  );
  return res.data;
}

/** 상세 조회 */
export async function fetchWorkingContent(id: string): Promise<WorkingContentDetail> {
  const res = await authFetch<{ success: boolean; data: WorkingContentDetail }>(
    `/api/v1/kpa/operator/working-contents/${id}`,
  );
  return res.data;
}

/** 편집 */
export async function updateWorkingContent(
  id: string,
  body: {
    title?: string;
    edited_blocks?: object[];
    tags?: string[];
    category?: string | null;
  },
): Promise<WorkingContentDetail> {
  const res = await authFetch<{ success: boolean; data: WorkingContentDetail }>(
    `/api/v1/kpa/operator/working-contents/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  return res.data;
}

/** 삭제 */
export async function deleteWorkingContent(id: string): Promise<void> {
  await authFetch(`/api/v1/kpa/operator/working-contents/${id}`, { method: 'DELETE' });
}

/** 발행 (→ asset snapshot) */
export async function publishWorkingContent(id: string): Promise<{ snapshotId: string }> {
  const res = await authFetch<{ success: boolean; data: { snapshotId: string } }>(
    `/api/v1/kpa/operator/working-contents/${id}/publish`,
    { method: 'POST', body: '{}' },
  );
  return res.data;
}
