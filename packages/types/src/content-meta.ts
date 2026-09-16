/**
 * O4O Platform — Unified Content Meta Language
 *
 * WO-CONTENT-META-TYPE-CONTRACT-V1
 * WO-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1 (2026-09-16): 논리 도메인 · canonical producer 정렬
 *
 * 목적:
 *   플랫폼 전체 콘텐츠 원장(cms_contents, kpa_contents, neture_supplier_library_items,
 *   kpa_store_contents / o4o_asset_snapshots, store_execution_assets)이 공유하는
 *   "공통 메타 언어"를 타입으로 선언한다.
 *   물리 테이블 통합이 아닌 **공통 계약** 정의다. 이 파일은 콘텐츠 시스템·전송 엔진·
 *   publication graph 가 아니며, 그런 것으로 확장하지 않는다.
 *
 * 논리 콘텐츠 도메인 4종 (O4O-ROLE-WORKSPACE-ARCHITECTURE-V1 §2 · §5 · §6):
 *   Community Content — 회원이 작성 · Community 에서 소비 · Store 는 독립 사본으로 가져감
 *   Service Content   — Service Operator 가 작성 · Service Workspace 회원에게 제공
 *   Supplier Content  — Supplier 가 작성/보유 · Store Hub 또는 Service Operator 에 제공
 *   Store Content     — Store 가 직접 작성했거나 외부 원본의 Store 소유 독립 사본
 *   원장은 각각 독립이며 물리 저장소를 통합하지 않는다.
 *
 * 개념 4축 분리 (하나의 enum 으로 합치지 않는다):
 *   producer      — 누가 만들었는가            (ContentProducer)
 *   domain        — 어느 공간의 콘텐츠인가      (ContentDomain)
 *   visibility    — 누가 볼 수 있는가          (ContentVisibility)
 *   source-origin — Store 사본이 어디서 왔는가  (각 원장의 source_type / sourceService — 이 파일이 정하지 않음)
 *   `visibility='service'` 라고 해서 자동으로 Service Content 가 아니다.
 *
 * 주의:
 *   - backend 의존 없음 (순수 타입)
 *   - HubProducer / HubVisibility (hub-content.ts) 는 Store Hub 노출 축이며 Content Domain 과 별개
 *   - 기존 API 응답 구조 변경 금지 — "추가만" 허용
 */

// =============================================================================
// SERVICE KEY
// =============================================================================

/**
 * O4O 서비스 키.
 *
 * canonical 목록은 `apps/api-server/src/config/service-catalog.ts` (`O4O_SERVICES`) 가 유일 정본이다.
 * 이 패키지는 backend 를 import 할 수 없어 예전에는 union 을 복제했으나, 실제 원장에는 복제
 * union 에 없는 키(예: `pharmacy-hub`)가 존재해 drift 가 확인됐다 (WO-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1).
 * 따라서 여기서는 문자열 계약만 두고 값 검증은 service-catalog 를 가진 API 서버가 담당한다.
 */
export type ContentServiceKey = string;

// =============================================================================
// PRODUCER (생산 주체)
// =============================================================================

/**
 * 콘텐츠 생산 주체 (canonical, O4O-ROLE-WORKSPACE-ARCHITECTURE-V1 역할 명칭 기준)
 *
 * 원장 → producer 매핑 (adapter 에서 정규화. 물리 DB enum 은 바꾸지 않는다):
 *   cms_contents.author_role = 'admin'          → 'platform'
 *   cms_contents.author_role = 'service_admin'  → 'service_operator'
 *   cms_contents.author_role = 'supplier'       → 'supplier'
 *   cms_contents.author_role = 'community'      → 'community'
 *   kpa_contents (회원 작성 원장 · 작성자 role 미저장)  → 'community'
 *     ※ `created_by` 로 role 을 추정하지 않는다. 생성 API 가 authenticate 만 요구하는
 *        회원 작성 경로이므로 원장 계약 자체가 Community Content 다.
 *   neture_supplier_library_items.supplier_id   → 'supplier'
 *   kpa_store_contents / o4o_asset_snapshots    → 'store'
 *   store_execution_assets.organization_id      → 'store'
 *
 * hub-content.ts HubProducer 와의 관계 (Store Hub 노출 축 — Content Domain 과 별개):
 *   'platform' | 'service_operator' → HubProducer 'operator'
 *   'supplier'                      → HubProducer 'supplier'
 *   'community'                     → HubProducer 'community'
 *   'store'                         → (HUB 미노출)
 */
