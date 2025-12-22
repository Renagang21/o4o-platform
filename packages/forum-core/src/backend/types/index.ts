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

// =============================================================================
// AI Generated Metadata Types (Phase 16)
// =============================================================================

/**
 * AI Summary Metadata
 * Generated summary of forum post content
 */
export interface ForumPostAISummary {
  /** 1-2 line short summary */
  shortSummary: string;
  /** Key bullet points */
  bulletSummary: string[];
  /** When the summary was generated */
  generatedAt: string;
  /** AI model used */
  model: string;
}

/**
 * AI Tags Metadata
 * Suggested tags and categories from AI analysis
 */
export interface ForumPostAITags {
  /** Suggested tags from AI */
  suggestedTags: string[];
  /** Suggested category (optional) */
  suggestedCategory?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Domain-specific tags (cosmetics) */
  cosmeticsTags?: {
    skinType?: string;
    concerns?: string[];
    productTypes?: string[];
  };
  /** Domain-specific tags (yaksa) */
  yaksaTags?: {
    documentType?: 'notice' | 'admin' | 'education' | 'resource' | 'inquiry';
    isOrganizational?: boolean;
    topics?: string[];
  };
}

/**
 * AI Metadata Section
 * Contains all AI-generated content for a forum post
 */
export interface ForumPostAIMeta {
  /** AI-generated summary */
  summary?: ForumPostAISummary;
  /** AI-suggested tags */
  tags?: ForumPostAITags;
  /** Whether tags have been approved by user/admin */
  tagsApproved?: boolean;
  /** Who approved the tags */
  tagsApprovedBy?: string;
  /** When tags were approved */
  tagsApprovedAt?: string;
  /** Processing status */
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  /** Error message if failed */
  error?: string;
  /** Last processing attempt */
  lastProcessedAt?: string;
}

// =============================================================================
// Extension Metadata Types (for forum-neture, forum-yaksa)
// =============================================================================

/**
 * Neture Forum Extension Metadata
 * Used for cosmetics-related forum features
 */
export interface NetureForumMeta {
  skinType?: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal';
  concerns?: string[];
  routine?: string[];
  productIds?: string[];
  ingredientPreferences?: string[];
  ageGroup?: string;
}

/**
 * Yaksa Forum Extension Metadata
 * Used for pharmacist community features
 */
export interface YaksaForumMeta {
  communityId?: string;
  isAnnouncement?: boolean;
  pinned?: boolean;
  pharmacistVerified?: boolean;
  drugInteractionWarning?: boolean;
  professionalOnly?: boolean;
  /** Document type for yaksa content classification */
  documentType?: 'notice' | 'admin' | 'education' | 'resource' | 'inquiry';
}

// =============================================================================
// Forum Post Metadata Interface (Core)
// =============================================================================

/**
 * SEO Metadata Section
 */
export interface ForumPostSeoMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

/**
 * Moderation Metadata Section
 */
export interface ForumPostModerationMeta {
  flaggedReason?: string;
  flaggedAt?: string;
  flaggedBy?: string;
  moderationNote?: string;
  moderatedAt?: string;
  moderatedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
}

/**
 * Analytics Metadata Section
 */
export interface ForumPostAnalyticsMeta {
  lastViewedAt?: string;
  peakViewCount?: number;
  uniqueViewers?: number;
  averageReadTime?: number;
  shareCount?: number;
  bookmarkCount?: number;
}

/**
 * Display Metadata Section
 */
export interface ForumPostDisplayMeta {
  featuredImage?: string;
  thumbnailUrl?: string;
  backgroundColor?: string;
  customCss?: string;
  template?: string;
}

/**
 * Extensions Metadata Section
 * Contains app-specific metadata (Neture, Yaksa, etc.)
 */
export interface ForumPostExtensionsMeta {
  neture?: NetureForumMeta;
  yaksa?: YaksaForumMeta;
  // Additional custom extensions can be added here
}

/**
 * Forum Post Metadata Interface
 * Structured metadata for forum posts with typed sections
 */
export interface ForumPostMetadata {
  // Structured sections
  seo?: ForumPostSeoMeta;
  moderation?: ForumPostModerationMeta;
  analytics?: ForumPostAnalyticsMeta;
  display?: ForumPostDisplayMeta;
  extensions?: ForumPostExtensionsMeta;
  /** Phase 16: AI-generated content (summary, tags) */
  ai?: ForumPostAIMeta;

