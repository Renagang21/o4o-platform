/**
 * Forum API Response DTOs (Backend re-export)
 *
 * Canonical types live in @o4o/types/forum (frontend-safe).
 * This file re-exports them for backend convenience and adds
 * the typed ForumPostMetadata variant of ForumPostResponse.
 *
 * Phase 19-B: Forum Frontend Type & API Contract 정합 리팩토링
 */

// Re-export all shared types from @o4o/types/forum
export type {
  ForumPostStatus,
  ForumPostType,
  ForumCommentStatus,
  ForumCategoryAccessLevel,
  ForumAuthorResponse,
  ForumCategoryInline,
  ForumPostResponse,
  ForumCategoryResponse,
  ForumCommentResponse,
  ForumPaginationInfo,
  ForumListResponse,
  ForumSingleResponse,
  ForumCategoryListResponse,
  ForumActionResponse,
  ForumErrorResponse,
} from '@o4o/types/forum';

// Re-export runtime enums for backend use
export { PostStatus, PostType } from '../entities/ForumPost.js';
export { CommentStatus } from '../entities/ForumComment.js';