export type ContentProducer =
  | 'platform'          // 플랫폼 관리자 (O4O 운영팀)
  | 'service_operator'  // 서비스 운영자 (Service Operator)
  | 'supplier'          // 공급자
  | 'community'         // 회원 (Community)
  | 'store';            // 매장 (Store)

/**
 * 구 producer 값 (WO-CONTENT-META-TYPE-CONTRACT-V1 ~ 2026-09-16).
 * TEMP_COMPAT — 캐시·저장된 응답을 읽는 소비처를 위한 정규화용. Store Hub 단계에서 제거한다.
 */
export type LegacyContentProducer =
  | 'platform_admin'
  | 'service_admin'
  | 'store_operator';

/** 구 producer 값 → canonical producer 정규화 (canonical 값은 그대로 통과) */
export function normalizeContentProducer(
  value: ContentProducer | LegacyContentProducer | string,
): ContentProducer {
  switch (value) {
    case 'platform_admin':
      return 'platform';
    case 'service_admin':
      return 'service_operator';
    case 'store_operator':
      return 'store';
    default:
      return value as ContentProducer;
  }
}

// =============================================================================
// CONTENT DOMAIN (논리 콘텐츠 도메인)
// =============================================================================

/**
 * 논리 콘텐츠 도메인 — "어느 공간의 콘텐츠인가"
 *
 * producer 와 1:1 이 아니다:
 *   - Service Operator 가 cms_contents 에 쓴 것 = 'service' (producer 'service_operator')
 *   - 회원이 kpa_contents / cms_contents(authorRole community) 에 쓴 것 = 'community'
 *   - Supplier 가 neture_supplier_library_items 에 보유한 것 = 'supplier'
 *     (Supplier 가 Store Hub 제출로 cms_contents 에 쓴 것도 producer 는 'supplier' 다)
 *   - Store 가 직접 작성했거나 가져온 독립 사본 = 'store' (producer 'store'; 원본 producer 와 무관)
 *
 * Store Hub(HubProducer) 는 도메인이 아니라 발견(노출) 축이다.
 */
export type ContentDomain =
  | 'community'
  | 'service'
  | 'supplier'
  | 'store';

// =============================================================================
// VISIBILITY (가시성)
// =============================================================================

/**
 * 콘텐츠 가시성 — 4단계
 *
 * hub-content.ts HubVisibility 매핑:
 *   'platform' → HubVisibility 'global'
 *   'service'  → HubVisibility 'service'
 *   'store'    → HubVisibility 'store'
 *   'personal' → (HUB 미노출 — working copy 전용)
 *
 * DB 매핑:
 *   cms_contents.visibility_scope = 'platform'     → 'platform'
 *   cms_contents.visibility_scope = 'service'      → 'service'
 *   cms_contents.visibility_scope = 'organization' → 'store'
 *   neture_supplier_library_items.visibility (또는 is_public true/false → 'service'/'personal')
 *   kpa_contents (serviceKey 격리, service-wide)   → 'service'
 *   kpa_store_contents / store_execution_assets    → 'store'
 *
 * 주의: visibility='service' 는 "서비스 범위 노출" 이지 Service Content 도메인을 뜻하지 않는다.
 */
export type ContentVisibility =
  | 'platform'   // 모든 서비스·조직 노출
  | 'service'    // 특정 서비스 한정 (serviceKey 필수)
  | 'store'      // 특정 조직(매장) 한정 (organizationId 필수)
  | 'personal';  // 개인 전용 (working copy, 비발행)

