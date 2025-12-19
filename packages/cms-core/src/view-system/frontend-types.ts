/**
 * CMS View Frontend Types
 *
 * Phase 3 Stabilization: 프론트엔드 화면 제작을 위한 CMS View 타입 정의
 *
 * === 이 파일의 목적 ===
 * 1. CMS View API 응답 스키마 명확화
 * 2. View metadata → Design Core 참조 규칙 정의
 * 3. 프론트엔드가 CMS View를 어떻게 사용해야 하는지 표준 제공
 *
 * === 사용 원칙 ===
 * - 이 타입들은 "강제"가 아닌 "힌트"
 * - 프론트엔드는 이 값을 참조만 하고, 없으면 무시
 * - CMS가 UI를 지시하지 않음 (Design Core First 원칙)
 *
 * @package @o4o/cms-core
 * @since Phase 3
 */

/**
 * ============================================================
 * Task 1: CMS View API 응답 스키마 명확화
 * ============================================================
 */

/**
 * CMS View API 응답 타입
 *
 * 이 타입은 API 응답 형태를 변경하지 않고,
 * 각 필드의 "의미"를 코드 레벨에서 고정합니다.
 */
export interface CmsViewResponse {
  /** View 고유 식별자 (UUID) */
  id: string;

  /** 조직 ID - 멀티테넌시 구분용 */
  organizationId: string;

  /** View 이름 (관리자용 표시명) */
  name: string;

  /** URL-friendly 식별자 */
  slug: string;

  /**
   * 화면 유형 - 프론트엔드 판단 기준
   *
   * - 'list': 목록 화면 (테이블, 그리드 등)
   * - 'detail': 상세 화면 (단일 항목)
   * - 'edit': 편집 화면 (폼)
   * - 'create': 생성 화면 (폼)
   * - 'custom': 커스텀 화면
   */
  type: CmsViewType;

  /** View 설명 (선택적) */
  description?: string | null;

  /** 연결된 템플릿 ID (Backend 렌더링용, 프론트엔드에서 일반적으로 무시) */
  templateId?: string | null;

  /** 대상 CPT(Custom Post Type) 이름 */
  cptType?: string | null;

  /**
   * 데이터 조회 조건
   *
   * 프론트엔드가 API 호출 시 사용할 수 있는 쿼리 힌트
   * 예: { orderBy: 'createdAt', order: 'desc', limit: 20 }
   */
  query: CmsViewQuery;

  /**
   * 레이아웃 힌트 (강제 아님)
   *
   * 프론트엔드가 레이아웃 결정 시 참조할 수 있는 정보
   */
  layout: CmsViewLayout;

  /**
   * UI 필터 힌트
   *
   * 목록 화면에서 사용할 수 있는 필터 옵션
   */
  filters: CmsViewFilters;

  /**
   * Design Core 참조 메타데이터
   *
   * 프론트엔드가 Design Core 컴포넌트 선택 시 참조할 수 있는 힌트
   * 이 값은 "힌트"일 뿐, 강제가 아님
   */
  metadata: CmsViewMeta;

  /** 활성화 여부 */
  isActive: boolean;

  /** 정렬 순서 */
  sortOrder: number;

  /** 생성일시 */
  createdAt: string;

  /** 수정일시 */
  updatedAt: string;
}

/**
 * View 유형 enum
 */
export type CmsViewType = 'list' | 'detail' | 'edit' | 'create' | 'custom';

/**
 * ============================================================
 * Task 3: View metadata → Design Core 참조 규칙 정의
 * ============================================================
 */

/**
 * CMS View 메타데이터 - Design Core 참조용
 *
 * === 사용 원칙 ===
 * - 이 값들은 "힌트"로만 사용
 * - 프론트엔드는 이 값을 참조하거나 무시할 수 있음
 * - Design Core가 최종 UI를 결정함 (CMS가 UI를 지시하지 않음)
 *
 * === 예시 ===
 * ```typescript
 * const meta: CmsViewMeta = {
 *   preferredSection: 'ProductDetail',
 *   density: 'standard',
 *   actions: ['addToCart', 'wishlist']
 * };
 * ```
 */
