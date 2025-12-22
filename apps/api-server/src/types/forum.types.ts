/**
 * Forum Types for API Server
 * Local type definitions to avoid circular dependency with @o4o/forum-core
 */

// =============================================================================
// AI Generated Metadata Types (Phase 16)
// =============================================================================

/**
 * AI Summary Metadata
 */
export interface ForumPostAISummary {
  shortSummary: string;
  bulletSummary: string[];
  generatedAt: string;
  model: string;
}

/**
 * AI Tags Metadata
 */
export interface ForumPostAITags {
  suggestedTags: string[];
  suggestedCategory?: string;
  confidence: number;
  cosmeticsTags?: {
    skinType?: string;
    concerns?: string[];
    productTypes?: string[];
  };
  yaksaTags?: {
    documentType?: 'notice' | 'admin' | 'education' | 'resource' | 'inquiry';
    isOrganizational?: boolean;
    topics?: string[];
  };
}

/**
 * AI Metadata Section
 */
export interface ForumPostAIMeta {
  summary?: ForumPostAISummary;
  tags?: ForumPostAITags;
  tagsApproved?: boolean;
  tagsApprovedBy?: string;
  tagsApprovedAt?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  lastProcessedAt?: string;
}

// =============================================================================
// Extension Metadata Types
// =============================================================================

/**
 * Neture Forum Extension Metadata (cosmetics)
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
 * Yaksa Forum Extension Metadata (pharmacist)
 */
export interface YaksaForumMeta {
  communityId?: string;
  isAnnouncement?: boolean;
  pinned?: boolean;
  pharmacistVerified?: boolean;
  drugInteractionWarning?: boolean;
  professionalOnly?: boolean;
  documentType?: 'notice' | 'admin' | 'education' | 'resource' | 'inquiry';
}

// =============================================================================
// Forum Post Metadata Interface
// =============================================================================

export interface ForumPostSeoMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

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

export interface ForumPostAnalyticsMeta {
  lastViewedAt?: string;
  peakViewCount?: number;
  uniqueViewers?: number;
  averageReadTime?: number;
  shareCount?: number;
  bookmarkCount?: number;
}

export interface ForumPostDisplayMeta {
  featuredImage?: string;
  thumbnailUrl?: string;
  backgroundColor?: string;
  customCss?: string;
  template?: string;
}

export interface ForumPostExtensionsMeta {
  neture?: NetureForumMeta;
  yaksa?: YaksaForumMeta;
}

/**
 * Forum Post Metadata Interface
 */
export interface ForumPostMetadata {
  seo?: ForumPostSeoMeta;
  moderation?: ForumPostModerationMeta;
  analytics?: ForumPostAnalyticsMeta;
  display?: ForumPostDisplayMeta;
  extensions?: ForumPostExtensionsMeta;
  ai?: ForumPostAIMeta;

  // Legacy fields (backward compatibility)
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  featuredImage?: string;
  thumbnailUrl?: string;
  moderationNote?: string;
  moderatedAt?: string;
  moderatedBy?: string;
  lastViewedAt?: string;
  peakViewCount?: number;
  neture?: NetureForumMeta;
  yaksa?: YaksaForumMeta;
  custom?: Record<string, unknown>;
}
