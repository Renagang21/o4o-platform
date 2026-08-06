/**
 * Pharmacy-Hub 매장 블로그 API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubStoreBlogController.ts):
 *   GET    /pharmacy-hub/store-owner/blog
 *   POST   /pharmacy-hub/store-owner/blog
 *   GET    /pharmacy-hub/store-owner/blog/:id
 *   PUT    /pharmacy-hub/store-owner/blog/:id
 *   PATCH  /pharmacy-hub/store-owner/blog/:id/publish
 *   PATCH  /pharmacy-hub/store-owner/blog/:id/archive
 *   DELETE /pharmacy-hub/store-owner/blog/:id
 *
 * ⚠️ organizationId·storeId·serviceKey 는 **보내지 않는다.** 서버가 결정한다(보내면 400).
 *
 * 원장은 공통 `store_blog_posts` 다 — 신규 테이블 0.
 *
 * 공개 URL: Pharmacy-Hub 공개 블로그 렌더링 경로는 아직 없다. 본 화면은 저작·관리까지이고
 * 발행은 status='published' 기록까지다 (작업요청서 §범위).
 */
import { api } from '../apiClient';
import type { StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const BASE = '/pharmacy-hub/store-owner/blog';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

export type BlogStatus = 'draft' | 'published' | 'archived';

export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = {
  draft: '작성 중',
  published: '발행됨',
  archived: '보관됨',
};

export interface BlogPost {
  id: string;
  storeId: string;
  serviceKey: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  status: BlogStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPage {
  storeConnection: StoreConnectionState;
  posts: BlogPost[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BlogPostInput {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
}

export async function fetchBlogPosts(params?: {
  page?: number;
  limit?: number;
  status?: BlogStatus;
}): Promise<BlogPage> {
  const res = await api.get(BASE, { params });
  return unwrap<BlogPage>(res.data, '블로그 목록을 불러오지 못했습니다.');
}

export async function fetchBlogPost(id: string): Promise<BlogPost> {
  const res = await api.get(`${BASE}/${id}`);
  return unwrap<BlogPost>(res.data, '블로그 글을 불러오지 못했습니다.');
}

export async function createBlogPost(input: BlogPostInput): Promise<BlogPost> {
  const res = await api.post(BASE, input);
  return unwrap<BlogPost>(res.data, '블로그 글을 저장하지 못했습니다.');
}

export async function updateBlogPost(id: string, input: Partial<BlogPostInput>): Promise<BlogPost> {
  const res = await api.put(`${BASE}/${id}`, input);
  return unwrap<BlogPost>(res.data, '블로그 글을 수정하지 못했습니다.');
}

export async function publishBlogPost(id: string): Promise<BlogPost> {
  const res = await api.patch(`${BASE}/${id}/publish`, {});
  return unwrap<BlogPost>(res.data, '블로그 글을 발행하지 못했습니다.');
}

export async function archiveBlogPost(id: string): Promise<BlogPost> {
  const res = await api.patch(`${BASE}/${id}/archive`, {});
  return unwrap<BlogPost>(res.data, '블로그 글을 보관하지 못했습니다.');
}

export async function deleteBlogPost(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/${id}`);
  unwrap<unknown>(res.data, '블로그 글을 삭제하지 못했습니다.');
}
