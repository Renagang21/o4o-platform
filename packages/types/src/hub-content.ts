/**
 * APP-HUB-CONTENT Shared Types & Constants
 *
 * WO-O4O-HUB-CONTENT-QUERY-SERVICE-PHASE1-V2
 *
 * Hub 통합 콘텐츠 조회 API의 응답 형태를 정의.
 * IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1 3축 모델 기준.
 *
 * 순수 타입 + JSON 직렬화 후 형태만 정의. TypeORM/backend 의존 없음.
 */

// =============================================================================
// Type Unions (frontend-safe, no backend dependency)
// =============================================================================

/** HUB 통합 제작 주체 (IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1 §3) */
export type HubProducer = 'operator' | 'supplier' | 'community';

/** HUB 가시성 범위 (IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1 §4) */
export type HubVisibility = 'global' | 'service' | 'store';

/** HUB 콘텐츠 원본 도메인 */
export type HubSourceDomain = 'cms' | 'signage-media' | 'signage-playlist';

// =============================================================================
// API Response DTOs
// =============================================================================

/** HUB 통합 콘텐츠 아이템 — 도메인 공통 + 도메인별 선택 필드 */
export interface HubContentItemResponse {
  id: string;
  sourceDomain: HubSourceDomain;
  producer: HubProducer;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;

  // CMS-specific (sourceDomain = 'cms')
  cmsType?: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  authorRole?: string;
  visibilityScope?: string;
  isPinned?: boolean;

  // Signage-specific (sourceDomain = 'signage-media' | 'signage-playlist')
  mediaType?: string;
  sourceUrl?: string | null;
  duration?: number | null;
  source?: string;
  itemCount?: number;
  totalDuration?: number;
  creatorName?: string | null;
}

/** HUB 콘텐츠 목록 응답 */
export interface HubContentListResponse {
  success: boolean;
  data: HubContentItemResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// UI Constants
// =============================================================================

/** 제작 주체별 한글 라벨 */
export const HUB_PRODUCER_LABELS: Record<HubProducer, string> = {
  operator: '운영자',
  supplier: '공급자',
  community: '커뮤니티',
};

/** 가시성 범위별 한글 라벨 */
export const HUB_VISIBILITY_LABELS: Record<HubVisibility, string> = {
  global: '플랫폼 전체',
  service: '서비스 전용',
  store: '매장 전용',
};

/** 원본 도메인별 한글 라벨 */
export const HUB_SOURCE_DOMAIN_LABELS: Record<HubSourceDomain, string> = {
  cms: 'CMS 콘텐츠',
  'signage-media': '사이니지 미디어',
  'signage-playlist': '사이니지 플레이리스트',
};
