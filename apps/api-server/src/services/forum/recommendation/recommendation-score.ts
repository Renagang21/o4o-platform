/**
 * Forum Recommendation — Scoring & Reason Generation
 *
 * WO-O4O-FORUM-RECOMMENDATION-SERVICE-SPLIT-V1
 * Extracted from ForumRecommendationService.ts
 */

import { ForumPost } from '@o4o/forum-core/entities';
import type {
  UserContext,
  RecommendationItem,
  ReasonCode,
  ScoreBreakdown,
  RecommendationWeights,
  RecencyConfig,
  CosmeticsAITags,
  YaksaAITags,
  ForumPostMetadata,
  NetureForumMeta,
  YaksaForumMeta,
} from './recommendation.types.js';

// =============================================================================
// Score Calculation Helpers
// =============================================================================

/**
 * Calculate analytics-based score
 */
export function calculateAnalyticsScore(post: ForumPost): number {
  const viewScore = Math.log10(Math.max(1, post.viewCount)) / 4;
  const likeScore = Math.log10(Math.max(1, post.likeCount * 10 + 1)) / 3;
  const commentScore = Math.log10(Math.max(1, post.commentCount * 5 + 1)) / 3;

  const analytics = post.metadata?.analytics;
  let additionalScore = 0;
  if (analytics) {
    if (analytics.bookmarkCount) {
      additionalScore += Math.min(0.2, analytics.bookmarkCount / 50);
    }
    if (analytics.shareCount) {
      additionalScore += Math.min(0.1, analytics.shareCount / 20);
    }
  }

  return Math.min(1, (viewScore + likeScore + commentScore + additionalScore) / 2);
}

/**
 * Calculate AI tag similarity score
 */
export function calculateAITagScore(post: ForumPost, userContext: UserContext): number {
  const aiTags = post.metadata?.ai?.tags?.suggestedTags || [];
  const postTags = [...(post.tags || []), ...aiTags];

  if (!postTags.length || !userContext.preferredTags?.length) {
    return 0;
  }

  const matchCount = userContext.preferredTags.filter(tag =>
    postTags.some(pt => pt.toLowerCase().includes(tag.toLowerCase()) ||
      tag.toLowerCase().includes(pt.toLowerCase()))
  ).length;

  return Math.min(1, matchCount / Math.min(3, userContext.preferredTags.length));
}

/**
 * Calculate recency score with decay
 */
export function calculateRecencyScore(post: ForumPost, recencyConfig: RecencyConfig): number {
  const now = new Date();
  const postDate = post.publishedAt || post.createdAt;
  const daysDiff = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff <= recencyConfig.fullScoreDays) {
    return 1;
  }

  const decayFactor = Math.pow(0.5, (daysDiff - recencyConfig.fullScoreDays) / recencyConfig.halfLifeDays);
  return Math.max(recencyConfig.minScore, decayFactor);
}

/**
 * Calculate domain-specific score
 */
export function calculateDomainScore(post: ForumPost, userContext: UserContext): number {
  const metadata = post.metadata as ForumPostMetadata | undefined;
  if (!metadata) return 0;

  const cosmeticsData = (metadata.extensions?.['neture'] || (metadata as any).neture) as NetureForumMeta | undefined;
  if (cosmeticsData && userContext.skinType) {
    if (cosmeticsData.skinType === userContext.skinType) return 0.8;
    if (cosmeticsData.concerns?.some(c => userContext.concerns?.includes(c))) return 0.6;
  }

  const yaksaData = (metadata.extensions?.['yaksa'] || (metadata as any).yaksa) as YaksaForumMeta | undefined;
  // WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-B:
  //   userContext.isPharmacist → isPharmacy (내부 필드명 표준화).
  //   yaksaData.pharmacistVerified 는 KPA/Neture 메타데이터라 유지.
  if (yaksaData && userContext.isPharmacy) {
    if (yaksaData.pharmacistVerified) return 0.7;
    if (yaksaData.professionalOnly) return 0.5;
  }

  return 0;
}

/**
 * Calculate organization match score
 */
export function calculateOrganizationScore(post: ForumPost, userContext: UserContext): number {
  if (!userContext.organizationId) return 0;
  if (post.organizationId === userContext.organizationId) return 1;
  return 0;
}

/**
 * Calculate trending score
 */
export function calculateTrendingScore(post: ForumPost): number {
  const now = new Date();
  const postDate = post.createdAt;
  const hoursDiff = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

  const engagement = post.viewCount + post.likeCount * 3 + post.commentCount * 5;
  const engagementRate = engagement / Math.max(1, hoursDiff);

  return Math.min(1, engagementRate / 10);
}

/**
 * Calculate tag similarity between two tag sets (Jaccard)
 */