// =============================================================================
// CONTENT TYPE (콘텐츠 유형)
// =============================================================================

/**
 * 콘텐츠 유형 — Layer별 분류
 *
 * Layer 1 (원본):
 *   'cms_block'  — HUB 노출용 블록 (cms_contents, body_blocks JSONB)
 *   'document'   — 문서형 (kpa_contents, blocks JSONB)
 *   'media'      — 파일/이미지 (neture_supplier_library_items.content_type='media')
 *   'guide'      — 가이드/매뉴얼 (neture_supplier_library_items.content_type='guide')
 *   'banner'     — 배너 (neture_supplier_library_items.content_type='banner')
 *
 * Layer 2 (편집):
 *   'working_copy' — Store 소유 독립 사본 (kpa_store_contents · o4o_asset_snapshots).
 *                    ※ 구 kpa_working_contents 는 DROP 됨 (dead table 은퇴).
 *
 * Layer 3 (실행, 독립 유지):
 *   'execution_asset' — 매장 실행 자산 (store_execution_assets)
 */
export type ContentType =
  | 'cms_block'       // Layer 1: HUB CMS 블록
  | 'document'        // Layer 1: 문서형 (blocks)
  | 'media'           // Layer 1: 파일/이미지
  | 'guide'           // Layer 1: 가이드/매뉴얼
  | 'banner'          // Layer 1: 배너
  | 'working_copy'    // Layer 2: 편집 사본
  | 'execution_asset'; // Layer 3: 매장 실행 자산 (참조용)

// =============================================================================
// STATUS (상태)
// =============================================================================

/**
 * 콘텐츠 상태 — 4단계 통합
 *
 * DB 매핑:
 *   cms_contents.status: draft | pending | published | archived
 *     pending → 'ready' (검토 대기 = 발행 가능 상태)
 *   kpa_contents.status: draft | ready | published | private
 *     (draft/ready/published 그대로, private 은 노출 축이 아니라 status 축 — 소비처가 판단)
 *   neture_supplier_library_items: 발행 상태 없이 visibility 로만 구분 (status 는 소비처 고정값)
 *   store_execution_assets.is_active: boolean
 *     true → 'published', false → 'archived'
 */
export type ContentStatus =
  | 'draft'      // 편집 중 (저장됨, 미발행)
  | 'ready'      // 발행 가능 (검토 완료 — kpa_contents 기준)
  | 'published'  // 발행됨 (실제 노출)
  | 'archived';  // 보관됨 (비활성, 삭제 아님)

// =============================================================================
// CONTENT META (공통 메타 인터페이스)
// =============================================================================

/**
 * ContentMeta — O4O 콘텐츠 공통 메타 계약
 *
 * 사용 방법:
 *   각 도메인 타입이 이 인터페이스를 extend하거나
 *   API 응답에 이 필드들을 포함(추가)하도록 한다.
 *   기존 필드 제거 금지 — "추가만" 허용.
 *
 * 예시:
 *   interface KpaContentResponse extends ContentMeta {
 *     blocks: Block[];
 *     category: string | null;
 *     tags: string[];
 *   }
 */
export interface ContentMeta {
  /** 콘텐츠 고유 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 생산 주체 */
  producer: ContentProducer;
  /** 생산자 참조 ID (created_by | supplier_id | organization_id) */
  producerRef: string;
  /** 가시성 범위 */
  visibility: ContentVisibility;
  /** 서비스 키 (visibility='service' 일 때 필수) */
  serviceKey?: ContentServiceKey;
  /** 조직 ID (visibility='store' 일 때 필수) */
  organizationId?: string;
  /** 콘텐츠 유형 */
  contentType: ContentType;
  /** 상태 */
  status: ContentStatus;
  /** 생성 시각 (ISO 8601) */
  createdAt: string;
  /** 수정 시각 (ISO 8601) */
  updatedAt: string;
}

// =============================================================================
// LAYER MARKERS (Layer 식별용 상수)
// =============================================================================

