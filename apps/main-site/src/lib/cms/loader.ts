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
  // Skip cache in preview mode
  if (!preview) {
    const cached = getCachedView(slug);
    if (cached !== undefined) {
      return cached;
    }
  }

  try {
    // Try to fetch page from CMS API first
    const page = await fetchPageBySlug(slug);

    if (page) {
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
    const viewData = await fetchViewBySlug(slug);

    if (!viewData) {
      // Neither page nor view found
      setCachedView(slug, null);
      return null;
    }

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
  // Forum API
  getForumStats,
  getForumCategories,
  getForumPosts,
  getForumPost,
  getForumComments,
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

    // Forum Blocks
    case 'ForumHome':
      return fetchForumHomeData(resolvedProps, context);

    case 'ForumPostList':
      return fetchForumPostListData(resolvedProps, context);

    case 'ForumPostDetail':
      return fetchForumPostDetailData(resolvedProps, context);

    case 'ForumCommentSection':
      return fetchForumCommentSectionData(resolvedProps, context);

    case 'ForumCategoryList':
      return fetchForumCategoryListData(resolvedProps, context);

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

// ==================== Forum Block Data Loaders ====================

/**
 * Fetch data for ForumHome block
 */
async function fetchForumHomeData(props: any, _context: CMSContext) {
  const {
    showStats = true,
    showCategories = true,
    showPinnedPosts = true,
    showRecentPosts = true,
    recentPostsLimit = 10,
  } = props;

  const [stats, categories, pinnedPosts, recentPosts] = await Promise.all([
    showStats ? getForumStats() : Promise.resolve(null),
    showCategories ? getForumCategories() : Promise.resolve([]),
    showPinnedPosts
      ? getForumPosts({ isPinned: true, limit: 5 })
      : Promise.resolve({ posts: [], total: 0, hasMore: false }),
    showRecentPosts
      ? getForumPosts({ sortBy: 'newest', limit: recentPostsLimit })
      : Promise.resolve({ posts: [], total: 0, hasMore: false }),
  ]);

  return {
    stats,
    categories,
    pinnedPosts: pinnedPosts.posts,
    recentPosts: recentPosts.posts,
  };
}

/**
 * Fetch data for ForumPostList block
 */
async function fetchForumPostListData(props: any, context: CMSContext) {
  const {
    categoryId,
    categorySlug,
    sortBy = 'newest',
    postsPerPage = 10,
    showPinnedFirst = true,
  } = props;

  let pinnedPosts: any[] = [];

  // Fetch pinned posts separately if needed
  if (showPinnedFirst && context.page === 1) {
    const pinned = await getForumPosts({
      categoryId,
      categorySlug,
      isPinned: true,
      limit: 5,
    });
    pinnedPosts = pinned.posts;
  }

  // Fetch regular posts
  const result = await getForumPosts({
    categoryId,
    categorySlug,
    sortBy,
    limit: postsPerPage,
    page: context.page || 1,
  });

  return {
    posts: result.posts,
    pinnedPosts,
    pagination: {
      currentPage: context.page || 1,
      totalPosts: result.total,
      hasMore: result.hasMore,
    },
  };
}

/**
 * Fetch data for ForumPostDetail block
 */
async function fetchForumPostDetailData(props: any, context: CMSContext) {
  const { postId, showRelatedPosts = true, relatedPostsLimit = 5 } = props;

  // Use postId from props or currentSlug from context
  const id = postId || context.currentSlug;

  if (!id) {
    return { post: null, relatedPosts: [] };
  }

  const post = await getForumPost(id);

  if (!post) {
    return { post: null, relatedPosts: [] };
  }

  // Fetch related posts from same category
  let relatedPosts: any[] = [];
  if (showRelatedPosts && post.categoryId) {
    const related = await getForumPosts({
      categoryId: post.categoryId,
      sortBy: 'popular',
      limit: relatedPostsLimit + 1, // +1 to filter out current post
    });
    relatedPosts = related.posts
      .filter((p) => p.id !== post.id)
      .slice(0, relatedPostsLimit);
  }

  return {
    post,
    relatedPosts,
  };
}

/**
 * Fetch data for ForumCommentSection block
 */
async function fetchForumCommentSectionData(props: any, context: CMSContext) {
  const { postId, sortBy = 'newest', commentsPerPage = 20 } = props;

  // Use postId from props or currentSlug from context
  const id = postId || context.currentSlug;

  if (!id) {
    return { comments: [], totalCount: 0, hasMore: false };
  }

  const result = await getForumComments(id, {
    sortBy,
    limit: commentsPerPage,
    page: context.page || 1,
  });

  return {
    comments: result.comments,
    totalCount: result.total,
    hasMore: result.hasMore,
  };
}

/**
 * Fetch data for ForumCategoryList block
 */
async function fetchForumCategoryListData(_props: any, _context: CMSContext) {
  const categories = await getForumCategories();

  return {
    categories,
  };
}
