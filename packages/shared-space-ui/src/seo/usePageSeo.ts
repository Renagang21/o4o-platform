/**
 * usePageSeo — registry 기반 페이지 SEO hook
 *
 * WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1
 *
 * 사용 목적:
 *   - 브라우저 탭 title / SNS 미리보기(og:*) / 기본 검색 보조 용도
 *   - Google 크롤러 완전 대응 아님 (CSR SPA 한계 — Phase 5 SSG 검토 시 대체)
 *
 * 동작:
 *   - pathname 변경 시 registry 에서 exact match 조회
 *   - 매칭 없으면 defaults 적용 (서비스 대표 메타)
 *   - 블로그 게시물 등 페이지 레벨 훅(useBlogSeo)이 이후 override — React child 효과 순서 보장
 *
 * 주의:
 *   - og:url 은 건드리지 않음 (index.html 정적 값 유지)
 *   - noIndex 는 robots.txt 에서 처리 — 훅 범위 밖
 */

import { useEffect } from 'react';
import type { SeoRegistry, PageSeoConfig } from './types';
import { setMeta } from './metaUtils';

interface UsePageSeoOptions {
  registry: SeoRegistry;
  pathname: string;
  defaults: PageSeoConfig;
}

export function usePageSeo({ registry, pathname, defaults }: UsePageSeoOptions): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const config = registry[pathname] ?? defaults;
    document.title = config.title;
    setMeta('meta[name="description"]', 'name', 'description', config.description ?? null);
    setMeta('meta[property="og:title"]', 'property', 'og:title', config.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', config.description ?? null);
    setMeta('meta[property="og:type"]', 'property', 'og:type', config.ogType ?? 'website');
    setMeta('meta[property="og:image"]', 'property', 'og:image', config.ogImage ?? null);
  }, [registry, pathname, defaults]);
}
