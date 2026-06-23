/**
 * Video Staff API Client — Authenticated (QR 전용 동영상)
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * 매장 owner 가 자기 매장 store_videos 사본 (author_role='store') 을 관리하고,
 * 운영자 HUB 동영상을 자기 매장 사본으로 가져오는 staff-only API client.
 *
 * Backend:
 *   GET    /api/v1/kpa/stores/:slug/video/staff
 *   POST   /api/v1/kpa/stores/:slug/video/staff/import
 *   PUT    /api/v1/kpa/stores/:slug/video/staff/:id
 *   DELETE /api/v1/kpa/stores/:slug/video/staff/:id
 *
 * 패턴: popStaff.ts mirror — store_pops / store_videos 동일 schema.
 *
 * 본 client 범위 외 (WO 고정 — 2차): 매장 직접 동영상 등록 (POST .../video/staff).
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(service: string = 'kpa'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
}

export interface StaffVideoPost {
  id: string;
  title: string;
  slug: string;
  description?: string;
  videoUrl: string;
  status: 'draft' | 'published' | 'archived';
  copiedFromId?: string | null;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json;
}

/**
 * 매장 store_videos 사본 목록 조회 — author_role='store' 한정.
 */
export async function fetchStaffVideoPosts(
  slug: string,
  params?: { page?: number; limit?: number; status?: string },
  service?: string,
): Promise<{
  data: StaffVideoPost[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);

  const qs = query.toString();
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/video/staff${qs ? `?${qs}` : ''}`;
  const json = await authFetch(url);
  return { data: json.data, meta: json.meta };
}

export async function updateStaffVideoPost(
  slug: string,
  postId: string,
  body: { title?: string; videoUrl?: string; description?: string; slug?: string },
  service?: string,
): Promise<StaffVideoPost> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/video/staff/${postId}`;
  const json = await authFetch(url, { method: 'PUT', body: JSON.stringify(body) });
  return json.data;
}

export async function deleteStaffVideoPost(slug: string, postId: string, service?: string): Promise<void> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/video/staff/${postId}`;
  await authFetch(url, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────
// Operator HUB Video Import
// ─────────────────────────────────────────────────────

export interface ImportedOperatorVideoPost extends StaffVideoPost {
  importSource: {
    sourceId: string;
    sourceTitle: string;
    sourceServiceKey: string;
    sourceAuthorRole: string;
    importedAt: string;
  };
}

/**
 * 운영자 HUB 게시 동영상을 매장 사본으로 가져오기 (=복사).
 * Backend 가 author_role='store' + storeId=매장id + status='draft' + copiedFromId=원본id 로
 * store_videos INSERT. 값 복사이므로 복사 후 원본 수정/삭제는 사본에 영향 없음.
 */
export async function importOperatorVideo(
  slug: string,
  sourceId: string,
  service?: string,
): Promise<ImportedOperatorVideoPost> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/video/staff/import`;
  const json = await authFetch(url, {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
  });
  return json.data as ImportedOperatorVideoPost;
}
