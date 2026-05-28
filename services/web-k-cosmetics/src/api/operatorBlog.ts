/**
 * Operator Blog API Client — K-Cosmetics Operator HUB Blog Write
 *
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1
 *
 * 운영자가 K-Cosmetics 매장 HUB 에 게시할 블로그 콘텐츠를 작성/수정/게시하는 API client.
 * Backend: /api/v1/cosmetics/operator/blog/posts (CRUD + publish + archive)
 * 권한 (backend 검증): cosmetics:operator / cosmetics:admin / platform:admin / platform:super_admin
 */

import { authClient } from '../lib/apiClient';

export interface OperatorBlogPost {
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

export interface OperatorBlogListResponse {
  data: OperatorBlogPost[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface OperatorBlogCreateInput {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
}

export interface OperatorBlogUpdateInput {
  title?: string;
  content?: string;
  excerpt?: string;
  slug?: string;
}

const BASE = '/cosmetics/operator/blog';

export async function listOperatorBlogPosts(
  params?: { page?: number; limit?: number; status?: 'draft' | 'published' | 'archived' },
): Promise<OperatorBlogListResponse> {
  const res = await authClient.api.get<{ success: boolean; data: OperatorBlogPost[]; meta: OperatorBlogListResponse['meta'] }>(
    `${BASE}/posts`,
    { params },
  );
  return { data: res.data.data, meta: res.data.meta };
}

export async function getOperatorBlogPost(id: string): Promise<OperatorBlogPost> {
  const res = await authClient.api.get<{ success: boolean; data: OperatorBlogPost }>(`${BASE}/posts/${id}`);
  return res.data.data;
}

export async function createOperatorBlogPost(input: OperatorBlogCreateInput): Promise<OperatorBlogPost> {
  const res = await authClient.api.post<{ success: boolean; data: OperatorBlogPost }>(`${BASE}/posts`, input);
  return res.data.data;
}

export async function updateOperatorBlogPost(id: string, input: OperatorBlogUpdateInput): Promise<OperatorBlogPost> {
  const res = await authClient.api.put<{ success: boolean; data: OperatorBlogPost }>(`${BASE}/posts/${id}`, input);
  return res.data.data;
}

export async function publishOperatorBlogPost(id: string): Promise<OperatorBlogPost> {
  const res = await authClient.api.patch<{ success: boolean; data: OperatorBlogPost }>(`${BASE}/posts/${id}/publish`);
  return res.data.data;
}

export async function archiveOperatorBlogPost(id: string): Promise<OperatorBlogPost> {
  const res = await authClient.api.patch<{ success: boolean; data: OperatorBlogPost }>(`${BASE}/posts/${id}/archive`);
  return res.data.data;
}

export async function deleteOperatorBlogPost(id: string): Promise<void> {
  await authClient.api.delete(`${BASE}/posts/${id}`);
}
