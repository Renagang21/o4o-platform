/**
 * Blog API Client — Public (no auth)
 *
 * WO-STORE-BLOG-CHANNEL-V1
 * WO-KPA-STORE-CHANNEL-INTEGRATION-V1: service parameter for KPA reuse
 *
 * Calls /api/v1/{service}/stores/:slug/blog/* endpoints directly.
 * No authentication required for public blog pages.
 */

function getApiBase(service: string = 'glycopharm'): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/${service}`;
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
  service?: string,
): Promise<BlogListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/blog${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Failed to fetch blog posts');
  return { data: json.data, meta: json.meta };
}

export async function fetchBlogPost(
  slug: string,
  postSlug: string,
  service?: string,
): Promise<BlogPost> {
  const url = `${getApiBase(service)}/stores/${encodeURIComponent(slug)}/blog/${encodeURIComponent(postSlug)}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Blog post not found');
  return json.data;
}
