/**
 * Blog API Client — Public (no auth)
 *
 * WO-O4O-BLOG-UI-PARTIAL-EXTRACT-V1
 * Extracted from: services/web-kpa-society/src/api/blog.ts
 *
 * Service-agnostic. Calls unified /api/v1/stores/:slug/blog/* endpoints directly.
 * Backend `unified-store-public.routes.ts` resolves slug → storeId + serviceKey.
 *
 * Usage: VITE_API_BASE_URL 가 설정된 모든 서비스(KPA / Neture / Glycopharm / ...)에서 동일하게 작동.
 */

function getApiBase(): string {
  const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '';
  return `${base}/api/v1/stores`;
}

export interface BlogPost {
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

export interface BlogListResponse {
  data: BlogPost[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchBlogPosts(
  slug: string,
  params?: { page?: number; limit?: number },
): Promise<BlogListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/blog${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch blog posts');
  return { data: json.data, meta: json.meta };
}

export async function fetchBlogPost(
  slug: string,
  postSlug: string,
): Promise<BlogPost> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/blog/${encodeURIComponent(postSlug)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Blog post not found');
  return json.data;
}

// 공개 헤더용 매장 정보 — /api/v1/stores/:slug 그대로 활용
export interface PublicStoreInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  addressDetail: string | null;
  phone: string | null;
  logo: string | null;
  hero_image: string | null;
  status: string;
  productCount: number;
}

export async function fetchPublicStoreInfo(slug: string): Promise<PublicStoreInfo> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Store not found');
  return json.data;
}

// 공개 Blog identity (이름·소개·heroImage·defaultTemplate)
export interface PublicBlogSettings {
  id: string;
  storeId: string;
  serviceKey: string;
  blogName: string | null;
  description: string | null;
  heroImage: string | null;
  defaultTemplate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 공개 Blog 설정 조회. 미존재 시 null 반환 — 호출처에서 store info 로 fallback.
 * 인증 불필요.
 */
export async function fetchPublicBlogSettings(slug: string): Promise<PublicBlogSettings | null> {
  const url = `${getApiBase()}/${encodeURIComponent(slug)}/blog/settings`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success) return null;
  return (json.data as PublicBlogSettings | null) ?? null;
}