/** Layer 1 — 원본 콘텐츠 유형 */
export const CONTENT_LAYER1_TYPES: readonly ContentType[] = [
  'cms_block',
  'document',
  'media',
  'guide',
  'banner',
] as const;

/** Layer 2 — 편집 사본 유형 */
export const CONTENT_LAYER2_TYPES: readonly ContentType[] = [
  'working_copy',
] as const;

/** Layer 3 — 실행 자산 유형 (독립 도메인) */
export const CONTENT_LAYER3_TYPES: readonly ContentType[] = [
  'execution_asset',
] as const;

// =============================================================================
// UI LABELS
// =============================================================================

export const CONTENT_PRODUCER_LABELS: Record<ContentProducer, string> = {
  platform:         '플랫폼 운영',
  service_operator: '서비스 운영자',
  supplier:         '공급자',
  community:        '커뮤니티',
  store:            '매장',
};

export const CONTENT_DOMAIN_LABELS: Record<ContentDomain, string> = {
  community: 'Community 콘텐츠',
  service:   'Service 콘텐츠',
  supplier:  'Supplier 콘텐츠',
  store:     'Store 콘텐츠',
};

export const CONTENT_VISIBILITY_LABELS: Record<ContentVisibility, string> = {
  platform: '플랫폼 전체',
  service:  '서비스 전용',
  store:    '매장 전용',
  personal: '개인',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  cms_block:       'CMS 블록',
  document:        '문서',
  media:           '미디어',
  guide:           '가이드',
  banner:          '배너',
  working_copy:    '편집 사본',
  execution_asset: '실행 자산',
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft:     '초안',
  ready:     '발행 가능',
  published: '발행됨',
  archived:  '보관됨',
};

// =============================================================================
// MAPPING HELPERS (DB 값 → ContentMeta 값 변환)
// =============================================================================

/**
 * cms_contents.visibility_scope → ContentVisibility 변환
 */
export function mapCmsVisibilityScope(
  scope: 'platform' | 'service' | 'organization',
): ContentVisibility {
  if (scope === 'organization') return 'store';
  return scope;
}

/** cms_contents.author_role 물리 값 (cms-core ContentAuthorRole 과 동일 — DB enum 은 바꾸지 않는다) */
export type CmsAuthorRole = 'admin' | 'service_admin' | 'supplier' | 'community';

/**
 * cms_contents.author_role → ContentProducer 변환 (adapter 정규화)
 *   admin → platform · service_admin → service_operator · supplier / community 그대로
 */
export function mapCmsAuthorRole(role: CmsAuthorRole): ContentProducer {
  if (role === 'admin') return 'platform';
  if (role === 'service_admin') return 'service_operator';
  return role;
}

/**
 * kpa_contents → ContentProducer.
 * kpa_contents 는 회원 작성 원장(생성 API = authenticate 만)이며 작성자 role 을 저장하지 않는다.
 * 원장 계약이 Community Content 이므로 행 단위 role 추정 없이 항상 'community' 다.
 */
export function mapKpaContentProducer(): ContentProducer {
  return 'community';
}

/** neture_supplier_library_items → ContentProducer (공급자 원장) */
export function mapSupplierLibraryProducer(): ContentProducer {
  return 'supplier';
}

/**
 * cms_contents.status (pending 포함) → ContentStatus 변환
 */
export function mapCmsStatus(
  status: 'draft' | 'pending' | 'published' | 'archived',
): ContentStatus {
  if (status === 'pending') return 'ready';
  return status as ContentStatus;
}

/**
 * neture_supplier_library_items.is_public → ContentVisibility 변환
 * (visibility 컬럼이 있으면 그 값을 우선하고 이 함수는 fallback 으로만 쓴다)
 */
export function mapNetureVisibility(isPublic: boolean): ContentVisibility {
  return isPublic ? 'service' : 'personal';
}

/**
 * store_execution_assets.is_active → ContentStatus 변환
 */
export function mapExecutionAssetStatus(isActive: boolean): ContentStatus {
  return isActive ? 'published' : 'archived';
}
