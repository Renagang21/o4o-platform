/**
 * Operator Resources Console — Types
 *
 * WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1
 *
 * KPA / GP / K-Cos 3 service 의 Operator Resources Console 공통 wrapper 의 타입.
 * 선행: WO-O4O-KCOS-RESOURCES-BACKEND-V1.
 */

import type React from 'react';

export type ResourceStatus = 'draft' | 'published' | 'private';
export type ResourceSourceType = 'manual' | 'upload' | 'external';
export type ResourceUsageType = 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY';
export type ResourceReusablePolicy = 'platform' | 'restricted';

export interface ResourcesConsoleItem {
  id: string;
  title: string;
  summary: string | null;
  tags?: string[];
  category?: string | null;
  status: string;
  source_type: string;
  source_url: string | null;
  source_file_name: string | null;
  usage_type: string | null;
  thumbnail_url?: string | null;
  created_by: string | null;
  author_name?: string | null;
  like_count?: number;
  view_count?: number;
  reusable_policy?: ResourceReusablePolicy;
  created_at: string;
  updated_at: string;
}

export interface ResourcesConsoleListResponse {
  data?: {
    items?: ResourcesConsoleItem[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  items?: ResourcesConsoleItem[];
  total?: number;
}

export interface ResourcesConsoleListParams {
  page?: number;
  limit?: number;
  search?: string;
  source_type?: ResourceSourceType;
  /**
   * 상태 필터. 실제 값은 lifecycle config 의 `statuses` 가 정하며 서버가 검증한다.
   * 타입은 기존 3 service client 의 좁은 선언(`'draft'|'published'|'private'`)을 그대로
   * 두기 위해 넓히지 않는다 — console 이 전달 시점에 한 번 cast 한다.
   * (여기를 `string` 으로 넓히면 3 service client 가 대입 불가가 되어 회귀가 된다.)
   */
  status?: ResourceStatus;
  usage_type?: ResourceUsageType;
}

/**
 * Service-side API client adapter. Each service (KPA / GP / K-Cos) provides
 * its own client. The wrapper calls these methods. Response shape varies
 * across services so the wrapper does defensive unwrapping (see component).
 */
export interface ResourcesConsoleClient {
  operatorList(params: ResourcesConsoleListParams): Promise<any>;
  /**
   * 상태 전이. 목표 상태 문자열은 lifecycle config 의 `allowedTransitions` 가 정한다.
   * 메서드 축약형으로 선언해 기존 3 service 의 `(id, status: ResourceStatus)` 클라이언트가
   * 그대로 대입되게 유지한다(계약 확장이 기존 소비처를 깨지 않는다).
   */
  operatorUpdateStatus(id: string, status: string): Promise<any>;
  /** `supportsDelete: false` lifecycle 에서는 없어도 된다. */
  operatorDelete?(id: string): Promise<any>;
  /** `visibleActions` 에 'edit' 가 있을 때 필요 — 편집 폼 초기값 조회. */
  operatorGet?(id: string): Promise<any>;
  /** `visibleActions` 에 'create' 가 있을 때 필요. */
  operatorCreate?(input: ResourcesFormValue): Promise<any>;
  /** `visibleActions` 에 'edit' 가 있을 때 필요. */
  operatorUpdate?(id: string, input: ResourcesFormValue): Promise<any>;
}

/**
 * Optional AI generation slot. When provided, wrapper renders the "AI 콘텐츠
 * 생성" button in header + invokes `render` to draw the modal. The wrapper
 * passes `open / onClose / onSaved` to the render function. `onSaved` should
 * be called after a successful AI save to trigger list refresh.
 *
 * GP 의 AiContentModal 분기는 본 slot 으로 흡수 (service-별 page 분리 회피).
 */
export interface ResourcesConsoleAiSlot {
  /** Header button label (e.g., 'AI 콘텐츠 생성'). */
  buttonLabel: string;
  /** Render the AI modal. Wrapper manages open state. */
  render: (props: {
    open: boolean;
    onClose: () => void;
    /** Call after successful save to trigger list refetch in wrapper. */
    onSaved: () => void;
  }) => React.ReactNode;
}

export interface OperatorResourcesConsolePageProps {
  /** Canonical service key (kpa-society / glycopharm / k-cosmetics). */
  serviceKey: string;
  /** Service-side API client. */
  client: ResourcesConsoleClient;
  /** Optional AI integration. KPA / K-Cos 는 unset, GP 는 set. */
  aiSlot?: ResourcesConsoleAiSlot;
  /** Optional override of policy banner text. Default: 자료실 운영 정책 문구. */
  policyBanner?: string;
  /**
   * Optional detail-link builder. Default `/resources/:id`.
   * 각 service 의 user-facing 자료실 URL 이 다르면 override.
   */
  detailLinkPath?: (id: string) => string;
  /**
   * 원장 lifecycle. 미지정 시 `DEFAULT_RESOURCES_LIFECYCLE`
   * (= `{service}_contents` 계열 현행 behavior). §3
   */
  lifecycle?: ResourcesLifecycleConfig;
}


// ───────────────────────────────────────────────────────────────────────────
// Lifecycle capability 계약
// WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3
//
//   원장마다 상태 집합·전이·삭제 지원이 다르다.
//     {service}_contents  : draft|published|private · delete 지원
//     cms_contents        : draft|pending|published|archived · delete 미지원
//   이 차이를 **서비스 분기 없이** config 로만 표현한다.
//   `if (serviceKey === '...')` 는 공통 콘솔에 두지 않는다.
// ───────────────────────────────────────────────────────────────────────────

/** 상태 1개의 표시 계약. */
export interface ResourcesStatusDef {
  value: string;
  label: string;
  /** 뱃지 className (Tailwind). */
  className: string;
  /** 상태 필터 select 에 노출할지. 기본 true. */
  filterable?: boolean;
}

/** transition action 아이콘 키 — 공통 콘솔이 lucide 아이콘으로 매핑한다. */
export type ResourcesTransitionIcon = 'eye' | 'eye-off' | 'send' | 'undo' | 'archive';

/** 확인 다이얼로그 문구. */
export interface ResourcesConfirmDef {
  title: string;
  confirmText: string;
  variant?: 'default' | 'danger';
}

/**
 * 상태 전이 action 정의.
 *
 * 실제 노출 여부는 `allowedTransitions[row.status]` 와 교차해서 결정한다 —
 * **불가능한 전이는 CTA 로 그리지 않는다**(§3 금지 사항).
 */
export interface ResourcesTransitionActionDef {
  /** 목표 상태. */
  to: string;
  /** row action · bulk action 라벨. */
  label: string;
  icon?: ResourcesTransitionIcon;
  variant?: 'primary' | 'default' | 'danger';
  /** row action 확인 다이얼로그. 없으면 즉시 실행. */
  rowConfirm?: ResourcesConfirmDef;
  /**
   * bulk ActionBar 노출 정의. 없으면 bulk 에 나오지 않는다.
   * (여러 상태가 섞인 선택에서 불가능한 전이가 섞일 수 있는 lifecycle 은 bulk 를 열지 않는다.)
   */
  bulkConfirm?: ResourcesConfirmDef;
  /** 성공 토스트. 기본 `"{title}" {label} 처리되었습니다`. */
  successMessage?: (title: string) => string;
}

/** 목록 컬럼·필터 노출 계약 (원장마다 없는 필드를 빈 칸으로 그리지 않는다). */
export interface ResourcesFieldCapabilities {
  /** source_type 컬럼 + 유형 필터. */
  sourceType: boolean;
  /** usage_type 컬럼 + 활용방식 필터. */
  usageType: boolean;
  /** 파일/링크 컬럼. */
  sourceFileOrLink: boolean;
  /** 조회수 컬럼. */
  viewCount: boolean;
  /** 작성자 컬럼. */
  author: boolean;
  /** 검색 입력. */
  search: boolean;
}

/** create/edit 폼에서 다루는 필드. */
export interface ResourcesFormFieldCapabilities {
  summary: boolean;
  /** 본문 — RichTextEditor 필요. */
  body: boolean;
  /** 외부 링크(linkUrl + linkText). */
  link: boolean;
}

export interface ResourcesFormValue {
  title: string;
  summary?: string;
  body?: string;
  linkUrl?: string;
  linkText?: string;
}

export interface ResourcesFormConfig {
  fields: ResourcesFormFieldCapabilities;
  /**
   * 본문 편집기. `fields.body` 가 true 면 필수 — 공통 콘솔은 편집기 구현을 모른다
   * (CmsContentManager 와 같은 주입 방식).
   */
  RichTextEditor?: React.ComponentType<{
    value: string;
    onChange: (v: { html: string }) => void;
    preset?: 'full' | 'compact';
    minHeight?: string;
    placeholder?: string;
  }>;
  /** 신규 등록 버튼 라벨. 기본 `새 {nouns.entity}`. */
  createLabel?: string;
  /** 저장 후 안내 문구(생성 시 서버가 어떤 상태로 두는지). */
  createHint?: string;
}

/** non-transition action 키. */
export type ResourcesActionKey = 'view' | 'edit' | 'create' | 'delete';

/**
 * 콘솔이 사용하는 도메인 명사.
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3:
 *   같은 원장(`cms_contents`)을 subType 으로 나눠 쓰는 두 축(자료실 / 커뮤니티 콘텐츠)이
 *   **같은 콘솔**을 소비한다. 축마다 콘솔을 복제하지 않으려면 문구가 config 여야 한다.
 *   서비스 분기(`if (serviceKey === ...)`)가 아니라 명사 주입이다.
 *
 *   미지정 시 기존 문구("자료" / "자료실" / "자료실 관리")가 그대로 쓰인다 —
 *   기존 4개 소비처(KPA/GP/KCos/PH 자료실)의 화면 문구 변화 = 0.
 */
export interface ResourcesNouns {
  /** 개별 항목 — "자료" / "콘텐츠" */
  entity: string;
  /** 모음/공간 — "자료실" / "커뮤니티 콘텐츠" */
  collection: string;
  /** 콘솔 제목 — "자료실 관리" / "커뮤니티 콘텐츠 관리" */
  consoleTitle: string;
}

export const DEFAULT_RESOURCES_NOUNS: ResourcesNouns = {
  entity: '자료',
  collection: '자료실',
  consoleTitle: '자료실 관리',
};

/**
 * 원장 lifecycle 계약 — §3 최소 계약
 * (`statuses` / `allowedTransitions` / `supportsDelete` / `visibleActions` / `fieldCapabilities`).
 */
export interface ResourcesLifecycleConfig {
  statuses: ResourcesStatusDef[];
  /** `현재 상태 → 가능한 목표 상태[]`. 여기 없는 전이는 UI 에 그리지 않는다. */
  allowedTransitions: Record<string, string[]>;
  supportsDelete: boolean;
  visibleActions: ResourcesActionKey[];
  fieldCapabilities: ResourcesFieldCapabilities;
  transitionActions: ResourcesTransitionActionDef[];
  /** create/edit 를 여는 lifecycle 만 설정한다. */
  form?: ResourcesFormConfig;
  /** 도메인 명사. 미지정 시 `DEFAULT_RESOURCES_NOUNS`. */
  nouns?: ResourcesNouns;
}
