/**
 * Operator Signage HQ Module — Types
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1
 *
 * KPA-Society / K-Cosmetics 의 운영자 사이니지 HQ 화면 8종이 각각 복제돼 있었다
 * (미디어 목록·상세 / 플레이리스트 목록·상세 / 템플릿 목록·상세 / 강제 콘텐츠).
 *
 * 백엔드는 `app.use('/api/signage/:serviceKey', signageRoutes)` 로 **serviceKey 파라미터화**돼 있어
 * 두 서비스가 완전히 같은 endpoint·payload 를 쓴다(register-routes.ts:1011).
 * 따라서 차이는 HTTP client · serviceKey · accent · 도메인 어휘(태그 프리셋)뿐이다.
 *
 * API endpoint · payload · 권한(requireSignageOperator) 은 변경하지 않는다.
 */

import type { ReactNode } from 'react';

/** 서비스가 주입하는 raw HTTP 어댑터. 기존 각 서비스 `apiFetch` 시그니처를 그대로 쓴다. */
export type SignageApiFetch = <T = any>(path: string, options?: RequestInit) => Promise<T>;

/**
 * 서비스 config — accent 는 className 리터럴로 주입한다.
 * 값이 서비스 소스에 존재해야 Tailwind content 스캔에 포함된다.
 */
export interface SignageHqConfig {
  /** 'kpa-society' | 'k-cosmetics' — URL path 파라미터로만 쓰인다 */
  serviceKey: string;
  /** DataTable 컬럼 설정 저장 키 prefix (예: 'kpa' → 'kpa-hq-media') */
  tableIdPrefix: string;
  /** ActionPolicy 등록 키 prefix (예: 'kpa:signage') */
  actionPolicyPrefix: string;
  /** 라우트 base (예: '/operator/signage') */
  routeBase: string;
  accent: {
    /** 아이콘 색 (예: 'text-blue-600') */
    icon: string;
    /** 주 버튼 (예: 'bg-blue-600 hover:bg-blue-700') */
    primaryButton: string;
    /** 입력 focus ring (예: 'focus:ring-blue-500') */
    focusRing: string;
    /** 카드 테두리 (예: 'border-blue-100') */
    cardBorder: string;
    /** 태그 pill (예: 'bg-blue-100 text-blue-700') */
    tagPill: string;
    /** 링크 텍스트 (예: 'text-blue-600') */
    linkText: string;
    /** 로딩 스피너 테두리 (예: 'border-blue-600') */
    spinnerBorder: string;
    /** 개수 배지 (예: 'bg-blue-100 text-blue-700') */
    countBadge: string;
    /** 보조 버튼 — 테두리형 (예: 'text-blue-600 border-blue-200 hover:bg-blue-50') */
    softButton: string;
    /** 강조 패널 배경 (예: 'border-blue-100 bg-blue-50/30') */
    panelBg: string;
    /** 현재 상태 배지 ring (예: 'ring-blue-400') */
    statusRing: string;
  };
  /** 미디어/플레이리스트 등록 폼의 태그 추천 목록 (서비스 도메인 어휘) */
  tagSuggestions: string[];
  /**
   * 플레이리스트 용어. KPA 는 '플레이리스트', K-Cosmetics 는 '재생목록' 을 쓴다.
   * 기존 화면 문구를 그대로 보존하기 위한 주입점이며 업무 의미는 동일하다.
   */
  playlistLabel: string;
  /**
   * 매장 용어. KPA 는 '약국', K-Cosmetics 는 '매장'. 강제 콘텐츠 안내 문구에 쓰인다.
   */
  storeLabel: string;
  /**
   * 강제 콘텐츠의 '노출 대상'(태블릿 대기화면) 필드 노출 여부.
   * KPA 태블릿 서브시스템 전용 확장(WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1)이라
   * 해당 서브시스템이 없는 서비스는 false — 필드도 payload 도 생기지 않는다.
   */
  enableTabletSurface: boolean;
}

// ─── 공통 도메인 타입 ────────────────────────────────────────
// 각 서비스가 로컬 interface 로 **부분 선언**하던 필드의 합집합이다.
// 같은 endpoint 응답이므로 서로의 필드를 서로가 안 쓰고 있었을 뿐이다.

export interface SignageMediaItem {
  id: string;
  name: string;
  mediaType: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  thumbnailUrl?: string | null;
  createdAt: string;
}

export interface SignageMediaDetail extends SignageMediaItem {
  description?: string | null;
  embedId?: string | null;
  duration?: number | null;
  isPublic?: boolean;
  source?: string;
  scope?: string;
  tags?: string[] | null;
  updatedAt?: string;
}

export interface SignagePlaylistItem {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  loopEnabled: boolean;
  totalDuration: number | null;
  transitionType?: string;
  itemCount?: number;
  createdAt: string;
}

export interface SignagePlaylistEntry {
  id: string;
  mediaId: string;
  mediaName?: string;
  sortOrder: number;
  duration: number | null;
  transitionType?: string;
  sourceType?: string;
}

export interface SignageTemplateItem {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string;
  isPublic?: boolean;
  zoneCount?: number;
  createdAt: string;
}

export interface SignageTemplateZone {
  id: string;
  name: string;
  zoneType: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  sortOrder?: number;
}

export interface SignageForcedContentItem {
  id: string;
  title: string;
  description?: string | null;
  mediaId?: string | null;
  mediaName?: string | null;
  priority?: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
}

// ─── Page props ──────────────────────────────────────────────

export interface SignageHqPageProps {
  apiFetch: SignageApiFetch;
  config: SignageHqConfig;
  /** react-router navigate 주입 (하드 내비게이션 금지) */
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

export interface SignageHqDetailPageProps extends SignageHqPageProps {
  /** useParams 로 뽑은 id */
  id: string | undefined;
}

/** 상태 배지 공통 설정 */
export const SIGNAGE_STATUS_CONFIG: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  pending: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  inactive: { text: '비활성', cls: 'bg-amber-100 text-amber-600' },
  archived: { text: '아카이브', cls: 'bg-slate-100 text-slate-500' },
};

export const SIGNAGE_MEDIA_TYPE_LABEL: Record<string, string> = {
  video: '동영상', image: '이미지', html: 'HTML', text: '텍스트', rich_text: '리치 텍스트', link: '링크',
};

export const SIGNAGE_SOURCE_TYPE_LABEL: Record<string, string> = {
  upload: '업로드', url: 'URL', embed: '임베드', youtube: 'YouTube', vimeo: 'Vimeo', cms: 'CMS',
};

export type SignageActionIcons = Record<string, ReactNode>;
