/**
 * Forum Types and DTOs
 */
import type { Block } from '@o4o/types';
import { PostStatus, PostType } from '../entities/ForumPost.js';

/**
 * Convert plain text to Block[] format
 * Used for backwards compatibility with string content
 */
export function textToBlocks(text: string): Block[] {
  if (!text || text.trim() === '') {
    return [];
  }

  // Split by double newlines to create paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  return paragraphs.map((paragraph, index) => ({
    id: `block-${Date.now()}-${index}`,
    type: 'paragraph',
    content: paragraph.trim(),
    attributes: {},
    order: index,
  }));
}

/**
 * Convert Block[] to plain text
 * Used for excerpt generation and search indexing
 */
export function blocksToText(blocks: Block[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return '';
  }

  return blocks
    .map(block => {
      if (typeof block.content === 'string') {
        return block.content;
      }
      if (typeof block.content === 'object' && block.content?.text) {
        return block.content.text;
      }
      return '';
    })
    .filter(text => text.trim())
    .join('\n\n');
}

/**
 * Normalize content to Block[] format
 * Accepts either string or Block[] and always returns Block[]
 */
export function normalizeContent(content: string | Block[] | undefined | null): Block[] {
  if (!content) {
    return [];
  }

  if (typeof content === 'string') {
    return textToBlocks(content);
  }

  if (Array.isArray(content)) {
    return content;
  }

  return [];
}

/**
 * Create Post DTO
 */
export interface CreateForumPostDto {
  title: string;
  content: string | Block[];
  excerpt?: string;
  slug?: string;
  type?: PostType;
  status?: PostStatus;
  categoryId: string;
  organizationId?: string;
  isOrganizationExclusive?: boolean;
  isPinned?: boolean;
  isLocked?: boolean;
  allowComments?: boolean;
  tags?: string[];
  metadata?: ForumPostMetadata;
}

/**
 * Update Post DTO
 */
export interface UpdateForumPostDto {
  title?: string;
  content?: string | Block[];
  excerpt?: string;
  slug?: string;
  type?: PostType;
  status?: PostStatus;
  categoryId?: string;
  organizationId?: string;
  isOrganizationExclusive?: boolean;
  isPinned?: boolean;
  isLocked?: boolean;
  allowComments?: boolean;
  tags?: string[];
  metadata?: ForumPostMetadata;
}

/**
 * Forum Post Metadata Interface
 * Structured metadata for forum posts
 */
export interface ForumPostMetadata {
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];

  // Display
  featuredImage?: string;
  thumbnailUrl?: string;

  // Moderation
  moderationNote?: string;
  moderatedAt?: string;
  moderatedBy?: string;

  // Analytics
  lastViewedAt?: string;
  peakViewCount?: number;

  // Custom fields (extensible)
  custom?: Record<string, unknown>;
}

/**
 * Forum Post List Query Parameters
 */
export interface ForumPostQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  authorId?: string;
  organizationId?: string;
  status?: PostStatus;
  type?: PostType;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'commentCount' | 'likeCount';
  sortOrder?: 'ASC' | 'DESC';
  isPinned?: boolean;
  tags?: string[];
}

export { PostStatus, PostType } from '../entities/ForumPost.js';
