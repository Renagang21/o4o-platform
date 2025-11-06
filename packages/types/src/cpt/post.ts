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
export type PostStatus = 'draft' | 'published' | 'publish' | 'scheduled' | 'trash' | 'private';
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
  featured_media?: string; // WordPress-style compatibility

  // Metadata and SEO
  meta?: Record<string, any>; // Flexible meta field
  seo?: SEOMetadata;

  // Timestamps
  publishedAt?: Date;
  published_at?: Date; // WordPress-style compatibility
  scheduledAt?: Date;
  createdAt: Date;
  created_at?: Date; // WordPress-style compatibility
  updatedAt: Date;
  updated_at?: Date; // WordPress-style compatibility
  deletedAt?: Date;

  // Additional properties
  revisions?: PostRevision[];
  commentCount?: number;
  viewCount?: number;
  commentStatus?: CommentStatus;
  comment_status?: CommentStatus; // WordPress-style compatibility
  pingStatus?: PingStatus;
  ping_status?: PingStatus; // WordPress-style compatibility
  isSticky?: boolean;
  sticky?: boolean; // WordPress-style compatibility

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
