/**
 * O4O Platform — Unified Content Meta Language
 *
 * WO-CONTENT-META-TYPE-CONTRACT-V1
 *
 * 목적:
 *   플랫폼 전체 콘텐츠 구조(cms_contents, kpa_contents, neture_supplier_contents)가
 *   공유하는 메타 언어를 타입으로 선언.
 *   물리 테이블 통합이 아닌 "공통 계약" 정의.
 *
 * 3-Layer 구조:
 *   Layer 1 — Content (원본): cms_contents, kpa_contents, neture_supplier_contents
 *   Layer 2 — Working (편집):  kpa_working_contents
 *   Layer 3 — Execution (실행): store_execution_assets (독립 유지, 메타 일부만 차용)
 *
 * 주의:
 *   - backend 의존 없음 (순수 타입)
 *   - HubProducer / HubVisibility (hub-content.ts) 와 호환 유지
 *   - 기존 API 응답 구조 변경 금지 — "추가만" 허용
 */

// =============================================================================
// SERVICE KEY
// =============================================================================

/** O4O 서비스 키 (service-catalog.ts 기준 5개) */
export type ContentServiceKey =
  | 'neture'
  | 'glycopharm'
  | 'glucoseview'
  | 'kpa-society'
  | 'k-cosmetics';

// =============================================================================
// PRODUCER (생산 주체)
// =============================================================================

/**
 * 콘텐츠 생산 주체 — 5단계
 *
 * hub-content.ts HubProducer 매핑:
 *   'platform_admin' | 'service_admin' → HubProducer 'operator'
 *   'supplier'                         → HubProducer 'supplier'
 *   'store_operator'                   → (HUB 미노출)
 *   'community'                        → HubProducer 'community'
 *
 * DB 매핑:
 *   cms_contents.author_role = 'admin'         → 'platform_admin'
 *   cms_contents.author_role = 'service_admin' → 'service_admin'
 *   cms_contents.author_role = 'supplier'      → 'supplier'
 *   cms_contents.author_role = 'community'     → 'community'
 *   kpa_contents.created_by (role 기반 추론)   → 'service_admin'
 *   neture_supplier_contents.supplier_id       → 'supplier'
 *   store_execution_assets.organization_id     → 'store_operator'
 *   kpa_working_contents.owner_id              → 'store_operator'
 */
export type ContentProducer =
  | 'platform_admin'   // O4O 운영팀 (전체 플랫폼 콘텐츠)
  | 'service_admin'    // 서비스 운영자 (KPA 관리자, GlycoPharm 관리자 등)
  | 'supplier'         // 공급자 (Neture Supplier)
  | 'store_operator'   // 매장 운영자 (약국, 가맹점)
  | 'community';       // 일반 회원 (커뮤니티)

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
 *   neture_supplier_contents.is_public = true      → 'service'
 *   neture_supplier_contents.is_public = false     → 'personal'
 *   kpa_contents (service-wide)                    → 'service'
 *   store_execution_assets.organization_id         → 'store'
 *   kpa_working_contents.owner_id                  → 'personal'
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
 *   'media'      — 파일/이미지 (neture_supplier_contents, file_url 기반)
 *   'guide'      — 가이드/매뉴얼 (neture_supplier_contents, body 기반)
 *   'banner'     — 배너 (neture_supplier_contents, image_url 기반)
 *
 * Layer 2 (편집):
 *   'working_copy' — 편집 중인 복사본 (kpa_working_contents)
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
 *   kpa_contents.status: draft | ready
 *     (그대로)
 *   neture_supplier_contents.status: draft | published
 *     (published → 'published', draft → 'draft')
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
  platform_admin: '플랫폼 운영',
  service_admin:  '서비스 운영',
  supplier:       '공급자',
  store_operator: '매장 운영자',
  community:      '커뮤니티',
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

/**
 * cms_contents.author_role → ContentProducer 변환
 */
export function mapCmsAuthorRole(
  role: 'admin' | 'service_admin' | 'supplier' | 'community',
): ContentProducer {
  if (role === 'admin') return 'platform_admin';
  return role as ContentProducer;
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
 * neture_supplier_contents.is_public → ContentVisibility 변환
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
