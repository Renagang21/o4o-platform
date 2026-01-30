/**
 * Forum API Service
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * Phase B-2: forum-core API 연동 (읽기)
 * Phase B-3: 글 작성 API 연동 (쓰기)
 *
 * 역할: Mock ↔ Real API 전환을 env로 제어
 */

// Feature flag for API switching
const USE_REAL_API = import.meta.env.VITE_USE_REAL_FORUM_API === 'true';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

// ============================================================================
// Types — imported from @o4o/types/forum (Single Source of Truth)
// Phase 19-B: Forum Frontend Type & API Contract 정합 리팩토링
// ============================================================================

import type {
  ForumPostResponse,
  ForumPostType,
  ForumCommentResponse,
  ForumCategoryResponse,
  ForumAuthorResponse,
  ForumPaginationInfo,
  ForumListResponse,
  ForumSingleResponse,
  ForumCategoryListResponse,
} from '@o4o/types/forum';

// Re-export shared types for consumers
export type {
  ForumPostResponse,
  ForumPostType,
  ForumCommentResponse,
  ForumCategoryResponse,
  ForumAuthorResponse,
  ForumPaginationInfo,
};

// Backward-compatible aliases used throughout web-neture
export type ForumPost = ForumPostResponse;
export type ForumComment = ForumCommentResponse;
export type ForumCategory = ForumCategoryResponse;
export type PaginationInfo = ForumPaginationInfo;
export type PostType = ForumPostType;
export type AuthorContactInfo = ForumAuthorResponse;
export type PostsResponse = ForumListResponse<ForumPostResponse>;
export type PostResponse = ForumSingleResponse<ForumPostResponse>;
export type CommentsResponse = ForumListResponse<ForumCommentResponse>;
export type CategoriesResponse = ForumCategoryListResponse;

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_CATEGORY = {
  id: 'neture-forum',
  name: 'Neture 포럼',
  slug: 'neture-forum',
  description: 'o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간',
  sortOrder: 0,
  isActive: true,
  requireApproval: false,
  accessLevel: 'all',
  postCount: 3,
  isOrganizationExclusive: false,
  createdAt: '2024-01-15T09:00:00Z',
  updatedAt: '2024-01-15T09:00:00Z',
} satisfies ForumCategory;

// Mock post defaults for required fields
const MOCK_POST_DEFAULTS = {
  content: '',
  status: 'publish',
  isOrganizationExclusive: false,
  isLocked: false,
  allowComments: true,
  showContactOnPost: false,
  viewCount: 0,
  likeCount: 0,
} as const;

