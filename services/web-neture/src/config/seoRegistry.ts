/**
 * Neture SEO Registry
 *
 * WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1
 *
 * path → PageSeoConfig 매핑 (exact match).
 * 미등록 경로는 NETURE_SEO_DEFAULTS 로 fallback.
 *
 * 유지 규칙:
 *   - 라우트 추가 시 동시 등록
 *   - 인증 필요 경로(supplier/dashboard, partner/dashboard, mypage 등)는 등록 불필요
 */

import type { PageSeoConfig, SeoRegistry } from '@o4o/shared-space-ui';

export const NETURE_SEO_DEFAULTS: PageSeoConfig = {
  title: 'Neture — O4O 유통·협업 플랫폼',
  description: '공급자와 매장을 연결하는 O4O 유통·협업 플랫폼입니다.',
  ogType: 'website',
};

export const netureSeoRegistry: SeoRegistry = {
  '/': {
    title: 'Neture — O4O 유통·협업 플랫폼',
    description: '공급자와 매장을 연결하는 O4O 유통·협업 플랫폼입니다.',
    ogType: 'website',
  },
  '/market-trial': {
    title: '유통참여형 펀딩 — Neture',
    description: '공급자와 매장이 함께하는 유통참여형 펀딩.',
    ogType: 'website',
  },
  '/supplier': {
    title: 'Supplier — Neture',
    description: '네뚜레 공급자 파트너십. O4O 유통망 진입 안내.',
    ogType: 'website',
  },
  '/partner': {
    title: 'Partner — Neture',
    description: '네뚜레 파트너 프로그램. 매장과 협업하는 유통 구조.',
    ogType: 'website',
  },
  '/forum': {
    title: '포럼 — Neture',
    description: 'O4O 개념과 네뚜레 구조에 대한 토론 공간.',
    ogType: 'website',
  },
  '/guide': {
    title: '이용 안내 — Neture',
    description: '공급자 · 파트너 · 유통참여형 펀딩 · O4O 플랫폼 소개 · 기능별 이용 방법 안내.',
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
  '/o4o': {
    title: 'O4O 플랫폼 소개 — Neture',
    description: 'O4O(Online for Offline) 플랫폼의 개념과 네뚜레의 역할.',
    ogType: 'website',
  },
  '/contact': {
    title: '연락처 — Neture',
    description: '네뚜레 문의 및 연락처.',
    ogType: 'website',
  },
};
