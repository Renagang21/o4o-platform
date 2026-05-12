/**
 * KPA-Society SEO Registry
 *
 * WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1
 *
 * path → PageSeoConfig 매핑 (exact match).
 * 미등록 경로는 KPA_SEO_DEFAULTS 로 fallback.
 *
 * 유지 규칙:
 *   - 라우트 추가 시 동시 등록
 *   - 인증 필요 경로(store, mypage, operator 등)는 등록 불필요 (robots.txt Disallow 처리)
 *   - 블로그 게시물은 useBlogSeo 가 override — 이 파일에 개별 등록 불필요
 */

import type { PageSeoConfig, SeoRegistry } from '@o4o/shared-space-ui';

export const KPA_SEO_DEFAULTS: PageSeoConfig = {
  title: 'KPA Society — 약사 커뮤니티·강의·매장 지원',
  description: '약사와 약국 운영자를 위한 커뮤니티·강의·매장 지원 플랫폼입니다.',
  ogType: 'website',
};

export const kpaSeoRegistry: SeoRegistry = {
  '/': {
    title: 'KPA Society — 커뮤니티',
    description: '약사 커뮤니티. 포럼, 공지, 전문가 토론.',
    ogType: 'website',
  },
  '/forum': {
    title: '포럼 — KPA Society',
    description: '약사 전문가 토론 및 정보 공유 공간.',
    ogType: 'website',
  },
  '/forum/all': {
    title: '전체 포럼 — KPA Society',
    description: '모든 포럼 게시글 목록.',
    ogType: 'website',
  },
  '/lms': {
    title: '강의 — KPA Society',
    description: '약사를 위한 전문 교육 및 온라인 강의.',
    ogType: 'website',
  },
  '/resources': {
    title: '자료실 — KPA Society',
    description: '약국 운영에 필요한 자료 모음.',
    ogType: 'website',
  },
  '/content': {
    title: '콘텐츠 — KPA Society',
    description: '약사 커뮤니티 콘텐츠 허브.',
    ogType: 'website',
  },
  '/guide/intro': {
    title: '이용 가이드 — KPA Society',
    description: 'KPA Society 서비스 이용 안내.',
    ogType: 'website',
  },
  '/about': {
    title: 'KPA Society 소개',
    description: '대한약사회 약사 커뮤니티·매장 지원 플랫폼 소개.',
    ogType: 'website',
  },
  '/contact': {
    title: '협업과 연결 — KPA Society',
    description: 'KPA-Society 협업 및 강의 개설 안내.',
    ogType: 'website',
  },
};
