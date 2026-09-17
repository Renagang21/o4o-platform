/**
 * Neture SEO Registry
 *
 * WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1
 *
 * path → PageSeoConfig 매핑 (exact match).
 * 미등록 경로는 `resolveNetureSeoDefaults(pathname)` 가 돌려주는 surface 별 기본값으로 fallback.
 *
 * 유지 규칙:
 *   - 라우트 추가 시 동시 등록
 *   - 인증 필요 경로(supplier/dashboard, mypage 등)는 등록 불필요 — surface 기본값이 덮는다
 *
 * WO-O4O-NETURE-O4O-BRAND-HEADER-SEO-ALIGNMENT-V1 — 브랜드 정체성 계약:
 *   - `neture.co.kr` 대표 홈(`/`) 과 미등록 공개 경로의 정체성은 **O4O** (대표 title = index.html 정적 title).
 *   - Supplier Workspace(`/supplier/*`) · Service Operator(`/operator/*`) 는 **Neture** 서비스 surface —
 *     O4O 대표 title 로 덮지 않고, 옛 정체성 "유통·협업 플랫폼" 도 쓰지 않는다.
 *   - Platform Admin(`/admin/*`) 은 서비스가 아니라 O4O 내부 관리 영역.
 *   - Legacy Partner 은퇴(2026-09-15) — "공급자·파트너 협업 플랫폼" 문구는 현행 UI 에 남기지 않는다.
 */

import type { PageSeoConfig, SeoRegistry } from '@o4o/shared-space-ui';

/** O4O 대표 문구 — index.html 정적 title / description 과 같은 값 */
export const O4O_BRAND_TITLE = 'O4O — 소규모 사업자를 위한 통합 업무 공간';
export const O4O_BRAND_DESCRIPTION = '소규모 사업자를 위한 O4O(Online for Offline) 통합 업무 공간입니다.';

/** 미등록 경로의 기본 메타 (O4O 대표) */
export const NETURE_SEO_DEFAULTS: PageSeoConfig = {
  title: O4O_BRAND_TITLE,
  description: O4O_BRAND_DESCRIPTION,
  ogType: 'website',
};

/** Supplier Workspace — Neture 공급자 서비스 surface (인증 경로 · 개별 등록 불필요) */
export const NETURE_SUPPLIER_SEO_DEFAULTS: PageSeoConfig = {
  title: '공급자 업무 공간 — Neture',
  description: 'O4O 공급자 서비스 Neture 의 공급자 업무 공간 — 상품 · 주문 · 콘텐츠.',
  ogType: 'website',
};

/** Service Operator Workspace — Neture 서비스 운영 surface */
export const NETURE_OPERATOR_SEO_DEFAULTS: PageSeoConfig = {
  title: '서비스 운영 — Neture',
  description: 'O4O 공급자 서비스 Neture 의 서비스 운영 업무 공간.',
  ogType: 'website',
};

/** Platform Admin — O4O 내부 관리 영역 (서비스 surface 아님) */
export const O4O_ADMIN_SEO_DEFAULTS: PageSeoConfig = {
  title: '플랫폼 관리 — O4O',
  description: 'O4O 플랫폼 관리.',
  ogType: 'website',
};

/**
 * 미등록 경로의 surface 별 fallback. 같은 surface 안에서는 항상 같은 객체를 돌려준다
 * (`usePageSeo` 의 effect deps 안정성).
 */
export function resolveNetureSeoDefaults(pathname: string): PageSeoConfig {
  if (pathname === '/supplier' || pathname.startsWith('/supplier/')) return NETURE_SUPPLIER_SEO_DEFAULTS;
  if (pathname === '/operator' || pathname.startsWith('/operator/')) return NETURE_OPERATOR_SEO_DEFAULTS;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return O4O_ADMIN_SEO_DEFAULTS;
  return NETURE_SEO_DEFAULTS;
}

export const netureSeoRegistry: SeoRegistry = {
  // WO-O4O-COMMON-HOME-PHASE1-V1: `/` 는 O4O 전체 서비스 대표 진입점.
  //   아직 구현되지 않은 기능(AI 자동업무 · Local Work Agent 등)은 표기하지 않는다.
  //   WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1: 대표 홈 정체성은 O4O (index.html 정적 title · og 와 동일 문구).
  '/': {
    title: O4O_BRAND_TITLE,
    description: O4O_BRAND_DESCRIPTION,
    ogType: 'website',
  },
  // 기존 `/` 의 Neture 커뮤니티 홈은 이동한 경로로 유지한다 — Neture 서비스 surface (catalog: O4O 공급자 서비스).
  '/community': {
    title: 'Neture — O4O 공급자 서비스',
    description: 'O4O 공급자 서비스 Neture 의 커뮤니티 홈 — 공급자 · 운영자 · 매장이 정보와 경험을 나눕니다.',
    ogType: 'website',
  },
  '/market-trial': {
    title: '유통참여형 펀딩 — Neture',
    description: '공급자와 매장이 함께하는 유통참여형 펀딩.',
    ogType: 'website',
  },
  '/supplier': {
    title: 'Supplier — Neture',
    description: 'Neture 공급자 참여 안내. O4O 유통망 진입 안내.',
    ogType: 'website',
  },
  '/forum': {
    title: '포럼 — Neture',
    description: 'O4O 개념과 네뚜레 구조에 대한 토론 공간.',
    ogType: 'website',
  },
  '/guide': {
    title: '이용 안내 — Neture',
    description: '공급자 · 유통참여형 펀딩 · O4O 플랫폼 소개 · 기능별 이용 방법 안내.',
    ogType: 'website',
  },
  '/guide/intro': {
    title: '네뚜레 소개 — 이용 안내',
    description: '네뚜레 플랫폼 구조와 O4O 개념 소개.',
    ogType: 'website',
  },
  '/guide/features/market-trial': {
    title: '유통참여형 펀딩 이용 방법 — Neture',
    description: '제품 정산을 통해 초기 매장 랜딩을 만드는 참여형 유통 프로그램. 공급자·참여 매장·운영자 관점과 참여 절차, 자주 묻는 질문을 안내합니다.',
    ogType: 'article',
  },
  '/contact': {
    title: '연락처 — Neture',
    description: '네뚜레 문의 및 연락처.',
    ogType: 'website',
  },
};