export interface CmsViewMeta {
  /**
   * 권장 섹션/컴포넌트 이름 (힌트)
   *
   * Design Core 또는 앱에서 정의한 섹션 이름
   * 예: 'ProductDetail', 'ArticleList', 'UserProfile'
   *
   * 프론트엔드는 이 값을 참조하여 컴포넌트를 선택할 수 있지만,
   * 반드시 따를 필요는 없음
   */
  preferredSection?: string;

  /**
   * 밀도 힌트
   *
   * - 'compact': 조밀한 레이아웃 (목록, 대시보드)
   * - 'standard': 표준 레이아웃
   * - 'spacious': 여유있는 레이아웃 (상세 페이지)
   */
  density?: 'compact' | 'standard' | 'spacious';

  /**
   * 권장 액션 목록 (힌트)
   *
   * 화면에 표시할 수 있는 액션 버튼 힌트
   * 예: ['addToCart', 'wishlist', 'share', 'edit', 'delete']
   */
  actions?: string[];

  /**
   * 서비스 그룹 힌트
   *
   * 이 View가 주로 사용되는 서비스 그룹
   * 예: 'cosmetics', 'yaksa'
   */
  serviceGroup?: string;

  /**
   * 커스텀 메타데이터
   *
   * 앱별로 필요한 추가 정보를 저장
   * Design Core는 이 값을 무시함
   */
  custom?: Record<string, unknown>;
}

/**
 * View 쿼리 파라미터
 *
 * 프론트엔드가 데이터 조회 시 사용할 수 있는 힌트
 */
export interface CmsViewQuery {
  /** 정렬 기준 필드 */
  orderBy?: string;

  /** 정렬 방향 */
  order?: 'asc' | 'desc';

  /** 페이지당 항목 수 */
  limit?: number;

  /** 기본 필터 조건 */
  where?: Record<string, unknown>;

  /** 포함할 관계 */
  include?: string[];
}

/**
 * View 레이아웃 힌트
 */
export interface CmsViewLayout {
  /**
   * 레이아웃 타입 힌트
   *
   * - 'default': 기본 레이아웃
   * - 'fullwidth': 전체 너비
   * - 'sidebar': 사이드바 포함
   * - 'split': 분할 레이아웃
   */
  type?: 'default' | 'fullwidth' | 'sidebar' | 'split';

  /** 컬럼 수 (그리드 레이아웃) */
  columns?: number;

  /** 사이드바 위치 */
  sidebarPosition?: 'left' | 'right';

  /** 추가 레이아웃 설정 */
  options?: Record<string, unknown>;
}

/**
 * View 필터 설정
 */
export interface CmsViewFilters {
  /** 사용 가능한 필터 필드 목록 */
  available?: CmsViewFilterField[];

  /** 기본 적용 필터 */
  defaults?: Record<string, unknown>;

  /** 검색 가능 여부 */
  searchable?: boolean;

  /** 검색 대상 필드 */
  searchFields?: string[];
}

/**
 * 필터 필드 정의
 */
export interface CmsViewFilterField {
  /** 필드 이름 */
  field: string;

  /** 표시 라벨 */
  label: string;

  /** 필터 타입 */
  type: 'text' | 'select' | 'date' | 'range' | 'boolean';

  /** 선택 옵션 (select 타입) */
  options?: Array<{ value: string; label: string }>;
}

/**
 * ============================================================
 * Task 2: CMS View → Frontend 연결 표준 경로
 * ============================================================
 */

/**
 * CMS View 해석 결과
 *
 * resolveCmsView()의 반환값으로,
 * 프론트엔드가 화면을 구성하는 데 필요한 모든 정보를 포함
 */
export interface CmsViewResolution {
  /** 원본 View 응답 */
  view: CmsViewResponse;

  /** 데이터 조회에 사용할 쿼리 파라미터 */
  dataQuery: CmsViewQuery;

  /** Design Core 참조용 메타데이터 */
  meta: CmsViewMeta;

  /** View 유형 */
  viewType: CmsViewType;

  /** 레이아웃 힌트 */
  layout: CmsViewLayout;

  /** 필터 설정 */
  filters: CmsViewFilters;
}

/**
 * CMS View Resolver 옵션
 */
export interface CmsViewResolverOptions {
  /** API 베이스 URL (기본값: 환경변수에서 가져옴) */
  apiBaseUrl?: string;

  /** 인증 토큰 (필요시) */
  authToken?: string;

  /** 조직 ID */
  organizationId?: string;
}
