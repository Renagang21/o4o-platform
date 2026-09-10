/**
 * Post Type Definitions - Single Source of Truth (SSOT)
 * Consolidated from all apps to ensure consistency
 */

import type { Tag } from '../common.js';
import type { AccessControl } from '../access-control.js';

// PostCategory type (specific to CMS posts, different from ecommerce Category)
export interface PostCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Post Status Types
export type PostStatus = 'draft' | 'pending' | 'published' | 'publish' | 'scheduled' | 'trash' | 'private';
export type PostType = 'post' | 'page' | string; // Allow custom post types
export type PostVisibility = 'public' | 'private' | 'password';
export type CommentStatus = 'open' | 'closed';
export type PingStatus = 'open' | 'closed';

// Block Types for Gutenberg-style content
export interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  children?: Block[]; // Legacy support
  innerBlocks?: Block[]; // Gutenberg-style nested blocks
  order?: number;
  clientId?: string; // Unique client-side identifier for React keys
}

// SEO Metadata
export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
  schema?: Record<string, unknown>;
}

// Post Revision
export interface PostRevision {
  id: string;
  postId: string;
  title: string;
  content: string;
  excerpt?: string;
  authorId: string;
  createdAt: Date;
  reason?: string;
  timestamp?: string;
  author?: string;
  changes?: Partial<Post>;
}

// Core Post Interface
export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string | Block[]; // Support both raw content and blocks
  excerpt?: string;
  type: PostType;
  status: PostStatus;
  visibility: PostVisibility;
  password?: string;

  // Author information
  authorId: string;
  author?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };

  // Taxonomies
  categoryIds?: string[];
  categories?: PostCategory[];
  tagIds?: string[];
  tags?: Tag[];

  // Featured media
  featuredImageId?: string;
  featuredImage?: {
    id: string;
    url: string;
    alt?: string;
  };
  // WO-O4O-WORDPRESS-COMPAT-FIELD-AND-THEME-CONTRACT-FINAL-DISPOSITION-V1:
  //   snake_case WordPress 호환 alias 7건(featured_media · published_at · created_at · updated_at ·
  //   comment_status · ping_status · sticky)을 제거했다. 판정 DEAD_WORDPRESS_COMPAT —
  //     · 저장소 전체에서 선언 파일 외 read/write 소비처 0
  //     · 백엔드 Post 엔티티·컨트롤러는 6354e8755 에서 제거돼 어떤 API 응답에도 실리지 않는다
  //     · 어떤 migration 도 해당 컬럼을 만든 적 없다 (운영 데이터 0)
  //   camelCase 정본(featuredImageId · publishedAt · createdAt · updatedAt · commentStatus ·
  //   pingStatus · isSticky)만 남긴다. 새 alias·fallback 을 추가하지 않는다.
  //   ※ `published_at` 은 forum_post · store_pops 등 **DB 컬럼 이름**으로는 현행 정본이다 —
  //     여기서 지운 것은 이 TS 인터페이스의 중복 alias 뿐이다.

  // Metadata and SEO
  /**
   * @deprecated Phase 4-2: Use normalized Meta API instead
   * - GET /api/v1/posts/:id/meta
   * - PUT /api/v1/posts/:id/meta (upsert)
   * - DELETE /api/v1/posts/:id/meta/:key
   * This field is maintained for backward compatibility during migration.
   * Access via metaApi service or usePostMeta() hook.
   */
  meta?: Record<string, any>;
  seo?: SEOMetadata;

  // Timestamps
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Additional properties
  revisions?: PostRevision[];
  commentCount?: number;
  viewCount?: number;
  commentStatus?: CommentStatus;
  pingStatus?: PingStatus;
  isSticky?: boolean;

  // Template and layout
  template?: string;
  settings?: {
    layout?: string;
    template?: string;
    customCSS?: string;
    allowComments?: boolean;
    allowPingbacks?: boolean;
    sticky?: boolean;
  };

  // Access control
  accessControl?: AccessControl;
  hideFromSearchEngines?: boolean;

  // Editor state
  lastModifierId?: string;
  lastModifier?: {
    id: string;
    name: string;
    email: string;
  };
}

// Post with structured blocks (for Gutenberg)
export interface PostWithBlocks extends Omit<Post, 'content'> {
  content: Block[];
}

// Create Post DTO
export interface CreatePostDto {
  title: string;
  content: string | Block[];
  excerpt?: string;
  slug?: string;
  type?: PostType;
  status?: PostStatus;
  visibility?: PostVisibility;
  password?: string;
  categoryIds?: string[];
  categories?: PostCategory[];
  tagIds?: string[];
  tags?: Tag[];
  featuredImageId?: string;
  featuredImage?: {
    id: string;
    url: string;
    alt?: string;
  };
  meta?: Record<string, any>;
  metadata?: Record<string, any>; // For CPT compatibility
  acfFields?: Record<string, any>; // For ACF fields
  scheduledAt?: Date;
  template?: string;
  parentId?: string;
  order?: number;
  settings?: Post['settings'];
}

// Update Post DTO
export interface UpdatePostDto extends Partial<CreatePostDto> {
  id: string;
}

// Post Filter
export interface PostFilter {
  type?: PostType;
  status?: PostStatus;
  authorId?: string;
  categoryId?: string;
  tagId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// API Response Types
export interface PostResponse {
  success: boolean;
  data?: Post;
  error?: string;
  message?: string;
}

export interface PostListResponse {
  data: Post[];
  meta: {
    total: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

// Legacy response format (for backward compatibility)
export interface LegacyPostListResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// WordPress-compatible query parameters
export interface PostQueryParams {
  page?: number;
  per_page?: number;
  limit?: number;
  search?: string;
  author?: string;
  author_exclude?: string;
  before?: string;
  after?: string;
  exclude?: string;
  include?: string;
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'author' | 'date' | 'id' | 'include' | 'modified' | 'parent' | 'relevance' | 'slug' | 'title';
  slug?: string;
  status?: string;
  categories?: string;
  categories_exclude?: string;
  tags?: string;
  tags_exclude?: string;
  sticky?: boolean;
  format?: string;
  type?: string;
  post_type?: string;
}

// Custom Post Type Post (for CPT engine compatibility)
export interface CustomPostTypePost {
  id: string;
  postType: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  status: PostStatus;
  author: {
    id: string;
    name: string;
    email: string;
  };
  customFields: Record<string, any>;
  featuredImage?: {
    id: string;
    url: string;
    alt?: string;
  };
  categories?: Array<{ id: string; name: string; slug: string }>;
  tags?: Array<{ id: string; name: string; slug: string }>;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
