/**
 * Guide Types
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 *
 * Shared Guide 페이지 7개의 prop 데이터 타입 정의.
 * 서비스(KPA / GlycoPharm)별 copy 파일이 이 타입을 따라 데이터를 제공한다.
 */

// ─── 편집 가능 텍스트 렌더러 (WO-O4O-GUIDE-INLINE-EDIT-V1) ───────────
// 서비스별로 description 영역을 동적 콘텐츠로 대체할 수 있도록 하는 렌더 함수 타입.
// 인자: sectionKey (페이지 내 고유값), defaultText (기본 copy)
// 반환: React.ReactNode — null 이면 기본 텍스트 그대로 표시.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GuideTextRenderer = (sectionKey: string, defaultText: string) => any;

// ─── 공통 building blocks ─────────────────────────────────────────────

export interface GuideNavLink {
  label: string;
  to: string;
}

export interface GuideContextItem {
  label: string;
  value: string;
}

export interface GuideCardItem {
  label: string;
  summary: string;
}

export interface GuideRoleItem {
  label: string;
  tasks: string[];
}

export interface GuideFlowRow {
  from: string;
  mid?: string;
  to: string;
}

export interface GuideLabelDetailItem {
  label: string;
  detail: string;
}

// ─── /guide/intro ──────────────────────────────────────────────────────

export interface GuideIntroSection {
  title: string;
  href: string;
  description: string;
  items: GuideLabelDetailItem[];
}

export interface GuideIntroPageProps {
  hero: {
    eyebrow: string;          // e.g. '이용 가이드'
    title: string;            // 'O4O 개요'
    description: string;      // service-specific
    nextLink: GuideNavLink;   // '/guide/usage'
  };
  sections: GuideIntroSection[];
  bottomNav: {
    home: GuideNavLink;       // '← 홈으로'
    next: GuideNavLink;       // '서비스 활용 방법 →'
    features: GuideNavLink;   // '기능별 이용 방법'
  };
  /** WO-O4O-GUIDE-INLINE-EDIT-V1: 선택적 텍스트 렌더러. 설명 영역을 동적 콘텐츠로 대체할 때 사용 */
  renderText?: GuideTextRenderer;
}

// ─── /guide/intro/structure ────────────────────────────────────────────

export interface GuideIntroStructurePageProps {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    context: GuideContextItem[];
  };
  /** WO-O4O-GUIDE-INLINE-EDIT-V1 */
  renderText?: GuideTextRenderer;
  overview: { sectionTitle: string; cards: GuideCardItem[] };
  roleDetail: { sectionTitle: string; roles: GuideRoleItem[] };
  relations: {
    sectionTitle: string;
    transitionBefore: string;
    transitionAfter: string;
    mainFlow: string[];
    subFlow: GuideFlowRow[];
  };
  features: { sectionTitle: string; items: string[] };
  bottomNav: { prev: GuideNavLink; next: GuideNavLink };
}

// ─── /guide/intro/kpa (서비스 위치 페이지) ─────────────────────────────

export interface GuideIntroKpaPageProps {
  hero: {
    eyebrow: string;
    title: string;             // 서비스별로 다름 (KPA-Society 위치 / GlycoPharm 위치)
    description: string;
    context: GuideContextItem[];
  };
  /** WO-O4O-GUIDE-INLINE-EDIT-V1 */
  renderText?: GuideTextRenderer;
  community: { sectionTitle: string; cards: GuideCardItem[] };
  network: { sectionTitle: string; cards: GuideCardItem[] };
  storeConnection: {
    sectionTitle: string;
    transitionBefore: string;
    transitionAfter: string;
    mainFlow: string[];
    subFlow: GuideFlowRow[];
  };
  roleSummary: { sectionTitle: string; items: string[] };
  bottomNav: { prev: GuideNavLink; next: GuideNavLink };
}

// ─── /guide/intro/operation ────────────────────────────────────────────

