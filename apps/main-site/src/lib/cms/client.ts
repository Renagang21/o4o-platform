/**
 * CMS V2 API Client
 *
 * Connects main-site to CMS V2 backend API
 * Fetches pages, views, CPTs, and fields from CMS
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  viewId?: string;
  view?: CMSView;
  content: Record<string, any>;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    noIndex?: boolean;
  };
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publishedAt?: string;
  scheduledAt?: string;
  versions?: any[];
  currentVersion: number;
  siteId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CMSView {
  id: string;
  slug: string;
  name: string;
  description?: string;
  type: 'page' | 'section' | 'component' | 'layout';
  status: 'draft' | 'active' | 'archived';
  schema: CMSViewSchema;
  postTypeSlug?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CMSViewSchema {
  version: string; // "2.0"
  type: string;
  components: CMSComponent[];
  bindings?: Array<{
    source: 'cpt' | 'api' | 'store' | 'static';
    target: string;
    query?: Record<string, any>;
  }>;
  styles?: {
    theme?: string;
    customCSS?: string;
    variables?: Record<string, string>;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export interface CMSComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: CMSComponent[];
  slots?: Record<string, CMSComponent[]>;
}

export interface CMSCustomPostType {
  id: string;
  slug: string;
  name: string;
  description?: string;
  schema: any;
  status: 'draft' | 'active' | 'archived';
  siteId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a published page by slug (public endpoint, no auth required)
 */
export async function fetchPageBySlug(slug: string): Promise<CMSPage | null> {
  const url = `${API_BASE_URL}/api/v1/cms/public/page/${slug}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data.page;
  } catch (error) {
    console.error('[fetchPageBySlug] Error fetching page:', error);
    return null;
  }
}

/**
 * Fetch view by slug (public endpoint for view preview)
 */
export async function fetchViewBySlug(slug: string): Promise<{ view: CMSView; renderData?: any } | null> {
  const url = `${API_BASE_URL}/api/v1/cms/public/view/${slug}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch view: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[fetchViewBySlug] Error fetching view:', error);
    return null;
  }
}

/**
 * Fetch view by ID (public endpoint for published views)
 * @deprecated Use fetchViewBySlug instead
 */
export async function fetchViewById(viewId: string): Promise<CMSView | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/view/${viewId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data.view;
  } catch (error) {
    console.error('Error fetching view:', error);
    return null;
  }
}

/**
 * Fetch CPT by slug (for binding data to views)
 */
export async function fetchCPTBySlug(slug: string): Promise<CMSCustomPostType | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/cpt/${slug}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching CPT:', error);
    return null;
  }
}

/**
 * Check if a page exists and is published
 */
export async function checkPageExists(slug: string): Promise<boolean> {
  const page = await fetchPageBySlug(slug);
  return page !== null && page.status === 'published';
}

/**
 * Get SEO metadata for a page
 */
export async function getPageSEO(slug: string): Promise<CMSPage['seo'] | null> {
  const page = await fetchPageBySlug(slug);
  return page?.seo || null;
}

/**
 * Error handling helper
 */
export class CMSClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'CMSClientError';
  }
}

// ==================== Phase D-2.1: Extended CMS Client API ====================

export interface CMSPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  categories?: string[];
  tags?: string[];
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  postType: string;
  metadata?: Record<string, any>;
}

export interface CMSCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  count: number;
  postType: string;
  parent?: string;
}

export interface CMSTag {
  id: string;
  slug: string;
  name: string;
  count: number;
}

export interface GetPostsOptions {
  postType?: string;
  limit?: number;
  orderBy?: 'date' | 'title' | 'random';
  order?: 'asc' | 'desc';
  category?: string;
  tag?: string;
  author?: string;
  page?: number;
  preview?: boolean;
}

/**
 * Fetch posts with filtering and pagination
 */
