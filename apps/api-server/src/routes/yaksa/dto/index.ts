/**
 * Yaksa DTOs
 *
 * Phase A-1: Yaksa API Implementation
 * Data Transfer Objects for API requests/responses
 */

import { YaksaPostStatus } from '../entities/yaksa-post.entity.js';
import { YaksaCategoryStatus } from '../entities/yaksa-category.entity.js';

// ============================================================================
// Error Response
// ============================================================================

export interface ErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============================================================================
// Category DTOs
// ============================================================================

export interface ListCategoriesQueryDto {
  status?: YaksaCategoryStatus;
}

export interface CreateCategoryRequestDto {
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateCategoryRequestDto {
  name?: string;
  slug?: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateCategoryStatusRequestDto {
  status: YaksaCategoryStatus;
}

export interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: YaksaCategoryStatus;
  sort_order: number;
  post_count?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Post DTOs
// ============================================================================

export interface ListPostsQueryDto {
  page?: number;
  limit?: number;
  category_id?: string;
  status?: YaksaPostStatus;
  is_pinned?: boolean;
  is_notice?: boolean;
  sort?: 'created_at' | 'updated_at' | 'view_count';
  order?: 'asc' | 'desc';
}

export interface CreatePostRequestDto {
  category_id: string;
  title: string;
  content: string;
  status?: YaksaPostStatus;
  is_pinned?: boolean;
  is_notice?: boolean;
}

export interface UpdatePostRequestDto {
  category_id?: string;
  title?: string;
  content?: string;
  is_pinned?: boolean;
  is_notice?: boolean;
}

export interface UpdatePostStatusRequestDto {
  status: YaksaPostStatus;
  reason?: string;
}

export interface PostResponseDto {
  id: string;
  category_id: string;
  category?: CategoryResponseDto;
  title: string;
  content: string;
  status: YaksaPostStatus;
  is_pinned: boolean;
  is_notice: boolean;
  view_count: number;
  created_by_user_id?: string;
  created_by_user_name?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface PostListItemDto {
  id: string;
  category_id: string;
  category_name?: string;
  title: string;
  status: YaksaPostStatus;
  is_pinned: boolean;
  is_notice: boolean;
  view_count: number;
  created_by_user_name?: string;
  created_at: string;
  published_at?: string;
}

// ============================================================================
// Log DTOs
// ============================================================================

export interface ListLogsQueryDto {
  post_id?: string;
  page?: number;
  limit?: number;
}

export interface PostLogResponseDto {
  id: string;
  post_id: string;
  action: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  reason?: string;
  changed_by_user_name?: string;
  created_at: string;
}