export function calculateTagSimilarity(tags1: string[], tags2: string[]): number {
  if (!tags1.length || !tags2.length) return 0;

  const set1 = new Set(tags1.map(t => t.toLowerCase()));
  const set2 = new Set(tags2.map(t => t.toLowerCase()));

  const intersection = [...set1].filter(t => set2.has(t)).length;
  const union = new Set([...set1, ...set2]).size;

  return intersection / union;
}

/**
 * Extract all tags from a post (manual + AI)
 */
export function extractAllTags(post: ForumPost): string[] {
  const manualTags = post.tags || [];
  const aiTags = post.metadata?.ai?.tags?.suggestedTags || [];
  return [...new Set([...manualTags, ...aiTags])];
}

// =============================================================================
// Composite Scoring
// =============================================================================

/**
 * Score a post for general recommendations
 */
export function scorePost(
  post: ForumPost,
  userContext: UserContext,
  weights: RecommendationWeights,
  recencyConfig: RecencyConfig,
  includeBreakdown: boolean
): RecommendationItem {
  const analyticsScore = calculateAnalyticsScore(post);
  const aiTagScore = calculateAITagScore(post, userContext);
  const recencyScore = calculateRecencyScore(post, recencyConfig);
  const domainScore = calculateDomainScore(post, userContext);
  const organizationScore = calculateOrganizationScore(post, userContext);

  const finalScore =
    analyticsScore * weights.analytics +
    aiTagScore * weights.aiTagSimilarity +
    recencyScore * weights.recency +
    domainScore * weights.domainMatch +
    organizationScore * weights.organizationMatch;

  const { reason, reasonCode } = generateReason(
    post,
    userContext,
    { analyticsScore, aiTagScore, recencyScore, domainScore, organizationScore }
  );

  const result: RecommendationItem = {
    postId: post.id,
    score: Math.min(1, Math.max(0, finalScore)),
    reason,
    reasonCode,
  };

  if (includeBreakdown) {
    result.scoreBreakdown = {
      analyticsScore,
      aiTagScore,
      recencyScore,
      domainScore,
      organizationScore,
    };
  }

  return result;
}

/**
 * Score a post for cosmetics recommendations
 */
export function scoreCosmeticsPost(
  post: ForumPost,
  userContext: UserContext,
  recencyConfig: RecencyConfig,
  includeBreakdown: boolean
): RecommendationItem {
  const metadata = post.metadata as ForumPostMetadata | undefined;
  const cosmeticsData = (metadata?.extensions?.['neture'] || (metadata as any)?.neture) as NetureForumMeta | undefined;
  const aiTags = (metadata?.ai?.tags?.domainTags?.['cosmetics'] || {}) as CosmeticsAITags;

  let domainScore = 0;
  let reasonCode: ReasonCode = 'personalized';
  let reason = '회원님을 위한 추천 글입니다.';

  if (userContext.skinType) {
    const postSkinType = cosmeticsData?.skinType || aiTags?.skinType;
    if (postSkinType === userContext.skinType) {
      domainScore += 0.4;
      reason = `회원님의 피부타입(${translateSkinType(userContext.skinType)})과 유사한 글입니다.`;
      reasonCode = 'similar_skin_type';
    }
  }

  if (userContext.concerns?.length) {
    const postConcerns = cosmeticsData?.concerns || aiTags?.concerns || [];
    const matchingConcerns = userContext.concerns.filter(c => postConcerns.includes(c));
    if (matchingConcerns.length > 0) {
      domainScore += 0.3 * (matchingConcerns.length / userContext.concerns.length);
      if (reasonCode !== 'similar_skin_type') {
        reason = `회원님의 고민(${matchingConcerns.join(', ')})과 관련된 글입니다.`;
        reasonCode = 'similar_concerns';
      } else {
        reason = `회원님의 피부타입(${translateSkinType(userContext.skinType!)})과 고민(${matchingConcerns.join(', ')})에 유사한 글입니다.`;
      }
    }
  }

  const aiTagScore = calculateAITagScore(post, userContext);
  domainScore += aiTagScore * 0.2;

  const analyticsScore = calculateAnalyticsScore(post);
  const recencyScore = calculateRecencyScore(post, recencyConfig);

  const finalScore =
    domainScore * 0.5 +
    analyticsScore * 0.25 +
    recencyScore * 0.15 +
    aiTagScore * 0.10;

  const result: RecommendationItem = {
    postId: post.id,
    score: Math.min(1, Math.max(0, finalScore)),
    reason,
    reasonCode,
  };

  if (includeBreakdown) {
    result.scoreBreakdown = {
      analyticsScore,
      aiTagScore,
      recencyScore,
      domainScore,
      organizationScore: 0,
    };
  }

  return result;
}

/**
 * Score a post for yaksa recommendations
 */