  // Legacy flat fields (for backward compatibility)
  /** @deprecated Use seo.title instead */
  seoTitle?: string;
  /** @deprecated Use seo.description instead */
  seoDescription?: string;
  /** @deprecated Use seo.keywords instead */
  seoKeywords?: string[];
  /** @deprecated Use display.featuredImage instead */
  featuredImage?: string;
  /** @deprecated Use display.thumbnailUrl instead */
  thumbnailUrl?: string;
  /** @deprecated Use moderation.moderationNote instead */
  moderationNote?: string;
  /** @deprecated Use moderation.moderatedAt instead */
  moderatedAt?: string;
  /** @deprecated Use moderation.moderatedBy instead */
  moderatedBy?: string;
  /** @deprecated Use analytics.lastViewedAt instead */
  lastViewedAt?: string;
  /** @deprecated Use analytics.peakViewCount instead */
  peakViewCount?: number;

  // Legacy extension fields (direct access - kept for backward compatibility)
  /** @deprecated Use extensions.neture instead */
  neture?: NetureForumMeta;
  /** @deprecated Use extensions.yaksa instead */
  yaksa?: YaksaForumMeta;

  // Custom fields (extensible)
  custom?: Record<string, unknown>;
}

/**
 * Normalize metadata to ensure consistent structure
 * Handles legacy flat structure and converts to new nested structure
 */
export function normalizeMetadata(input: Record<string, unknown> | ForumPostMetadata | null | undefined): ForumPostMetadata {
  if (!input) {
    return {};
  }

  const metadata = input as ForumPostMetadata;
  const result: ForumPostMetadata = {};

  // Normalize SEO section
  result.seo = {
    ...(metadata.seo || {}),
    title: metadata.seo?.title || metadata.seoTitle,
    description: metadata.seo?.description || metadata.seoDescription,
    keywords: metadata.seo?.keywords || metadata.seoKeywords,
  };

  // Normalize moderation section
  result.moderation = {
    ...(metadata.moderation || {}),
    moderationNote: metadata.moderation?.moderationNote || metadata.moderationNote,
    moderatedAt: metadata.moderation?.moderatedAt || metadata.moderatedAt,
    moderatedBy: metadata.moderation?.moderatedBy || metadata.moderatedBy,
  };

  // Normalize analytics section
  result.analytics = {
    ...(metadata.analytics || {}),
    lastViewedAt: metadata.analytics?.lastViewedAt || metadata.lastViewedAt,
    peakViewCount: metadata.analytics?.peakViewCount || metadata.peakViewCount,
  };

  // Normalize display section
  result.display = {
    ...(metadata.display || {}),
    featuredImage: metadata.display?.featuredImage || metadata.featuredImage,
    thumbnailUrl: metadata.display?.thumbnailUrl || metadata.thumbnailUrl,
  };

  // Normalize extensions section
  result.extensions = {
    ...(metadata.extensions || {}),
    neture: metadata.extensions?.neture || metadata.neture,
    yaksa: metadata.extensions?.yaksa || metadata.yaksa,
  };

  // Preserve custom fields
  if (metadata.custom) {
    result.custom = metadata.custom;
  }

  // Clean up empty sections
  if (Object.values(result.seo || {}).every(v => v === undefined)) {
    delete result.seo;
  }
  if (Object.values(result.moderation || {}).every(v => v === undefined)) {
    delete result.moderation;
  }
  if (Object.values(result.analytics || {}).every(v => v === undefined)) {
    delete result.analytics;
  }
  if (Object.values(result.display || {}).every(v => v === undefined)) {
    delete result.display;
  }
  if (!result.extensions?.neture && !result.extensions?.yaksa) {
    delete result.extensions;
  }

  return result;
}

/**
 * Check if metadata has any extension data
 */
export function hasExtensionMeta(metadata: ForumPostMetadata | null | undefined): boolean {
  if (!metadata) return false;
  return !!(metadata.extensions?.neture || metadata.extensions?.yaksa || metadata.neture || metadata.yaksa);
}

/**
 * Get extension metadata safely
 */
export function getExtensionMeta<T extends keyof ForumPostExtensionsMeta>(
  metadata: ForumPostMetadata | null | undefined,
  extension: T
): ForumPostExtensionsMeta[T] | undefined {
  if (!metadata) return undefined;
  return metadata.extensions?.[extension] || (metadata as any)[extension];
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