// 운영자 초기 글 세트 (WO-NETURE-HOME-HUB-FORUM-V0.1)
const MOCK_POSTS: ForumPost[] = [
  // 1. 포럼의 정체성을 고정하는 글 (ANNOUNCEMENT)
  {
    ...MOCK_POST_DEFAULTS,
    id: '1',
    title: '이 포럼은 무엇을 위한 공간인가',
    slug: 'forum-purpose-and-scope',
    excerpt: '이 포럼은 네뚜레나 o4o 서비스를 홍보하기 위한 공간이 아닙니다. 또한 고객 문의나 거래를 처리하는 곳도 아닙니다...',
    type: 'announcement',
    authorId: 'admin',
    author: { id: 'admin', name: 'Neture 운영팀' },
    categoryId: 'neture-forum',
    category: { id: 'neture-forum', name: 'Neture 포럼', slug: 'neture-forum' },
    isPinned: true,
    commentCount: 0,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
    publishedAt: '2024-01-15T09:00:00Z',
  },
  // 2. 참여를 유도하는 질문 글 (QUESTION)
  {
    ...MOCK_POST_DEFAULTS,
    id: '2',
    title: '운영자가 묻습니다: o4o는 어떻게 보이시나요?',
    slug: 'what-is-o4o-question',
    excerpt: '이 포럼을 보시는 분들께 몇 가지를 여쭙고 싶습니다. o4o라는 개념을 처음 보셨을 때, 어떤 느낌이 드셨나요?...',
    type: 'question',
    authorId: 'admin',
    author: { id: 'admin', name: 'Neture 운영팀' },
    categoryId: 'neture-forum',
    category: { id: 'neture-forum', name: 'Neture 포럼', slug: 'neture-forum' },
    isPinned: true,
    commentCount: 0,
    createdAt: '2024-01-15T09:30:00Z',
    updatedAt: '2024-01-15T09:30:00Z',
    publishedAt: '2024-01-15T09:30:00Z',
  },
  // 3. 기대하는 의견의 범위를 제시하는 글 (GUIDE)
  {
    ...MOCK_POST_DEFAULTS,
    id: '3',
    title: '이 포럼에서 특히 듣고 싶은 이야기들',
    slug: 'forum-welcome-guide',
    excerpt: '이 포럼에서는 다음과 같은 이야기들을 특히 환영합니다. 이 구조가 현실과 맞지 않아 보이는 이유...',
    type: 'guide',
    authorId: 'admin',
    author: { id: 'admin', name: 'Neture 운영팀' },
    categoryId: 'neture-forum',
    category: { id: 'neture-forum', name: 'Neture 포럼', slug: 'neture-forum' },
    isPinned: false,
    commentCount: 0,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    publishedAt: '2024-01-15T10:00:00Z',
  },
];

// 운영자 초기 글 상세 내용 (WO-NETURE-HOME-HUB-FORUM-V0.1)
const MOCK_POST_DETAILS: Record<string, { post: ForumPost; comments: ForumComment[] }> = {
  'forum-purpose-and-scope': {
    post: {
      ...MOCK_POSTS[0],
      content: `이 포럼은 네뚜레나 o4o 서비스를 홍보하기 위한 공간이 아닙니다.
또한 고객 문의나 거래를 처리하는 곳도 아닙니다.

네뚜레는 o4o라는 구조를 완성된 해답으로 제시하지 않기 때문에,
이해되지 않는 지점, 납득하기 어려운 구조, 현실과 맞지 않는 부분을
외부의 시선으로 점검할 필요가 있다고 판단했습니다.

이 포럼은 그런 판단의 연장선에서 만들어졌습니다.

- o4o라는 개념이 어렵게 느껴지는 이유
- 네뚜레의 역할이 모호하게 보이는 지점
- "이 구조가 실제로 가능할까?"라는 의문

이런 질문과 의견을 편하게 남겨주시면 됩니다.

정답을 요구하지 않습니다.
설득하려 하지도 않습니다.
다만, 이 구조를 함께 검토하고 다듬기 위한 의견은 진지하게 다룹니다.`,
    },
    comments: [],
  },
  'what-is-o4o-question': {
    post: {
      ...MOCK_POSTS[1],
      content: `이 포럼을 보시는 분들께 몇 가지를 여쭙고 싶습니다.

1. o4o라는 개념을 처음 보셨을 때, 어떤 느낌이 드셨나요?
2. "온라인이 오프라인을 지원한다"는 설명이 직관적으로 이해되셨나요?
3. 네뚜레가 정확히 어떤 역할을 하려는 서비스로 보이시나요?

전문적인 답변이 아니어도 괜찮습니다.
짧은 인상, 막연한 느낌, 혹은 "잘 모르겠다"는 말도 충분합니다.

이 포럼은 그런 반응을 모으기 위해 존재합니다.`,
    },
    comments: [],
  },
  'forum-welcome-guide': {
    post: {
      ...MOCK_POSTS[2],
      content: `이 포럼에서는 다음과 같은 이야기들을 특히 환영합니다.

- 이 구조가 현실과 맞지 않아 보이는 이유
- 공급자 또는 파트너 입장에서 느껴지는 거리감
- 기존 플랫폼과 비교했을 때의 장단점
- 설명이 부족하거나 오해를 부를 수 있는 표현

반대로, 아래와 같은 내용은 이 포럼의 목적과 맞지 않습니다.

- 상품 판매 또는 홍보
- 고객 문의, A/S 요청
- 특정 개인이나 조직에 대한 공격

포럼의 방향이 흐려지지 않도록,
운영자는 이 기준을 유지하려 합니다.`,
    },
    comments: [],
  },
};

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
  if (!USE_REAL_API) {
    // Mock response
    let posts = [...MOCK_POSTS];

    if (params.isPinned !== undefined) {
      posts = posts.filter(p => p.isPinned === params.isPinned);
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const paginatedPosts = posts.slice(start, start + limit);

    return {
      success: true,
      data: paginatedPosts,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(posts.length / limit),
      },
      totalCount: posts.length,
    };
  }

  // Real API call
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

    // Filter pinned if needed (API doesn't have isPinned filter)
    if (params.isPinned !== undefined) {
      data.data = data.data.filter((p: ForumPost) => p.isPinned === params.isPinned);
    }

    return data;
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    // Fallback to mock on error
    return fetchForumPosts({ ...params });
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
 * Fetch a single post by slug
 */
