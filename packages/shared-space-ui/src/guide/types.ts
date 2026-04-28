/**
 * Guide Types
 *
 * WO-O4O-GUIDE-COMMON-AND-GLYCOPHARM-HOME-V1
 *
 * Shared Guide 페이지 7개의 prop 데이터 타입 정의.
 * 서비스(KPA / GlycoPharm)별 copy 파일이 이 타입을 따라 데이터를 제공한다.
 */

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
}

// ─── /guide/intro/structure ────────────────────────────────────────────

export interface GuideIntroStructurePageProps {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    context: GuideContextItem[];
  };
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
}
