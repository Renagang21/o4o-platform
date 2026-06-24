/**
 * Content Hub API Client — KPA 운영자 콘텐츠 허브 (kpa_contents) 조회
 *
 * WO-O4O-KPA-QR-CONTENT-PICKER-V1
 *
 * QR 템플릿의 '콘텐츠 허브' 대상 선택 picker 에서 사용한다.
 * 목록/단건 조회만 제공 — 생성/수정은 OperatorContentHubPage 가 담당.
 *
 * Backend: GET /api/v1/kpa/contents (목록), GET /api/v1/kpa/contents/:id (단건)
 */

import { getAccessToken } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface ContentHubItem {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  status: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export interface ContentHubListResponse {
  items: ContentHubItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function authFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.error?.message || body?.error || `API error ${res.status}`);
  }
  return body as T;
}

/** 콘텐츠 허브 목록 조회 (picker 용) */
export async function listContentHubItems(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ContentHubListResponse> {
  const qs = new URLSearchParams();
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 10));
  if (params?.search) qs.set('search', params.search);
  const res = await authFetch<{ success: boolean; data: ContentHubListResponse }>(
    `/api/v1/kpa/contents?${qs}`,
  );
  return res.data;
}

/** 콘텐츠 허브 단건 조회 (선택된 항목 제목 표시용) */
export async function getContentHubItem(id: string): Promise<ContentHubItem> {
  const res = await authFetch<{ success: boolean; data: ContentHubItem }>(
    `/api/v1/kpa/contents/${encodeURIComponent(id)}`,
  );
  return res.data;
}