export async function fetchForumPostBySlug(slug: string): Promise<PostResponse | null> {
  if (!USE_REAL_API) {
    // Mock response
    const detail = MOCK_POST_DETAILS[slug];
    if (!detail) {
      // Try to find in MOCK_POSTS
      const post = MOCK_POSTS.find(p => p.slug === slug);
      if (post) {
        return {
          success: true,
          data: { ...post, content: post.excerpt || '' },
        };
      }
      return null;
    }
    return {
      success: true,
      data: detail.post,
    };
  }

  // Real API call - get post by slug directly
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/posts/${encodeURIComponent(slug)}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
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
  if (!USE_REAL_API) {
    // Mock response - find comments by post slug or id
    const detail = Object.values(MOCK_POST_DETAILS).find(d => d.post.id === postId);
    const comments = detail?.comments || [];

    return {
      success: true,
      data: comments,
      pagination: {
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      totalCount: comments.length,
    };
  }

  // Real API call
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

/**
 * Fetch categories
 */
export async function fetchForumCategories(): Promise<ForumCategoryListResponse> {
  if (!USE_REAL_API) {
    return {
      success: true,
      data: [MOCK_CATEGORY],
      count: 1,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/categories`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching forum categories:', error);
    return {
      success: false,
      data: [],
      count: 0,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize post type from API response
 */
export function normalizePostType(type: string): ForumPostType {
  const normalized = type.toLowerCase();
  const valid: ForumPostType[] = ['discussion', 'question', 'announcement', 'poll', 'guide'];
  if (valid.includes(normalized as ForumPostType)) {
    return normalized as ForumPostType;
  }
  return 'discussion';
}

/**
 * Get author name from post
 */
export function getAuthorName(post: ForumPost): string {
  return post.author?.name || post.author?.username || '익명';
}

// ============================================================================
// WO-NETURE-EXTERNAL-CONTACT-V1: User Contact API
// ============================================================================

export interface UserContactSettings {
  contactEnabled: boolean;
  kakaoOpenChatUrl: string | null;
  kakaoChannelUrl: string | null;
}

/**
 * Fetch current user's contact settings
 */
export async function fetchUserContactSettings(authToken: string): Promise<UserContactSettings | null> {
  if (!USE_REAL_API) {
    // Mock response
    return {
      contactEnabled: false,
      kakaoOpenChatUrl: null,
      kakaoChannelUrl: null,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me/contact`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error fetching user contact settings:', error);
    return null;
  }
}

/**
 * Update current user's contact settings
 */
export async function updateUserContactSettings(
  settings: Partial<UserContactSettings>,
  authToken: string
): Promise<{ success: boolean; error?: string }> {
  if (!USE_REAL_API) {
    // Mock response
    await new Promise(resolve => setTimeout(resolve, 300));
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me/contact`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(settings),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || '설정 저장에 실패했습니다.',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user contact settings:', error);
    return {
      success: false,
      error: '네트워크 오류가 발생했습니다.',
    };
  }
}

/**
 * Check if author's contact should be shown on post
 */
export function shouldShowAuthorContact(post: ForumPost): boolean {
  // Must have showContactOnPost enabled AND author must have contact enabled
  return !!(
    post.showContactOnPost &&
    post.author?.contactEnabled &&
    (post.author?.kakaoOpenChatUrl || post.author?.kakaoChannelUrl)
  );
}

/**
 * Get author's contact URL (prioritize open chat, fallback to channel)
 */
export function getAuthorContactUrl(post: ForumPost): string | null {
  if (!shouldShowAuthorContact(post)) return null;
  return post.author?.kakaoOpenChatUrl || post.author?.kakaoChannelUrl || null;
}

/**
 * Extract text content from Block[] or string
 */
export function extractTextContent(content: string | object[] | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;

  // Handle Block[] format
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

// ============================================================================
// Phase B-3: Write API
// ============================================================================

export interface CreateForumPostPayload {
  title: string;
  content: string | any[]; // Block[] or string for backward compatibility
  categorySlug: string;
  // WO-NETURE-EXTERNAL-CONTACT-V1: Show author's contact on this post
  showContactOnPost?: boolean;
}

export interface CreatePostResponse {
  success: boolean;
  data?: ForumPost;
  error?: string;
}

/**
 * Create a new forum post
 */
export async function createForumPost(
  payload: CreateForumPostPayload,
  authToken: string
): Promise<CreatePostResponse> {
  if (!USE_REAL_API) {
    // Mock response - simulate post creation
    const now = new Date().toISOString();
    const newPost: ForumPost = {
      ...MOCK_POST_DEFAULTS,
      id: `mock-${Date.now()}`,
      title: payload.title,
      slug: payload.title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50) + '-' + Date.now().toString(36),
      content: payload.content,
      type: 'discussion',
      authorId: 'current-user',
      author: { id: 'current-user', name: '작성자' },
      categoryId: 'neture-forum',
      category: { id: 'neture-forum', name: 'Neture 포럼', slug: 'neture-forum' },
      isPinned: false,
      showContactOnPost: payload.showContactOnPost || false,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    };

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      data: newPost,
    };
  }

  // Real API call
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        categorySlug: payload.categorySlug,
        type: 'discussion',
        // WO-NETURE-EXTERNAL-CONTACT-V1
        showContactOnPost: payload.showContactOnPost || false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || '게시글 작성에 실패했습니다.',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('Error creating forum post:', error);
    return {
      success: false,
      error: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };
  }
}

/**
 * Create a new forum comment (cookie-based auth)
 */
export async function createForumComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<{ success: boolean; data?: ForumComment; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ postId, content, parentId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || '댓글 작성에 실패했습니다.',
      };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error creating forum comment:', error);
    return {
      success: false,
      error: '네트워크 오류가 발생했습니다.',
    };
  }
}

/**
 * Update an existing forum comment (cookie-based auth)
 */
export async function updateForumComment(
  commentId: string,
  content: string
): Promise<{ success: boolean; data?: ForumComment; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || '댓글 수정에 실패했습니다.',
      };
    }

    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error updating forum comment:', error);
    return {
      success: false,
      error: '네트워크 오류가 발생했습니다.',
    };
  }
}

/**
 * Delete a forum comment (cookie-based auth, soft delete)
 */
export async function deleteForumComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/forum/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || '댓글 삭제에 실패했습니다.',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting forum comment:', error);
    return {
      success: false,
      error: '네트워크 오류가 발생했습니다.',
    };
  }
}
