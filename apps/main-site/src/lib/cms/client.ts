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
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/page/${slug}`, {
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
    console.error('Error fetching page:', error);
    return null;
  }
}

/**
 * Fetch view by slug (public endpoint for view preview)
 */
export async function fetchViewBySlug(slug: string): Promise<{ view: CMSView; renderData?: any } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/cms/public/view/${slug}`, {
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
    console.error('Error fetching view:', error);
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