export function scoreYaksaPost(
  post: ForumPost,
  userContext: UserContext,
  recencyConfig: RecencyConfig,
  includeBreakdown: boolean
): RecommendationItem {
  const metadata = post.metadata as ForumPostMetadata | undefined;
  const yaksaData = (metadata?.extensions?.['yaksa'] || (metadata as any)?.yaksa) as YaksaForumMeta | undefined;
  const aiTags = (metadata?.ai?.tags?.domainTags?.['yaksa'] || {}) as YaksaAITags;

  let domainScore = 0;
  let reasonCode: ReasonCode = 'personalized';
  let reason = '회원님을 위한 추천 글입니다.';

  if (userContext.organizationId && post.organizationId === userContext.organizationId) {
    domainScore += 0.5;
    reason = '같은 분회에서 작성된 글입니다.';
    reasonCode = 'same_organization';
  }

  const documentType = yaksaData?.documentType || aiTags?.documentType;
  if (documentType) {
    if (userContext.role === 'admin' || userContext.role === 'manager') {
      if (['notice', 'admin'].includes(documentType)) {
        domainScore += 0.3;
        if (reasonCode !== 'same_organization') {
          reason = `관리자용 ${translateDocumentType(documentType)} 문서입니다.`;
          reasonCode = 'recommended_for_role';
        }
      }
    } else if (userContext.isPharmacy) {
      // WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-B: isPharmacist → isPharmacy
      if (['education', 'resource'].includes(documentType)) {
        domainScore += 0.3;
        if (reasonCode !== 'same_organization') {
          reason = `약사님을 위한 ${translateDocumentType(documentType)} 자료입니다.`;
          reasonCode = 'similar_document_type';
        }
      }
    }
  }

  if (yaksaData?.isAnnouncement || post.type === 'announcement') {
    domainScore += 0.2;
  }

  if (aiTags?.isOrganizational) {
    domainScore += 0.1;
  }

  const analyticsScore = calculateAnalyticsScore(post);
  const recencyScore = calculateRecencyScore(post, recencyConfig);
  const aiTagScore = calculateAITagScore(post, userContext);

  const finalScore =
    domainScore * 0.5 +
    analyticsScore * 0.20 +
    recencyScore * 0.20 +
    aiTagScore * 0.10;

  const result: RecommendationItem = {
    postId: post.id,
    score: Math.min(1, Math.max(0, finalScore)),
    reason,
    reasonCode,
  };

  if (includeBreakdown) {
    result.scoreBreakdown = {
      analyticsScore,
      aiTagScore,
      recencyScore,
      domainScore,
      organizationScore: userContext.organizationId === post.organizationId ? 1 : 0,
    };
  }

  return result;
}

// =============================================================================
// Reason Generation
// =============================================================================

/**
 * Generate human-readable reason for recommendation
 */
export function generateReason(
  post: ForumPost,
  userContext: UserContext,
  scores: ScoreBreakdown
): { reason: string; reasonCode: ReasonCode } {
  const factors = [
    { name: 'organization', score: scores.organizationScore, threshold: 0.5 },
    { name: 'domain', score: scores.domainScore, threshold: 0.4 },
    { name: 'aiTag', score: scores.aiTagScore, threshold: 0.3 },
    { name: 'analytics', score: scores.analyticsScore, threshold: 0.5 },
    { name: 'recency', score: scores.recencyScore, threshold: 0.8 },
  ];

  const dominant = factors
    .filter(f => f.score >= f.threshold)
    .sort((a, b) => b.score - a.score)[0];

  switch (dominant?.name) {
    case 'organization':
      return { reason: '같은 조직에서 자주 조회된 글입니다.', reasonCode: 'same_organization' };
    case 'domain':
      if (userContext.skinType) {
        return { reason: '회원님의 피부타입과 관심사에 맞는 글입니다.', reasonCode: 'similar_skin_type' };
      }
      // WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-B: isPharmacist → isPharmacy
      if (userContext.isPharmacy) {
        return { reason: '약사님을 위한 전문 콘텐츠입니다.', reasonCode: 'recommended_for_role' };
      }
      return { reason: '회원님의 관심 분야와 관련된 글입니다.', reasonCode: 'personalized' };
    case 'aiTag':
      return { reason: '회원님이 관심있는 주제와 유사한 글입니다.', reasonCode: 'similar_tags' };
    case 'analytics':
      return { reason: '많은 사용자들에게 인기있는 글입니다.', reasonCode: 'trending' };
    case 'recency':
      return { reason: '최근 작성된 인기 글입니다.', reasonCode: 'recent_popular' };
    default:
      return { reason: '회원님을 위한 추천 글입니다.', reasonCode: 'personalized' };
  }
}

// =============================================================================
// Translation Helpers
// =============================================================================

export function translateSkinType(type: string): string {
  const translations: Record<string, string> = {
    dry: '건성', oily: '지성', combination: '복합성',
    sensitive: '민감성', normal: '중성',
  };
  return translations[type] || type;
}

export function translateDocumentType(type: string): string {
  const translations: Record<string, string> = {
    notice: '공지', admin: '행정', education: '교육',
    resource: '자료', inquiry: '민원',
  };
  return translations[type] || type;
}
