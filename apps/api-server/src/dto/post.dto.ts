import { CustomPost } from '../entities/CustomPost.js';

/**
 * Standard API Response DTOs for Post endpoints
 * Phase 2 - Response Format Standardization
 *
 * All list endpoints should return { data: T[], meta: { total: number, ...pagination } }
 * All single endpoints should return { data: T }
 */

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number;
  page?: number;
  limit?: number;
  pageSize?: number;
  pages?: number;
  totalPages?: number;
}

/**
 * Standard list response format
 */
export interface PostListResponse {
  data: CustomPost[];
  meta: PaginationMeta;
}

/**
 * Standard single post response format
 */
export interface PostSingleResponse {
  data: CustomPost;
  meta?: Record<string, unknown>;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  data?: {
    status: number;
    [key: string]: unknown;
  };
}

/**
 * Helper to transform service response to standard DTO format
 */
export function toPostListResponse(
  posts: CustomPost[],
  pagination?: {
    page?: number;
    limit?: number;
    total: number;
    pages?: number;
  }
): PostListResponse {
  return {
    data: posts,
    meta: {
      total: pagination?.total || posts.length,
      ...(pagination?.page && { page: pagination.page }),
      ...(pagination?.limit && { limit: pagination.limit, pageSize: pagination.limit }),
      ...(pagination?.pages && { pages: pagination.pages, totalPages: pagination.pages })
    }
  };
}

/**
 * Helper to transform service response to single post DTO format
 */
export function toPostSingleResponse(
  post: CustomPost,
  additionalMeta?: Record<string, unknown>
): PostSingleResponse {
  return {
    data: post,
    ...(additionalMeta && { meta: additionalMeta })
  };
}
