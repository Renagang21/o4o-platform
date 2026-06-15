/**
 * POP Staff API Client — Authenticated (K-Cosmetics)
 *
 * WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1
 * GlycoPharm popStaff (KPA canonical) mirror — service param defaults to 'cosmetics'.
 *
 * 매장 owner 가 운영자 발행 POP 을 자기 매장 store_pops 사본(author_role='store')으로 가져오는 staff-only API.
 * Backend: o4o-store pop.controller — /api/v1/cosmetics/stores/:slug/pop/staff/import (serviceKey='cosmetics').
 * sourceId 만 전송 — serviceKey / authorRole / organizationId / status 는 backend 가 강제.
 */

import { getAccessToken } from '@o4o/auth-client';

function getApiBase(service: string = 'cosmetics'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
}

export interface ImportedOperatorPopPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  importSource: {
    sourceId: string;
    sourceTitle: string;
    sourceServiceKey: string;
    sourceAuthorRole: string;
    importedAt: string;
  };
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
 * 운영자 HUB 게시 POP 을 매장 사본으로 가져오기.
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

// ─────────────────────────────────────────────────────
// Staff POP 사본 관리 (WO-O4O-POP-STAFF-PAGE-GP-KCOS-PARITY-V1)
//   KPA popStaff.ts mirror — 내 매장 store_pops 사본(author_role='store') 목록/수정/삭제.
//   Backend: GET/PUT/DELETE /api/v1/cosmetics/stores/:slug/pop/staff(/:id)
// ─────────────────────────────────────────────────────

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

/**
 * 매장 직접 POP 콘텐츠 저장 (author_role='store' INSERT).
 * WO-O4O-POP-SAVE-AS-CONTENT-V1: POP 제작 결과를 재편집 가능한 매장 POP 콘텐츠로 저장.
 */
export async function createStaffPopPost(
  slug: string,
  body: { title: string; content?: string; excerpt?: string },
  service?: string,
): Promise<StaffPopPost> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/pop/staff`;
  const json = await authFetch(url, { method: 'POST', body: JSON.stringify(body) });
  return json.data;
}
