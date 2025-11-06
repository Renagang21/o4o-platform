/**
 * Post Types - Re-export from SSOT
 * This file is kept for backward compatibility but now uses @o4o/types/cpt
 */

// Re-export all types from the centralized types package
export type {
  Post,
  PostStatus,
  PostType,
  PostVisibility,
  Block,
  PostCategory,
  PostResponse,
  PostListResponse,
  CreatePostDto as CreatePostRequest,
  UpdatePostDto as UpdatePostRequest,
  PostFilter,
  SEOMetadata,
  PostRevision,
  PostWithBlocks,
  CommentStatus,
  PingStatus,
  PostQueryParams,
  LegacyPostListResponse,
  CustomPostTypePost
} from '@o4o/types/cpt';

// Re-export common types
export type { Tag } from '@o4o/types';

// Legacy type aliases for backward compatibility
import type { Post as BasePost, Block as BaseBlock } from '@o4o/types/cpt';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: string;
  count?: number;
}

export interface Media {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface MediaUploadResponse {
  success: boolean;
  data?: Media;
  error?: string;
}
