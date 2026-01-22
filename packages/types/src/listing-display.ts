/**
 * Listing Display Types
 *
 * Phase 1: 디바이스/코너별 제품 노출 제어를 위한 타입 정의
 *
 * ## 목적
 * - SellerListing.channelSpecificData의 공식 스키마 정의
 * - 디바이스/코너별 제품 진열 구조 표준화
 * - API 필터 파라미터 타입 안전성 확보
 *
 * ## 사용 위치
 * - SellerListing.channelSpecificData (dropshipping-core)
 * - Listings API 필터 파라미터
 * - CmsView.query 필터 규칙
 *
 * @since Phase 1 (알파)
 */

/**
 * 노출 가시성 상태
 */
export type ListingVisibility = 'visible' | 'hidden' | 'featured';

/**
 * 디바이스 유형 (확장 가능)
 */
export type DeviceType = 'web' | 'mobile' | 'kiosk' | 'tablet' | 'signage';

/**
 * 노출 제어 데이터 (channelSpecificData 내 display 필드)
 *
 * @example
 * ```typescript
 * const displayConfig: ListingDisplayConfig = {
 *   deviceId: 'kiosk_1',
 *   corner: 'premium_zone',
 *   sortOrder: 1,
 *   visibility: 'featured',
 *   deviceType: 'kiosk'
 * };
 * ```
 */
export interface ListingDisplayConfig {
  /**
   * 디바이스 식별자
   * - 매장 내 개별 디바이스 구분
   * - 예: 'kiosk_1', 'tablet_corner_a', 'signage_entrance'
   */
  deviceId?: string;

  /**
   * 코너/섹션 이름
   * - 매장 내 논리적 영역 구분
   * - 예: 'premium_zone', 'new_arrivals', 'bestseller', 'promotion'
   */
  corner?: string;

  /**
   * 노출 순서
   * - 낮을수록 먼저 표시
   * - 기본값: 0
   */
  sortOrder?: number;

  /**
   * 가시성 상태
   * - visible: 일반 노출
   * - hidden: 숨김
   * - featured: 강조 노출
   */
  visibility?: ListingVisibility;

  /**
   * 디바이스 유형
   * - 화면 레이아웃 결정에 사용
   */
  deviceType?: DeviceType;
}

/**
 * SellerListing.channelSpecificData의 확장 스키마
 *
 * 기존 채널별 데이터에 display 설정을 추가
 *
 * @example
 * ```typescript
 * const channelData: ChannelSpecificDataWithDisplay = {
 *   // 기존 채널별 데이터
 *   promotionId: 'promo-123',
 *
 *   // Phase 1 노출 제어
 *   display: {
 *     deviceId: 'kiosk_1',
 *     corner: 'premium_zone',
 *     sortOrder: 1,
 *     visibility: 'featured'
 *   }
 * };
 * ```
 */
export interface ChannelSpecificDataWithDisplay {
  /**
   * Phase 1 노출 제어 설정
   */
  display?: ListingDisplayConfig;

  /**
   * 기존/추가 채널별 데이터 (확장 허용)
   */
  [key: string]: unknown;
}

/**
 * Listings API 필터 파라미터
 *
 * @example
 * ```typescript
 * // GET /api/v1/dropshipping/core/listings?deviceId=kiosk_1&corner=premium_zone
 * const filters: ListingDisplayFilters = {
 *   deviceId: 'kiosk_1',
 *   corner: 'premium_zone',
 *   visibility: 'featured',
 *   sortBy: 'sortOrder',
 *   sortOrder: 'asc'
 * };
 * ```
 */
export interface ListingDisplayFilters {
  /**
   * 디바이스 ID로 필터
   */
  deviceId?: string;

  /**
   * 코너로 필터
   */
  corner?: string;

  /**
   * 가시성으로 필터
   */
  visibility?: ListingVisibility;

  /**
   * 디바이스 유형으로 필터
   */
  deviceType?: DeviceType;

  /**
   * 정렬 기준 필드
   */
  sortBy?: 'sortOrder' | 'createdAt' | 'updatedAt' | 'sellingPrice';

  /**
   * 정렬 방향
   */
  sortDirection?: 'asc' | 'desc';
}

/**
 * CmsView용 쿼리 설정
 *
 * CmsView.query에서 사용하는 디스플레이 필터 규칙
 *
 * @example
 * ```typescript
 * const viewQuery: CmsViewDisplayQuery = {
 *   display: {
 *     deviceId: 'kiosk_1',
 *     corner: 'premium_zone'
 *   },
 *   limit: 12,
 *   offset: 0
 * };
 * ```
 */
export interface CmsViewDisplayQuery {
  /**
   * 디스플레이 필터
   */
  display?: Partial<ListingDisplayConfig>;

  /**
   * 페이지네이션 - 최대 개수
   */
  limit?: number;

  /**
   * 페이지네이션 - 시작 위치
   */
  offset?: number;
}

/**
 * 코너 디스플레이 View 타입
 */
export type CornerDisplayViewType = 'corner-grid' | 'corner-carousel' | 'corner-featured' | 'corner-list';