export async function getPosts(options: GetPostsOptions = {}): Promise<CMSPost[]> {
  const {
    postType = 'post',
    limit = 10,
    orderBy = 'date',
    order = 'desc',
    category,
    tag,
    author,
    page = 1,
    preview = false,
  } = options;

  try {
    const params = new URLSearchParams({
      postType,
      limit: String(limit),
      orderBy,
      order,
      page: String(page),
    });

    if (category) params.append('category', category);
    if (tag) params.append('tag', tag);
    if (author) params.append('author', author);
    if (preview) params.append('preview', '1');

    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/posts?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new CMSClientError(`Failed to fetch posts: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return [];
    }

    return result.data.posts || [];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

/**
 * Fetch a single post by ID
 */
export async function getPostById(postId: string, preview = false): Promise<CMSPost | null> {
  try {
    const params = preview ? '?preview=1' : '';
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/post/${postId}${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new CMSClientError(`Failed to fetch post: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data.post;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

/**
 * Fetch a single post by slug
 */
export async function getPostBySlug(slug: string, postType = 'post', preview = false): Promise<CMSPost | null> {
  try {
    const params = new URLSearchParams({ postType });
    if (preview) params.append('preview', '1');

    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/post/slug/${slug}?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new CMSClientError(`Failed to fetch post: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data.post;
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    return null;
  }
}

/**
 * Fetch categories for a post type
 */
export async function getCategories(postType = 'post'): Promise<CMSCategory[]> {
  try {
    const params = new URLSearchParams({ postType });
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/categories?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new CMSClientError(`Failed to fetch categories: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return [];
    }

    return result.data.categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Fetch tags with post counts
 */
export async function getTags(limit?: number): Promise<CMSTag[]> {
  try {
    const params = limit ? `?limit=${limit}` : '';
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/tags${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new CMSClientError(`Failed to fetch tags: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return [];
    }

    return result.data.tags || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

/**
 * Search posts by keyword
 */
export async function searchPosts(query: string, options: Partial<GetPostsOptions> = {}): Promise<CMSPost[]> {
  const {
    postType = 'post',
    limit = 10,
    page = 1,
  } = options;

  try {
    const params = new URLSearchParams({
      q: query,
      postType,
      limit: String(limit),
      page: String(page),
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/search?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new CMSClientError(`Failed to search posts: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return [];
    }

    return result.data.posts || [];
  } catch (error) {
    console.error('Error searching posts:', error);
    return [];
  }
}

// ==================== Forum API Client ====================

export interface ForumStats {
  totalPosts: number;
  totalComments: number;
  totalCategories: number;
  activeUsers?: number;
  postsToday?: number;
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  icon?: string;
  color?: string;
  order: number;
  parentId?: string;
  children?: ForumCategory[];
}

export interface ForumAuthor {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  postCount?: number;
}

export interface ForumPost {
  id: string;
  title: string;
  slug: string;
  content: any[];
  excerpt?: string;
  authorId: string;
  author?: ForumAuthor;
  categoryId: string;
  categoryName?: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  publishedAt?: string;
  updatedAt: string;
  tags?: string[];
}

export interface ForumComment {
  id: string;
  content: any[];
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  postId: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  isLiked?: boolean;
  isDeleted?: boolean;
  replies?: ForumComment[];
}

export interface GetForumPostsOptions {
  categoryId?: string;
  categorySlug?: string;
  authorId?: string;
  tag?: string;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'popular' | 'commented';
  isPinned?: boolean;
  limit?: number;
  page?: number;
}

/**
 * Fetch forum statistics
 */
export async function getForumStats(): Promise<ForumStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/stats`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new CMSClientError(`Failed to fetch forum stats: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return { totalPosts: 0, totalComments: 0, totalCategories: 0 };
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching forum stats:', error);
    return { totalPosts: 0, totalComments: 0, totalCategories: 0 };
  }
}

/**
 * Fetch forum categories
 */
export async function getForumCategories(): Promise<ForumCategory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/categories`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new CMSClientError(`Failed to fetch forum categories: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return [];
    }

    return result.data.categories || result.data || [];
  } catch (error) {
    console.error('Error fetching forum categories:', error);
    return [];
  }
}

/**
 * Fetch a single forum category by ID or slug
 */
export async function getForumCategory(idOrSlug: string): Promise<ForumCategory | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/categories/${idOrSlug}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new CMSClientError(`Failed to fetch forum category: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data.category || result.data;
  } catch (error) {
    console.error('Error fetching forum category:', error);
    return null;
  }
}

/**
 * Fetch forum posts with filtering
 */
export async function getForumPosts(options: GetForumPostsOptions = {}): Promise<{ posts: ForumPost[]; total: number; hasMore: boolean }> {
  const {
    categoryId,
    categorySlug,
    authorId,
    tag,
    search,
    sortBy = 'newest',
    isPinned,
    limit = 10,
    page = 1,
  } = options;

  try {
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
      sortBy,
    });

    if (categoryId) params.append('categoryId', categoryId);
    if (categorySlug) params.append('categorySlug', categorySlug);
    if (authorId) params.append('authorId', authorId);
    if (tag) params.append('tag', tag);
    if (search) params.append('search', search);
    if (isPinned !== undefined) params.append('isPinned', String(isPinned));

    const response = await fetch(`${API_BASE_URL}/api/v1/forum/posts?${params}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new CMSClientError(`Failed to fetch forum posts: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return { posts: [], total: 0, hasMore: false };
    }

    return {
      posts: result.data.posts || result.data || [],
      total: result.data.total || 0,
      hasMore: result.data.hasMore ?? false,
    };
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return { posts: [], total: 0, hasMore: false };
  }
}

/**
 * Fetch a single forum post by ID or slug
 */
export async function getForumPost(idOrSlug: string): Promise<ForumPost | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/posts/${idOrSlug}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new CMSClientError(`Failed to fetch forum post: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data.post || result.data;
  } catch (error) {
    console.error('Error fetching forum post:', error);
    return null;
  }
}

/**
 * Fetch comments for a forum post
 */
// ==================== Cosmetics Forum API (Enhanced Filtering) ====================

export interface CosmeticsForumFilters {
  categoryId?: string;
  categorySlug?: string;
  skinType?: string;
  concerns?: string[];
  productId?: string;
  brand?: string;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'popular' | 'commented' | 'recommended';
  limit?: number;
  page?: number;
}

export interface CosmeticsPostMetadata {
  skinType?: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal';
  concerns?: string[];
  productIds?: string[];
  brand?: string;
  routine?: string[];
  ingredientPreferences?: string[];
  ageGroup?: string;
}

export interface CosmeticsForumPost extends ForumPost {
  cosmeticsMetadata?: CosmeticsPostMetadata;
}

/**
 * Fetch cosmetics forum posts with enhanced filtering
 * Uses /neture/forum/posts endpoint for cosmetics-specific queries
 */
export async function getCosmeticsForumPosts(
  filters: CosmeticsForumFilters = {}
): Promise<{ posts: CosmeticsForumPost[]; total: number; hasMore: boolean }> {
  const {
    categoryId,
    categorySlug,
    skinType,
    concerns,
    productId,
    brand,
    search,
    sortBy = 'newest',
    limit = 10,
    page = 1,
  } = filters;

  try {
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
      sortBy,
    });

    if (categoryId) params.append('categoryId', categoryId);
    if (categorySlug) params.append('category', categorySlug);
    if (skinType && skinType !== 'all') params.append('skinType', skinType);
    if (concerns && concerns.length > 0) params.append('concerns', concerns.join(','));
    if (productId) params.append('productId', productId);
    if (brand) params.append('brand', brand);
    if (search) params.append('search', search);

    // Use neture forum endpoint for cosmetics-specific filtering
    const response = await fetch(`${API_BASE_URL}/neture/forum/posts?${params}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      // Fallback to generic forum endpoint if neture endpoint not available
      console.warn('Neture forum endpoint not available, falling back to generic endpoint');
      return getForumPosts({
        categorySlug,
        search,
        sortBy: sortBy as 'newest' | 'oldest' | 'popular' | 'commented',
        limit,
        page,
      });
    }

    const result = await response.json();

    if (!result.success) {
      return { posts: [], total: 0, hasMore: false };
    }

    // Extract cosmetics metadata from posts
    const posts = (result.data.posts || result.data || []).map((post: any) => ({
      ...post,
      cosmeticsMetadata: post.metadata?.extensions?.neture || post.metadata?.neture || null,
    }));

    return {
      posts,
      total: result.data.total || 0,
      hasMore: result.data.hasMore ?? false,
    };
  } catch (error) {
    console.error('Error fetching cosmetics forum posts:', error);
    // Fallback to generic forum endpoint
    return getForumPosts({
      categorySlug,
      search,
      sortBy: sortBy as 'newest' | 'oldest' | 'popular' | 'commented',
      limit,
      page,
    });
  }
}

/**
 * Fetch posts related to a specific product
 */
export async function getCosmeticsPostsByProduct(
  productId: string,
  options: { limit?: number; page?: number } = {}
): Promise<{ posts: CosmeticsForumPost[]; total: number; hasMore: boolean }> {
  const { limit = 10, page = 1 } = options;

  try {
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    });

    const response = await fetch(
      `${API_BASE_URL}/neture/forum/posts/product/${productId}?${params}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return { posts: [], total: 0, hasMore: false };
    }

    const result = await response.json();

    if (!result.success) {
      return { posts: [], total: 0, hasMore: false };
    }

    const posts = (result.data.posts || result.data || []).map((post: any) => ({
      ...post,
      cosmeticsMetadata: post.metadata?.extensions?.neture || post.metadata?.neture || null,
    }));

    return {
      posts,
      total: result.data.total || 0,
      hasMore: result.data.hasMore ?? false,
    };
  } catch (error) {
    console.error('Error fetching cosmetics posts by product:', error);
    return { posts: [], total: 0, hasMore: false };
  }
}

