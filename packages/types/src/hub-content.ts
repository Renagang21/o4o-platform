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
export type HubProducer = 'operator' | 'supplier' | 'community' | 'store';

/** HUB 가시성 범위 (IR-O4O-PLATFORM-CONTENT-POLICY-FINAL-V1 §4) */
export type HubVisibility = 'global' | 'service' | 'store';

/**
 * HUB 콘텐츠 원본 도메인.
 * WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1:
 *   'kpa-store-content' 제거 — Store → Community 공유 흐름 폐기.
 * WO-O4O-OPERATOR-BLOG-PUBLISHING-BACKEND-FOUNDATION-V1 (2026-05-23):
 *   'blog' 추가 — Phase 1 Backend Foundation. 현재 단계는 골격만 등록되어 있으며
 *   queryBlog 는 placeholder 빈 응답 반환. 운영자 → HUB → 매장 흐름의 실제 노출은
 *   store_blog_posts 의 producer/authorRole schema 확장 후 Phase 2 에서 활성화.
 * WO-O4O-KPA-POP-OPERATOR-PUBLISHING-V1 Phase 1 (2026-05-24):
 *   'pop' 추가 — Phase 1 Backend Foundation. queryPop 는 placeholder. 운영자 → HUB →
 *   매장 흐름의 실 구현은 Phase 2 후속. Blog 의 store_blog_posts 와 동일하게 별도
 *   store_pops entity 보유 (IR-O4O-KPA-POP-STRUCTURE-AND-MENU-AUDIT-V1 Option C).
 * WO-O4O-KPA-OPERATOR-HUB-QR-TEMPLATE-FOUNDATION-V1 (2026-05-24):
 *   'qr' 추가 — Phase 1 Backend Foundation. queryQr 는 placeholder. 운영자 발행 QR 은
 *   slug 미발급 "템플릿" 이며 (operator_qr_templates entity 신설) 매장 가져가기 시 기존
 *   store_qr_codes 에 매장 사본 INSERT (IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1
 *   Option B 채택). 실 구현은 Phase 2 후속.
 */
export type HubSourceDomain = 'cms' | 'signage-media' | 'signage-playlist' | 'blog' | 'pop' | 'qr';

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
  authorId?: string | null;
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
  store: '매장',
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
  blog: '블로그',
  pop: 'POP',
  qr: 'QR-code',
};