/**
 * 코너 디스플레이 레이아웃 설정
 */
export interface CornerDisplayLayout {
  /**
   * 그리드 열 수 (corner-grid 타입)
   */
  columns?: number;

  /**
   * 아이템 간격
   */
  gap?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * 아이템 크기
   */
  itemSize?: 'sm' | 'md' | 'lg' | 'auto';

  /**
   * featured 아이템 표시 여부
   */
  showFeatured?: boolean;

  /**
   * 가격 표시 여부
   */
  showPrice?: boolean;

  /**
   * AI 버튼 표시 여부
   */
  showAiButton?: boolean;
}

/**
 * 코너 디스플레이 CmsView 설정
 *
 * CmsView 엔티티에 저장되는 코너 전용 설정
 *
 * @example
 * ```typescript
 * // CmsView 레코드 예시
 * const cornerView: CornerDisplayViewConfig = {
 *   slug: 'corner-premium-kiosk',
 *   name: '프리미엄 코너 (키오스크)',
 *   type: 'corner-grid',
 *   query: {
 *     display: {
 *       deviceId: 'kiosk_1',
 *       corner: 'premium_zone',
 *       visibility: 'visible'
 *     },
 *     limit: 12
 *   },
 *   layout: {
 *     columns: 4,
 *     gap: 'md',
 *     itemSize: 'md',
 *     showFeatured: true,
 *     showPrice: true,
 *     showAiButton: true
 *   }
 * };
 * ```
 */
export interface CornerDisplayViewConfig {
  /**
   * View 슬러그 (고유 식별자)
   * 규칙: corner-{코너명}-{디바이스타입 또는 디바이스ID}
   */
  slug: string;

  /**
   * View 이름 (표시용)
   */
  name: string;

  /**
   * View 타입
   */
  type: CornerDisplayViewType;

  /**
   * 조회 쿼리 설정
   */
  query: CmsViewDisplayQuery;

  /**
   * 레이아웃 설정
   */
  layout: CornerDisplayLayout;

  /**
   * 설명 (선택)
   */
  description?: string;

  /**
   * 활성화 여부
   */
  isActive?: boolean;
}

/**
 * 코너 디스플레이 기본 설정
 *
 * CmsView가 없을 때 사용되는 기본값
 */
export const CORNER_DISPLAY_DEFAULTS: Omit<CornerDisplayViewConfig, 'slug' | 'name' | 'query'> = {
  type: 'corner-grid',
  layout: {
    columns: 4,
    gap: 'md',
    itemSize: 'md',
    showFeatured: true,
    showPrice: true,
    showAiButton: false,
  },
  isActive: true,
};

/**
 * 디바이스 타입별 기본 레이아웃
 */
export const DEVICE_TYPE_LAYOUTS: Record<DeviceType, Partial<CornerDisplayLayout>> = {
  web: { columns: 6, itemSize: 'md' },
  mobile: { columns: 2, itemSize: 'lg' },
  kiosk: { columns: 4, itemSize: 'lg', showAiButton: true },
  tablet: { columns: 3, itemSize: 'md' },
  signage: { columns: 3, itemSize: 'lg', showPrice: false },
};

/**
 * CornerDisplay의 Listings 조회 쿼리
 *
 * Phase 2: CornerDisplay가 Phase 1 Listings API를 호출할 때 사용하는 선언적 쿼리
 *
 * 원칙:
 * - Phase 1에서 정의한 필터 키만 사용
 * - 비즈니스 로직 없음 (단순 선언)
 * - 기본값 보장으로 안전한 조회
 *
 * @example
 * ```typescript
 * const query: CornerListingQuery = {
 *   corner: 'premium_zone',
 *   deviceType: 'kiosk',
 *   visibility: 'visible',
 *   limit: 12,
 *   sortBy: 'sortOrder',
 *   sortDirection: 'asc'
 * };
 * ```
 */
export interface CornerListingQuery {
  /**
   * 코너 식별자 (필수)
   * - channelSpecificData.display.corner와 매칭
   */
  corner: string;

  /**
   * 디바이스 유형 (선택)
   * - 지정 시 해당 디바이스 유형용 Listing만 조회
   */
  deviceType?: DeviceType;

  /**
   * 가시성 필터 (기본: 'visible')
   * - 'hidden' 제품 제외
   */
  visibility?: ListingVisibility;

  /**
   * 조회 개수 제한 (기본: 12)
   */
  limit?: number;

  /**
   * 정렬 기준 (기본: 'sortOrder')
   */
  sortBy?: 'sortOrder' | 'createdAt' | 'updatedAt' | 'sellingPrice';

  /**
   * 정렬 방향 (기본: 'asc')
   */
  sortDirection?: 'asc' | 'desc';
}

/**
 * CornerListingQuery 기본값
 */
export const CORNER_LISTING_QUERY_DEFAULTS: Omit<CornerListingQuery, 'corner'> = {
  visibility: 'visible',
  limit: 12,
  sortBy: 'sortOrder',
  sortDirection: 'asc',
};
