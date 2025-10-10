/**
 * Blog API Types
 * Type definitions for blog-related API operations
 */

import { PostItem, BlogSettings } from '@/types/customizer-types';

// Extended Blog Types for API
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  url: string;
  postCount: number;
  color?: string;
  image?: {
    url: string;
    alt: string;
  };
  parent?: string;
  children?: BlogCategory[];
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  url: string;
  postCount: number;
  color?: string;
}

export interface BlogAuthor {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio?: string;
  url: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  postCount: number;
  role: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  authorName: string;
  authorEmail: string;
  authorUrl?: string;
  content: string;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  createdAt: string;
  updatedAt: string;
  parent?: string;
  children?: BlogComment[];
  isAuthorReply: boolean;
}

export interface ExtendedPostItem extends PostItem {
  publishedAt?: string;
  updatedAt: string;
  metaDescription?: string;
  metaKeywords?: string[];
  customFields?: Record<string, any>;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    noindex?: boolean;
    nofollow?: boolean;
  };
  comments?: BlogComment[];
  commentStatus: 'open' | 'closed';
  pingStatus: 'open' | 'closed';
  sticky: boolean;
  featured: boolean;
  template?: string;
}

// API Request/Response Types
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  postsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  firstPage: number;
  lastPage: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

export interface BlogPostsData {
  posts: ExtendedPostItem[];
  pagination: PaginationMeta;
  filters?: {
    categories: BlogCategory[];
    tags: BlogTag[];
    authors: BlogAuthor[];
    dateRanges: {
      label: string;
      value: string;
      count: number;
    }[];
  };
}

export interface BlogArchiveData {
  years: {
    year: number;
    postCount: number;
    months: {
      month: number;
      monthName: string;
      postCount: number;
      posts?: ExtendedPostItem[];
    }[];
  }[];
}

export interface BlogStatsData {
  totalPosts: number;
  totalViews: number;
  totalComments: number;
  totalCategories: number;
  totalTags: number;
  totalAuthors: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  recentActivity: {
    date: string;
    action: 'post_published' | 'comment_added' | 'post_updated';
    description: string;
    postId?: string;
    postTitle?: string;
  }[];
  popularPosts: {
    id: string;
    title: string;
    views: number;
    url: string;
  }[];
  topCategories: {
    id: string;
    name: string;
    postCount: number;
    url: string;
  }[];
  topTags: {
    id: string;
    name: string;
    postCount: number;
    url: string;
  }[];
}

// Error Types
export interface BlogAPIError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationError extends BlogAPIError {
  field: string;
  value: any;
  constraint: string;
}

// Search Types
export interface BlogSearchResult {
  posts: ExtendedPostItem[];
  categories: BlogCategory[];
  tags: BlogTag[];
  authors: BlogAuthor[];
  totalResults: number;
  searchQuery: string;
  searchTime: number;
  suggestions?: string[];
}

// Import/Export Types
export interface BlogExportData {
  posts: ExtendedPostItem[];
  categories: BlogCategory[];
  tags: BlogTag[];
  authors: BlogAuthor[];
  settings: BlogSettings;
  meta: {
    exportDate: string;
    version: string;
    totalItems: number;
  };
}

export interface BlogImportResult {
  success: boolean;
  imported: {
    posts: number;
    categories: number;
    tags: number;
    authors: number;
  };
  skipped: {
    posts: number;
    categories: number;
    tags: number;
    authors: number;
  };
  errors: BlogAPIError[];
  warnings: string[];
}

// Webhook Types
export interface BlogWebhook {
  id: string;
  url: string;
  events: ('post.created' | 'post.updated' | 'post.deleted' | 'comment.added')[];
  secret?: string;
  active: boolean;
  lastTriggered?: string;
  failureCount: number;
}

export interface BlogWebhookPayload {
  event: string;
  timestamp: string;
  data: {
    post?: ExtendedPostItem;
    comment?: BlogComment;
    previous?: Partial<ExtendedPostItem>;
  };
  site: {
    url: string;
    name: string;
  };
}

// Re-export commonly used types
export type { PostItem, BlogSettings } from '@/types/customizer-types';