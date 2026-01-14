/**
 * Forum API Service - K-Cosmetics
 *
 * Based on web-neture/src/services/forumApi.ts
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.k-cosmetics.site';

// ============================================================================
// Types
// ============================================================================

export type PostType = 'DISCUSSION' | 'QUESTION' | 'ANNOUNCEMENT' | 'POLL' | 'GUIDE';

export interface ForumPost {
  id: string;
  title: string;
  slug: string;
  content?: string | object[];
  excerpt?: string;
  type: PostType;
  authorId: string;
  author?: {
    id: string;
    name?: string;
    username?: string;
  };
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  isPinned: boolean;
  commentCount: number;
  createdAt: string;
  publishedAt?: string;
}

export interface ForumComment {
  id: string;
  content: string | object[];
  authorId: string;
  author?: {
    id: string;
    name?: string;
    username?: string;
  };
  createdAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
}

export interface PostsResponse {
  success: boolean;
  data: ForumPost[];
  pagination: PaginationInfo;
  totalCount: number;
}

export interface PostResponse {
  success: boolean;
  data: ForumPost;
}

export interface CommentsResponse {
  success: boolean;
  data: ForumComment[];
  pagination: PaginationInfo;
  totalCount: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch forum posts with optional filters
 */
export async function fetchForumPosts(params: {
  categoryId?: string;
  page?: number;
  limit?: number;
  isPinned?: boolean;
}): Promise<PostsResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/api/v1/forum/posts?${queryParams}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch posts');
    }

    // Filter pinned if needed
    if (params.isPinned !== undefined) {
      data.data = data.data.filter((p: ForumPost) => p.isPinned === params.isPinned);
    }

    return data;
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 10, totalPages: 0 },
      totalCount: 0,
    };
  }
}

/**
 * Fetch pinned posts
 */
export async function fetchPinnedPosts(limit: number = 2): Promise<ForumPost[]> {
  const response = await fetchForumPosts({ isPinned: true, limit });
  return response.data;
}

/**
 * Fetch a single post by ID
 */
export async function fetchForumPostById(postId: string): Promise<PostResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/posts/${postId}`);
    const data = await response.json();

    if (!data.success) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching forum post:', error);
    return null;
  }
}

/**
 * Fetch comments for a post
 */
export async function fetchForumComments(postId: string): Promise<CommentsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/posts/${postId}/comments`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching forum comments:', error);
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: 20, totalPages: 0 },
      totalCount: 0,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize post type from API response
 */
export function normalizePostType(type: string): PostType {
  const normalized = type.toUpperCase();
  if (['DISCUSSION', 'QUESTION', 'ANNOUNCEMENT', 'POLL', 'GUIDE'].includes(normalized)) {
    return normalized as PostType;
  }
  return 'DISCUSSION';
}

/**
 * Get author name from post
 */
export function getAuthorName(post: ForumPost): string {
  return post.author?.name || post.author?.username || '익명';
}

/**
 * Extract text content from Block[] or string
 */
export function extractTextContent(content: string | object[] | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((block: any) => {
        if (block.type === 'paragraph' && block.content) {
          return block.content;
        }
        if (block.type === 'heading' && block.content) {
          return block.content;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
}
