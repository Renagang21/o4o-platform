/**
 * CMS-Integrated View Loader
 *
 * Extends the original loader to support loading views from CMS V2
 * Falls back to static JSON files for non-CMS routes
 */

import type { ViewSchema } from '@/view/types';
import { fetchPageBySlug, fetchViewBySlug } from './client';
import { adaptCMSViewToViewSchema, isViewRendererCompatible } from './adapter';

// Cache for CMS pages to avoid redundant API calls
interface CachedEntry {
  data: ViewSchema | null;
  timestamp: number;
}

const cmsPageCache = new Map<string, CachedEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load a view from CMS by page slug
 * Returns null if page not found or not published
 *
 * @param slug - Page slug to load
 * @param preview - If true, loads draft/scheduled pages (no caching)
 */
export async function loadCMSView(slug: string, preview = false): Promise<ViewSchema | null> {
  console.log(`[loadCMSView] Starting for slug: ${slug}, preview: ${preview}`);

  // Skip cache in preview mode
  if (!preview) {
    const cached = getCachedView(slug);
    if (cached !== undefined) {
      console.log(`[loadCMSView] Returning cached view for ${slug}`);
      return cached;
    }
  }

  try {
    // Try to fetch page from CMS API first
    console.log(`[loadCMSView] Attempting to fetch page: ${slug}`);
    const page = await fetchPageBySlug(slug);
    console.log(`[loadCMSView] Page fetch result:`, page);

    if (page) {
      console.log(`[loadCMSView] Page found for ${slug}, processing...`);
      // Check if page has an associated view
      if (!page.view) {
        console.error(`CMS Page ${slug} has no associated view`);
        setCachedView(slug, null);
        return null;
      }

      // Check ViewRenderer compatibility
      if (!isViewRendererCompatible(page.view)) {
        console.error(`CMS View for page ${slug} is not ViewRenderer compatible`);
        setCachedView(slug, null);
        return null;
      }

      // Adapt CMS view to ViewRenderer format
      const viewSchema = adaptCMSViewToViewSchema(page.view, page);

      // Cache the result (skip cache in preview mode)
      if (!preview) {
        setCachedView(slug, viewSchema);
      }

      return viewSchema;
    }

    // Fallback: Try to fetch view directly (for view preview without a page)
    console.log(`[loadCMSView] Page not found, trying view fallback for ${slug}`);
    const viewData = await fetchViewBySlug(slug);
    console.log(`[loadCMSView] View fetch result:`, viewData);

    if (!viewData) {
      // Neither page nor view found
      console.log(`[loadCMSView] Neither page nor view found for ${slug}`);
      setCachedView(slug, null);
      return null;
    }

    console.log(`[loadCMSView] View found for ${slug}, creating preview...`);

    // Check ViewRenderer compatibility
    if (!isViewRendererCompatible(viewData.view)) {
      console.error(`CMS View ${slug} is not ViewRenderer compatible`);
      setCachedView(slug, null);
      return null;
    }

    // Adapt CMS view to ViewRenderer format (using renderData if available)
    const mockPage = {
      id: 'preview',
      slug: viewData.view.slug,
      title: viewData.view.name,
      content: viewData.renderData?.content || {},
      status: 'published' as const,
      currentVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const viewSchema = adaptCMSViewToViewSchema(viewData.view, mockPage);
    console.log(`[loadCMSView] View preview created successfully for ${slug}`);

    // Don't cache preview views
    if (!preview) {
      setCachedView(slug, viewSchema);
    }

    return viewSchema;
  } catch (error) {
    console.error(`[loadCMSView] Error loading CMS view for slug: ${slug}`, error);
    if (!preview) {
      setCachedView(slug, null);
    }
    return null;
  }
}

/**
 * Check if a slug corresponds to a CMS page
 */
export async function isCMSPage(slug: string): Promise<boolean> {
  const view = await loadCMSView(slug);
  return view !== null;
}

/**
 * Clear CMS page cache (useful for development)
 */
export function clearCMSCache(): void {
  cmsPageCache.clear();
}

/**
 * Get cached view if available and not expired
 */
function getCachedView(slug: string): ViewSchema | null | undefined {
  const cached = cmsPageCache.get(slug);

  if (!cached) {
    return undefined;
  }

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    // Cache expired
    cmsPageCache.delete(slug);
    return undefined;
  }

  return cached.data;
}

