/**
 * Operator POP API Client — K-Cosmetics Operator HUB POP Write
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 *
 * 운영자가 K-Cosmetics 매장 HUB 에 게시할 POP 콘텐츠를 작성/수정/게시하는 API client.
 * Backend: /api/v1/cosmetics/operator/pop/posts (CRUD + publish + archive)
 * 권한 (backend 검증): cosmetics:operator / cosmetics:admin / platform:admin / platform:super_admin
 */

import { authClient } from '../lib/apiClient';

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

const BASE = '/cosmetics/operator/pop';

export async function listOperatorPopPosts(
  params?: { page?: number; limit?: number; status?: 'draft' | 'published' | 'archived' },
): Promise<OperatorPopListResponse> {
  const res = await authClient.api.get<{ success: boolean; data: OperatorPopPost[]; meta: OperatorPopListResponse['meta'] }>(
    `${BASE}/posts`,
    { params },
  );
  return { data: res.data.data, meta: res.data.meta };
}

export async function getOperatorPopPost(id: string): Promise<OperatorPopPost> {
  const res = await authClient.api.get<{ success: boolean; data: OperatorPopPost }>(`${BASE}/posts/${id}`);
  return res.data.data;
}

export async function createOperatorPopPost(input: OperatorPopCreateInput): Promise<OperatorPopPost> {
  const res = await authClient.api.post<{ success: boolean; data: OperatorPopPost }>(`${BASE}/posts`, input);
  return res.data.data;
}

export async function updateOperatorPopPost(id: string, input: OperatorPopUpdateInput): Promise<OperatorPopPost> {
  const res = await authClient.api.put<{ success: boolean; data: OperatorPopPost }>(`${BASE}/posts/${id}`, input);
  return res.data.data;
}

export async function publishOperatorPopPost(id: string): Promise<OperatorPopPost> {
  const res = await authClient.api.patch<{ success: boolean; data: OperatorPopPost }>(`${BASE}/posts/${id}/publish`);
  return res.data.data;
}

export async function archiveOperatorPopPost(id: string): Promise<OperatorPopPost> {
  const res = await authClient.api.patch<{ success: boolean; data: OperatorPopPost }>(`${BASE}/posts/${id}/archive`);
  return res.data.data;
}

export async function deleteOperatorPopPost(id: string): Promise<void> {
  await authClient.api.delete(`${BASE}/posts/${id}`);
}
