/**
 * Forum Types and DTOs
 */
import type { Block } from '@o4o/types';
import { PostStatus, PostType } from '../entities/ForumPost.js';
/**
 * Convert plain text to Block[] format
 * Used for backwards compatibility with string content
 */
export declare function textToBlocks(text: string): Block[];
/**
 * Convert Block[] to plain text
 * Used for excerpt generation and search indexing
 */
export declare function blocksToText(blocks: Block[]): string;
/**
 * Normalize content to Block[] format
 * Accepts either string or Block[] and always returns Block[]
 */
export declare function normalizeContent(content: string | Block[] | undefined | null): Block[];
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
}
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
}
/**
 * Forum Post Metadata Interface
 * Structured metadata for forum posts with typed sections
 */
export interface ForumPostMetadata {
    seo?: ForumPostSeoMeta;
    moderation?: ForumPostModerationMeta;
    analytics?: ForumPostAnalyticsMeta;
    display?: ForumPostDisplayMeta;
    extensions?: ForumPostExtensionsMeta;
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
    /** @deprecated Use extensions.neture instead */
    neture?: NetureForumMeta;
    /** @deprecated Use extensions.yaksa instead */
    yaksa?: YaksaForumMeta;
    custom?: Record<string, unknown>;
}
/**
 * Normalize metadata to ensure consistent structure
 * Handles legacy flat structure and converts to new nested structure
 */
export declare function normalizeMetadata(input: Record<string, unknown> | ForumPostMetadata | null | undefined): ForumPostMetadata;
/**
 * Check if metadata has any extension data
 */
export declare function hasExtensionMeta(metadata: ForumPostMetadata | null | undefined): boolean;
/**
 * Get extension metadata safely
 */
export declare function getExtensionMeta<T extends keyof ForumPostExtensionsMeta>(metadata: ForumPostMetadata | null | undefined, extension: T): ForumPostExtensionsMeta[T] | undefined;
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
//# sourceMappingURL=index.d.ts.map