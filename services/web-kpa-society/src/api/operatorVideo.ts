/**
 * Operator Video API Client — KPA Operator HUB Video Write (QR 전용 동영상)
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * 운영자가 KPA 매장 HUB 에 게시할 동영상 콘텐츠(외부 URL)를 작성/수정/게시하는 API client.
 * Backend 는 server-side 에서 author_role='operator', service_key='kpa', store_id=null 강제.
 * → 프론트는 title / videoUrl / description / slug 만 전송한다.
 *
 * Backend: /api/v1/kpa/operator/video/posts (CRUD + publish + archive)
 * 권한: kpa:operator / kpa:admin / platform:admin / platform:super_admin
 *
 * 패턴: operatorPop.ts mirror — store_pops 와 store_videos 가 동일 schema 형태
 *       (content → videoUrl, excerpt → description).
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/kpa/operator/video`;
}

export interface OperatorVideoPost {
  id: string;
  title: string;
  slug: string;
  description?: string;
  videoUrl: string;
  status: 'draft' | 'published' | 'archived';
  serviceKey: string;
  authorRole: 'operator';
  storeId: string | null;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorVideoListResponse {
  data: OperatorVideoPost[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface OperatorVideoCreateInput {
  title: string;
  videoUrl: string;
  description?: string;
  slug?: string;
}

export interface OperatorVideoUpdateInput {
  title?: string;
  videoUrl?: string;
  description?: string;
  slug?: string;
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
  if (!json.success) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }
  return json;
}

export async function listOperatorVideoPosts(
  params?: { page?: number; limit?: number; status?: 'draft' | 'published' | 'archived' },
): Promise<OperatorVideoListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  const url = `${getApiBase()}/posts${qs ? `?${qs}` : ''}`;
  const json = await authFetch(url);
  return { data: json.data, meta: json.meta };
}

export async function getOperatorVideoPost(id: string): Promise<OperatorVideoPost> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}`;
  const json = await authFetch(url);
  return json.data;
}

export async function createOperatorVideoPost(
  input: OperatorVideoCreateInput,
): Promise<OperatorVideoPost> {
  const url = `${getApiBase()}/posts`;
  const json = await authFetch(url, { method: 'POST', body: JSON.stringify(input) });
  return json.data;
}

export async function updateOperatorVideoPost(
  id: string,
  input: OperatorVideoUpdateInput,
): Promise<OperatorVideoPost> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}`;
  const json = await authFetch(url, { method: 'PUT', body: JSON.stringify(input) });
  return json.data;
}

export async function publishOperatorVideoPost(id: string): Promise<OperatorVideoPost> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}/publish`;
  const json = await authFetch(url, { method: 'PATCH' });
  return json.data;
}

export async function archiveOperatorVideoPost(id: string): Promise<OperatorVideoPost> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}/archive`;
  const json = await authFetch(url, { method: 'PATCH' });
  return json.data;
}

export async function deleteOperatorVideoPost(id: string): Promise<void> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}`;
  await authFetch(url, { method: 'DELETE' });
}