/**
 * Fetch recommended posts based on cosmetics metadata similarity
 */
export async function getCosmeticsRecommendedPosts(
  currentPost: CosmeticsForumPost,
  options: { limit?: number } = {}
): Promise<CosmeticsForumPost[]> {
  const { limit = 5 } = options;

  try {
    const metadata = currentPost.cosmeticsMetadata;
    if (!metadata) {
      // If no cosmetics metadata, fetch by category
      if (currentPost.categoryId) {
        const result = await getCosmeticsForumPosts({
          categoryId: currentPost.categoryId,
          sortBy: 'popular',
          limit: limit + 1,
        });
        return result.posts.filter((p) => p.id !== currentPost.id).slice(0, limit);
      }
      return [];
    }

    // Priority 1: Same productId
    if (metadata.productIds && metadata.productIds.length > 0) {
      const result = await getCosmeticsPostsByProduct(metadata.productIds[0], { limit: limit + 1 });
      const filtered = result.posts.filter((p) => p.id !== currentPost.id);
      if (filtered.length >= limit) {
        return filtered.slice(0, limit);
      }
    }

    // Priority 2: Same skinType
    if (metadata.skinType) {
      const result = await getCosmeticsForumPosts({
        skinType: metadata.skinType,
        sortBy: 'popular',
        limit: limit + 1,
      });
      const filtered = result.posts.filter((p) => p.id !== currentPost.id);
      if (filtered.length > 0) {
        return filtered.slice(0, limit);
      }
    }

    // Priority 3: Same concerns
    if (metadata.concerns && metadata.concerns.length > 0) {
      const result = await getCosmeticsForumPosts({
        concerns: [metadata.concerns[0]],
        sortBy: 'popular',
        limit: limit + 1,
      });
      return result.posts.filter((p) => p.id !== currentPost.id).slice(0, limit);
    }

    // Fallback: Popular posts
    const result = await getCosmeticsForumPosts({ sortBy: 'popular', limit: limit + 1 });
    return result.posts.filter((p) => p.id !== currentPost.id).slice(0, limit);
  } catch (error) {
    console.error('Error fetching recommended posts:', error);
    return [];
  }
}