/**
 * Set cached view with timestamp
 */
function setCachedView(slug: string, data: ViewSchema | null): void {
  cmsPageCache.set(slug, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Hot Module Replacement support
 */
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    clearCMSCache();
  });
}

// ==================== Phase D-2.2: Dynamic Data Loading ====================

import type { DesignerNode } from '@/components/blocks/BlockRenderer';
import {
  getPosts,
  getPostById,
  getPostBySlug,
  getCategories,
  getTags,
  type CMSPost,
} from './client';

/**
 * Context for resolving dynamic bindings
 */
export interface CMSContext {
  currentSlug?: string;
  currentPostId?: string;
  currentPost?: CMSPost;
  preview?: boolean;
  searchQuery?: string;
  page?: number;
}

/**
 * Resolve dynamic bindings in block props
 * Handles templates like {{page.slug}}, {{post.title}}, etc.
 */
export function resolveDynamicBindings(
  value: any,
  context: CMSContext
): any {
  if (typeof value === 'string') {
    // {{page.slug}}
    if (value.includes('{{page.slug}}') && context.currentSlug) {
      return value.replace(/\{\{page\.slug\}\}/g, context.currentSlug);
    }

    // {{page.number}}
    if (value.includes('{{page.number}}') && context.page) {
      return value.replace(/\{\{page\.number\}\}/g, String(context.page));
    }

    // {{post.id}}
    if (value.includes('{{post.id}}') && context.currentPostId) {
      return value.replace(/\{\{post\.id\}\}/g, context.currentPostId);
    }

    // {{post.title}}
    if (value.includes('{{post.title}}') && context.currentPost) {
      return value.replace(/\{\{post\.title\}\}/g, context.currentPost.title);
    }

    // {{search.query}}
    if (value.includes('{{search.query}}') && context.searchQuery) {
      return value.replace(/\{\{search\.query\}\}/g, context.searchQuery);
    }

    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => resolveDynamicBindings(item, context));
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const resolved: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      resolved[key] = resolveDynamicBindings(val, context);
    }
    return resolved;
  }

  return value;
}

/**
 * Fetch CMS data for a specific block based on its type and props
 */
export async function fetchCMSDataForBlock(
  block: DesignerNode,
  context: CMSContext
): Promise<any> {
  const { type, props } = block;

  // Resolve dynamic bindings in props first
  const resolvedProps = resolveDynamicBindings(props, context);

  switch (type) {
    case 'CPTList':
      return fetchCPTListData(resolvedProps, context);

    case 'CPTItem':
      return fetchCPTItemData(resolvedProps, context);

    case 'CategoryList':
      return fetchCategoryListData(resolvedProps, context);

    case 'TagCloud':
      return fetchTagCloudData(resolvedProps, context);

    case 'RecentPosts':
      return fetchRecentPostsData(resolvedProps, context);

    case 'RelatedPosts':
      return fetchRelatedPostsData(resolvedProps, context);

    case 'Breadcrumb':
      return fetchBreadcrumbData(resolvedProps, context);

    case 'Pagination':
      return fetchPaginationData(resolvedProps, context);

    case 'SearchBar':
      // SearchBar doesn't need data fetching
      return null;

    default:
      return null;
  }
}

/**
 * Fetch data for CPTList block
 */
async function fetchCPTListData(props: any, context: CMSContext) {
  const posts = await getPosts({
    postType: props.postType || 'post',
    limit: props.limit || 10,
    orderBy: props.orderBy || 'date',
    order: props.order || 'desc',
    category: props.category,
    tag: props.tag,
    page: context.page || 1,
    preview: context.preview,
  });

  return { posts };
}

