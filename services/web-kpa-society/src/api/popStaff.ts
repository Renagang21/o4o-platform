/**
 * POP Staff API Client — Authenticated
 *
 * WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1 (2026-05-24)
 *
 * 매장 owner 가 자기 매장 store_pops 사본 (author_role='store') 을 관리하고,
 * 운영자 HUB POP 을 자기 매장 사본으로 가져오는 staff-only API client.
 *
 * Backend: WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1
 *   /api/v1/kpa/stores/:slug/pop/staff
 *   /api/v1/kpa/stores/:slug/pop/staff/import
 *   /api/v1/kpa/stores/:slug/pop/staff/:id (PUT / DELETE)
 *
 * 패턴: blogStaff.ts mirror — store_blog_posts / store_pops 동일 schema.
 *
 * 본 client 범위 외 (후속):
 *   - POST /stores/:slug/pop/staff (매장 직접 POP 작성)
 *   - publish / archive
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(service: string = 'kpa'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
}

export interface StaffPopPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
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
 * 매장 store_pops 사본 목록 조회 — author_role='store' 한정.
 * Backend 가 storeId=resolveSlug(slug) + serviceKey + authorRole='store' 강제.
 */
export async function fetchStaffPopPosts(
  slug: string,
  params?: { page?: number; limit?: number; status?: string },
  service?: string,
): Promise<{
  data: StaffPopPost[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);

  const qs = query.toString();
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/pop/staff${qs ? `?${qs}` : ''}`;
  const json = await authFetch(url);
  return { data: json.data, meta: json.meta };
}

export async function updateStaffPopPost(
  slug: string,
  postId: string,
  body: { title?: string; content?: string; excerpt?: string; slug?: string },
  service?: string,
): Promise<StaffPopPost> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/pop/staff/${postId}`;
  const json = await authFetch(url, { method: 'PUT', body: JSON.stringify(body) });
  return json.data;
}

export async function deleteStaffPopPost(slug: string, postId: string, service?: string): Promise<void> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/pop/staff/${postId}`;
  await authFetch(url, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────
// Operator HUB POP Import (WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1)
// ─────────────────────────────────────────────────────

export interface ImportedOperatorPopPost extends StaffPopPost {
  importSource: {
    sourceId: string;
    sourceTitle: string;
    sourceServiceKey: string;
    sourceAuthorRole: string;
    importedAt: string;
  };
}

/**
 * 운영자 HUB 게시 POP 을 매장 사본으로 가져오기.
 *
 * Backend 가 author_role='store' + storeId=매장id + service_key=서비스 + status='draft'
 * 로 store_pops INSERT. excerpt 앞에 "[운영자 자료 가져옴] " 접두어로 출처 표시.
 *
 * 권한: store_owner (verifyOwner backend 검증).
 */
export async function importOperatorPop(
  slug: string,
  sourceId: string,
  service?: string,
): Promise<ImportedOperatorPopPost> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/pop/staff/import`;
  const json = await authFetch(url, {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
  });
  return json.data as ImportedOperatorPopPost;
}