export async function getForumComments(
  postId: string,
  options: { sortBy?: 'newest' | 'oldest' | 'popular'; limit?: number; page?: number } = {}
): Promise<{ comments: ForumComment[]; total: number; hasMore: boolean }> {
  const { sortBy = 'newest', limit = 20, page = 1 } = options;

  try {
    const params = new URLSearchParams({
      sortBy,
      limit: String(limit),
      page: String(page),
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/forum/posts/${postId}/comments?${params}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new CMSClientError(`Failed to fetch comments: ${response.statusText}`, response.status);
    }

    const result = await response.json();

    if (!result.success) {
      return { comments: [], total: 0, hasMore: false };
    }

    return {
      comments: result.data.comments || result.data || [],
      total: result.data.total || 0,
      hasMore: result.data.hasMore ?? false,
    };
  } catch (error) {
    console.error('Error fetching forum comments:', error);
    return { comments: [], total: 0, hasMore: false };
  }
}

// ==========================================
// Cosmetics Analytics & Engagement API
// ==========================================

export interface CosmeticsTrendingPost extends CosmeticsForumPost {
  trendingScore: number;
  viewsLast24h: number;
  growthRate: number;
}

export interface CosmeticsPopularPost extends CosmeticsForumPost {
  popularityScore: number;
  totalEngagement: number;
}

export interface CosmeticsPersonalizedPost extends CosmeticsForumPost {
  relevanceScore: number;
  matchReason: 'skinType' | 'concerns' | 'brand' | 'history' | 'popular';
}

export interface UserPreferences {
  skinType?: string;
  concerns?: string[];
  preferredBrands?: string[];
  viewedPosts?: string[];
}

/**
 * Get trending cosmetics forum posts
 * Returns posts with high engagement growth in recent time period
 */
export async function getCosmeticsTrendingPosts(
  options: { limit?: number; period?: '24h' | '7d' | '30d' } = {}
): Promise<CosmeticsTrendingPost[]> {
  const { limit = 10, period = '24h' } = options;

  try {
    const params = new URLSearchParams({
      limit: String(limit),
      period,
    });

    const response = await fetch(
      `${API_BASE_URL}/api/v1/cosmetics/forum/posts/trending?${params}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      // Fallback: Get posts sorted by view count as trending proxy
      const fallback = await getCosmeticsForumPosts({ sortBy: 'popular', limit });
      return fallback.posts.map((post) => ({
        ...post,
        trendingScore: post.viewCount * 0.1,
        viewsLast24h: Math.floor(post.viewCount * 0.1),
        growthRate: 0,
      }));
    }

    const result = await response.json();

    if (!result.success) {
      return [];
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    // Fallback to popular posts
    try {
      const fallback = await getCosmeticsForumPosts({ sortBy: 'popular', limit });
      return fallback.posts.map((post) => ({
        ...post,
        trendingScore: post.viewCount * 0.1,
        viewsLast24h: Math.floor(post.viewCount * 0.1),
        growthRate: 0,
      }));
    } catch {
      return [];
    }
  }
}

/**
 * Get popular cosmetics forum posts
 * Returns posts with highest overall engagement
 */
export async function getCosmeticsPopularPosts(
  options: { limit?: number; categorySlug?: string } = {}
): Promise<CosmeticsPopularPost[]> {
  const { limit = 10, categorySlug } = options;

  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (categorySlug) params.set('categorySlug', categorySlug);

    const response = await fetch(
      `${API_BASE_URL}/api/v1/cosmetics/forum/posts/popular?${params}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      // Fallback: Calculate popularity from existing data
      const fallback = await getCosmeticsForumPosts({
        categorySlug,
        sortBy: 'popular',
        limit,
      });
      return fallback.posts.map((post) => ({
        ...post,
        popularityScore: post.viewCount + post.likeCount * 5 + post.commentCount * 3,
        totalEngagement: post.viewCount + post.likeCount + post.commentCount,
      }));
    }

    const result = await response.json();

    if (!result.success) {
      return [];
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching popular posts:', error);
    // Fallback
    try {
      const fallback = await getCosmeticsForumPosts({
        categorySlug,
        sortBy: 'popular',
        limit,
      });
      return fallback.posts.map((post) => ({
        ...post,
        popularityScore: post.viewCount + post.likeCount * 5 + post.commentCount * 3,
        totalEngagement: post.viewCount + post.likeCount + post.commentCount,
      }));
    } catch {
      return [];
    }
  }
}

/**
 * Get personalized cosmetics forum posts
 * Returns posts based on user preferences and behavior
 */
export async function getCosmeticsPersonalizedPosts(
  preferences: UserPreferences,
  options: { limit?: number } = {}
): Promise<CosmeticsPersonalizedPost[]> {
  const { limit = 10 } = options;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/cosmetics/forum/posts/personalized`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ preferences, limit }),
      }
    );

    if (!response.ok) {
      // Fallback: Filter by user preferences client-side
      return await getPersonalizedFallback(preferences, limit);
    }

    const result = await response.json();

    if (!result.success) {
      return await getPersonalizedFallback(preferences, limit);
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching personalized posts:', error);
    return await getPersonalizedFallback(preferences, limit);
  }
}

/**
 * Fallback personalization using client-side filtering
 */
async function getPersonalizedFallback(
  preferences: UserPreferences,
  limit: number
): Promise<CosmeticsPersonalizedPost[]> {
  try {
    const posts = await getCosmeticsForumPosts({
      skinType: preferences.skinType,
      concerns: preferences.concerns,
      sortBy: 'popular',
      limit: limit * 2, // Get more to filter
    });

    // Score posts based on matching criteria
    const scored = posts.posts.map((post) => {
      const cosmetics = post.cosmeticsMetadata || {};
      let score = 0;
      let reason: CosmeticsPersonalizedPost['matchReason'] = 'popular';

      // Skin type match
      if (preferences.skinType && cosmetics.skinType === preferences.skinType) {
        score += 30;
        reason = 'skinType';
      }

      // Concerns match
      if (preferences.concerns && cosmetics.concerns) {
        const matches = preferences.concerns.filter((c) =>
          cosmetics.concerns?.includes(c)
        ).length;
        if (matches > 0) {
          score += matches * 20;
          if (score < 30) reason = 'concerns';
        }
      }

      // Brand preference match
      if (preferences.preferredBrands && cosmetics.brand) {
        if (preferences.preferredBrands.includes(cosmetics.brand)) {
          score += 15;
          if (score < 30) reason = 'brand';
        }
      }

      // Base popularity score
      score += Math.min(post.viewCount / 100, 10);

      return {
        ...post,
        relevanceScore: score,
        matchReason: reason,
      };
    });

    // Sort by relevance and return top N
    return scored
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Get forum analytics summary for a category or overall
 */
export interface ForumAnalyticsSummary {
  totalPosts: number;
  totalViews: number;
  totalComments: number;
  totalLikes: number;
  activeUsers: number;
  topSkinTypes: { skinType: string; count: number }[];
  topConcerns: { concern: string; count: number }[];
  topBrands: { brand: string; count: number }[];
  growthRate: {
    posts: number;
    views: number;
    engagement: number;
  };
}

export async function getCosmeticsAnalyticsSummary(
  options: { categorySlug?: string; period?: '7d' | '30d' | '90d' } = {}
): Promise<ForumAnalyticsSummary | null> {
  const { categorySlug, period = '30d' } = options;

  try {
    const params = new URLSearchParams({ period });
    if (categorySlug) params.set('categorySlug', categorySlug);

    const response = await fetch(
      `${API_BASE_URL}/api/v1/cosmetics/forum/analytics/summary?${params}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return null;
  }
}