export interface GuideIntroOperationPageProps {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    context: GuideContextItem[];
  };
  /** WO-O4O-GUIDE-INLINE-EDIT-V1 */
  renderText?: GuideTextRenderer;
  operator: { sectionTitle: string; cards: GuideCardItem[] };
  store: { sectionTitle: string; cards: GuideCardItem[] };
  community: { sectionTitle: string; cards: GuideCardItem[] };
  flow: {
    sectionTitle: string;
    mainFlow: string[];
    cycle: string[];
    subFlow: GuideFlowRow[];
  };
  features: { sectionTitle: string; items: string[] };
  bottomNav: { prev: GuideNavLink; next: GuideNavLink };
}

// ─── /guide/intro/concept ──────────────────────────────────────────────

export interface GuideCompareRow {
  label: string;
  items: string[];
  dim: boolean;
}

export interface GuideIntroConceptPageProps {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    context: GuideContextItem[];
  };
  /** WO-O4O-GUIDE-INLINE-EDIT-V1 */
  renderText?: GuideTextRenderer;
  solidarity: { sectionTitle: string; cards: GuideCardItem[] };
  structure: { sectionTitle: string; cards: GuideCardItem[] };
  info: { sectionTitle: string; cards: GuideCardItem[] };
  competition: {
    sectionTitle: string;
    rows: GuideCompareRow[];
    resultText: string;
  };
  summary: { sectionTitle: string; items: string[] };
  bottomNav: { prev: GuideNavLink; backHome: GuideNavLink };
}

// ─── /guide/usage ──────────────────────────────────────────────────────

export interface GuideUsageSection {
  step: string;            // '01'
  title: string;
  routeLabel: string;      // 표시용 라우트 라벨
  description: string;
  items: GuideLabelDetailItem[];
}

export interface GuideUsagePageProps {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    flowBarTitle: string;
    flowLabels: string[];
  };
  sections: GuideUsageSection[];
  bottomNav: {
    prev: GuideNavLink;     // '← O4O 개요'
    next: GuideNavLink;     // '기능별 이용 방법 →'
  };
  /** WO-O4O-GUIDE-INLINE-EDIT-V1: 선택적 텍스트 렌더러 */
  renderText?: GuideTextRenderer;
}

// ─── /guide/features ───────────────────────────────────────────────────

export interface GuideFeatureItem {
  label: string;
  route: string;
}

export interface GuideFeatureGroup {
  step: string;
  title: string;
  primaryRoute: string;
  description: string;
  items: GuideFeatureItem[];
  linkTo: string;
}

export interface GuideFeaturesPageProps {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    flowBarTitle: string;
    flowLabels: string[];
  };
  groups: GuideFeatureGroup[];
  bottomNav: {
    prev: GuideNavLink;     // '← 서비스 활용 방법'
    home: GuideNavLink;     // '홈으로'
  };
  /** WO-O4O-GUIDE-INLINE-EDIT-V1: 선택적 텍스트 렌더러 */
  renderText?: GuideTextRenderer;
}

// ─── /guide/features/* (개별 기능 상세 매뉴얼) ─────────────────────────

export interface GuideFeatureManualSection {
  step: string;            // '01'
  title: string;           // '포럼 이동'
  routeLabel?: string;     // 표시용 라우트 라벨 (선택)
  description: string;
  items: GuideLabelDetailItem[];
}

export interface GuideFeatureManualPageProps {
  hero: {
    eyebrow: string;                  // '기능별 이용 방법'
    title: string;                    // '포럼 이용 방법'
    description: string;
    primaryAction: GuideNavLink;      // { label: '포럼으로 이동 →', to: '/forum' }
    flowBarTitle?: string;
    flowLabels?: string[];
  };
  sections: GuideFeatureManualSection[];
  bottomNav: {
    prev: GuideNavLink;     // '← 기능별 이용 방법'
    home: GuideNavLink;
  };
  /** WO-O4O-GUIDE-INLINE-EDIT-V1: 선택적 텍스트 렌더러 */
  renderText?: GuideTextRenderer;
}