/**
 * Fetch data for CPTItem block
 */
async function fetchCPTItemData(props: any, context: CMSContext) {
  let post: CMSPost | null = null;

  if (props.postId) {
    post = await getPostById(props.postId, context.preview);
  } else if (props.useCurrent && context.currentSlug) {
    post = await getPostBySlug(
      context.currentSlug,
      props.postType || 'post',
      context.preview
    );
  }

  return { post };
}

/**
 * Fetch data for CategoryList block
 */
async function fetchCategoryListData(props: any, _context: CMSContext) {
  const categories = await getCategories(props.postType || 'post');

  // Apply limit if specified
  const limited = props.limit ? categories.slice(0, props.limit) : categories;

  return { categories: limited };
}

/**
 * Fetch data for TagCloud block
 */
async function fetchTagCloudData(props: any, _context: CMSContext) {
  const tags = await getTags(props.limit);
  return { tags };
}

/**
 * Fetch data for RecentPosts block
 */
async function fetchRecentPostsData(props: any, context: CMSContext) {
  const posts = await getPosts({
    postType: props.postType || 'post',
    limit: props.limit || 5,
    orderBy: 'date',
    order: 'desc',
    preview: context.preview,
  });

  return { posts };
}

/**
 * Fetch data for RelatedPosts block
 */
async function fetchRelatedPostsData(props: any, context: CMSContext) {
  if (!context.currentPost) {
    return { posts: [] };
  }

  const relationType = props.relationType || 'category';
  let posts: CMSPost[] = [];

  if (relationType === 'category' && context.currentPost.categories?.length) {
    posts = await getPosts({
      postType: context.currentPost.postType,
      category: context.currentPost.categories[0],
      limit: props.limit || 3,
      preview: context.preview,
    });
  } else if (relationType === 'tag' && context.currentPost.tags?.length) {
    posts = await getPosts({
      postType: context.currentPost.postType,
      tag: context.currentPost.tags[0],
      limit: props.limit || 3,
      preview: context.preview,
    });
  } else if (relationType === 'author' && context.currentPost.author) {
    posts = await getPosts({
      postType: context.currentPost.postType,
      author: context.currentPost.author.id,
      limit: props.limit || 3,
      preview: context.preview,
    });
  }

  // Filter out current post
  const filtered = posts.filter((p) => p.id !== context.currentPost?.id);

  return { posts: filtered };
}

/**
 * Fetch data for Breadcrumb block
 */
async function fetchBreadcrumbData(props: any, context: CMSContext) {
  const breadcrumbs: Array<{ label: string; url: string }> = [];

  // Always start with Home
  if (props.showHome !== false) {
    breadcrumbs.push({ label: 'Home', url: '/' });
  }

  // If we have current post, add its breadcrumb trail
  if (context.currentPost) {
    // Add post type
    breadcrumbs.push({
      label: context.currentPost.postType,
      url: `/${context.currentPost.postType}`,
    });

    // Add categories if available
    if (context.currentPost.categories && context.currentPost.categories.length > 0) {
      breadcrumbs.push({
        label: context.currentPost.categories[0],
        url: `/${context.currentPost.postType}/category/${context.currentPost.categories[0]}`,
      });
    }

    // Add current post (no URL)
    breadcrumbs.push({
      label: context.currentPost.title,
      url: '',
    });
  } else if (context.currentSlug) {
    // Simple slug-based breadcrumb
    breadcrumbs.push({
      label: context.currentSlug,
      url: '',
    });
  }

  return { breadcrumbs };
}

/**
 * Fetch data for Pagination block
 */
async function fetchPaginationData(props: any, context: CMSContext) {
  // For now, return basic pagination data
  // In a real implementation, this would come from the posts query
  const currentPage = context.page || 1;
  const totalPages = props.totalPages || 10;

  return {
    currentPage,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}
