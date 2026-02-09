/**
 * APP-CONTENT Shared Types & Constants
 *
 * 모든 서비스의 콘텐츠 UI가 공유하는 Single Source of Truth.
 * forum.ts와 동일한 패턴 — 순수 타입 + JSON 직렬화 후 형태만 정의.
 *
 * Phase 2: APP-CONTENT 공통화
 */

// =============================================================================
// Type Unions (frontend-safe, no TypeORM dependency)
// =============================================================================

/** CMS 콘텐츠 타입 — cms-core CmsContent.type 과 1:1 대응 */
export type ContentType = 'notice' | 'hero' | 'promo' | 'news' | 'featured' | 'event';

/** 정렬 기준 */
export type ContentSortType = 'latest' | 'featured' | 'views';

/** 콘텐츠 출처(작성자) 유형 */
export type ContentSourceType = 'operator' | 'supplier' | 'pharmacist';

/** CMS 콘텐츠 상태 */
export type ContentStatus = 'draft' | 'published' | 'archived';

// =============================================================================
// Metadata
// =============================================================================

/** CMS metadata JSONB 구조 (출처 배지, 카테고리 등) */
export interface ContentMetadata {
  creatorType?: ContentSourceType;
  backgroundColor?: string;
  category?: string;
  supplierName?: string;
  pharmacyName?: string;
  [key: string]: any;
}

// =============================================================================
// API Response DTOs
// =============================================================================

/** 콘텐츠 목록/상세 공통 응답 아이템 */
export interface ContentItemResponse {
  id: string;
  type: ContentType;
  title: string;
  summary?: string | null;
  excerpt?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
  isPinned: boolean;
  isOperatorPicked?: boolean;
  metadata?: ContentMetadata | null;
  publishedAt?: string | null;
  createdAt: string;
  /** Phase 3A: 조회수 */
  viewCount?: number;
  /** Phase 3A: 추천수 */
  recommendCount?: number;
  /** Phase 3A: 내가 추천했는지 여부 */
  isRecommendedByMe?: boolean;
}

/** 페이지네이션 정보 */
export interface ContentPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** 콘텐츠 목록 응답 */
export interface ContentListResponse {
  success: boolean;
  data: ContentItemResponse[];
  pagination: ContentPaginationInfo;
}

/** 콘텐츠 상세 응답 */
export interface ContentDetailResponse {
  success: boolean;
  data: ContentItemResponse;
}

// =============================================================================
// UI Constants (서비스 비의존 — 모든 프론트엔드에서 동일하게 사용)
// =============================================================================

/** 콘텐츠 타입별 한글 라벨 */
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  notice: '공지사항',
  hero: '배너',
  promo: '혜택/쿠폰',
  news: '뉴스',
  featured: '추천',
  event: '이벤트',
};

/** 정렬 기준별 한글 라벨 */
export const CONTENT_SORT_LABELS: Record<ContentSortType, string> = {
  latest: '최신순',
  featured: '추천순',
  views: '조회순',
};

/** 출처 유형별 한글 라벨 */
export const CONTENT_SOURCE_LABELS: Record<ContentSourceType, string> = {
  operator: '운영자',
  supplier: '공급자',
  pharmacist: '사용자',
};

/** 출처 유형별 배지 색상 (APP-CONTENT Standard Spec) */
export const CONTENT_SOURCE_COLORS: Record<ContentSourceType, string> = {
  operator: '#1a5276',
  supplier: '#6c3483',
  pharmacist: '#1e8449',
};
