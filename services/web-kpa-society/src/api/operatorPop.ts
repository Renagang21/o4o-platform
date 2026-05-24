/**
 * Operator POP API Client — KPA Operator HUB POP Write
 *
 * WO-O4O-KPA-OPERATOR-POP-WRITE-PAGE-V1 (2026-05-24)
 *
 * 운영자가 KPA 매장 HUB 에 게시할 POP 콘텐츠를 작성/수정/게시하는 API client.
 * Backend 는 server-side 에서 author_role='operator', service_key='kpa', store_id=null 강제.
 * → 프론트는 title / content / excerpt / slug 만 전송한다.
 *
 * Backend: WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1
 *   /api/v1/kpa/operator/pop/posts (CRUD + publish + archive)
 *
 * 권한 (backend 검증):
 *   kpa:operator / kpa:admin / platform:admin / platform:super_admin
 *
 * 패턴: operatorBlog.ts mirror — store_blog_posts 와 store_pops 가 동일 schema 형태.
 */

import { getAccessToken } from '../contexts/AuthContext';

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/kpa/operator/pop`;
}

export interface OperatorPopPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  serviceKey: string;
  authorRole: 'operator';
  storeId: string | null;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorPopListResponse {
  data: OperatorPopPost[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface OperatorPopCreateInput {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
}

export interface OperatorPopUpdateInput {
  title?: string;
  content?: string;
  excerpt?: string;
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

export async function listOperatorPopPosts(
  params?: { page?: number; limit?: number; status?: 'draft' | 'published' | 'archived' },
): Promise<OperatorPopListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  const url = `${getApiBase()}/posts${qs ? `?${qs}` : ''}`;
  const json = await authFetch(url);
  return { data: json.data, meta: json.meta };
}

export async function getOperatorPopPost(id: string): Promise<OperatorPopPost> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}`;
  const json = await authFetch(url);
  return json.data;
}

export async function createOperatorPopPost(
  input: OperatorPopCreateInput,
): Promise<OperatorPopPost> {
  const url = `${getApiBase()}/posts`;
  const json = await authFetch(url, { method: 'POST', body: JSON.stringify(input) });
  return json.data;
}

export async function updateOperatorPopPost(
  id: string,
  input: OperatorPopUpdateInput,
): Promise<OperatorPopPost> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}`;
  const json = await authFetch(url, { method: 'PUT', body: JSON.stringify(input) });
  return json.data;
}

export async function publishOperatorPopPost(id: string): Promise<OperatorPopPost> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}/publish`;
  const json = await authFetch(url, { method: 'PATCH' });
  return json.data;
}

export async function archiveOperatorPopPost(id: string): Promise<OperatorPopPost> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}/archive`;
  const json = await authFetch(url, { method: 'PATCH' });
  return json.data;
}

export async function deleteOperatorPopPost(id: string): Promise<void> {
  const url = `${getApiBase()}/posts/${encodeURIComponent(id)}`;
  await authFetch(url, { method: 'DELETE' });
}
