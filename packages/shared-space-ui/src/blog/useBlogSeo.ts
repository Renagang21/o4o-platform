/**
 * useBlogSeo — 블로그/콘텐츠 상세 페이지 SEO override hook
 *
 * WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1
 * WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1: setMeta 공통 유틸로 교체
 * WO-O4O-BLOG-SEO-JSONLD-CANONICAL-V1:
 *   - cleanup (unmount 시 이전 meta 복원 + canonical/twitter/JSON-LD 제거)
 *   - canonical 링크 강화
 *   - twitter:* 추가
 *   - JSON-LD Article 추가
 *   - author / publishedAt / modifiedAt 필드 추가
 *
 * 동작 구조:
 *   1. 마운트 시 현재 meta 상태를 캡처 (SeoWatcher 가 이미 registry 값 적용 후)
 *   2. 포스트 데이터로 meta override (title, og:*, twitter:*, canonical, JSON-LD)
 *   3. 언마운트 시 canonical / twitter:* / JSON-LD 제거 + 기본 meta 복원
 *      → 다음 페이지에서 SeoWatcher 가 pathname 기반 재적용
 *
 * Helmet 미사용: 현재 repo canonical pattern — imperative useEffect
 */

import { useEffect } from 'react';
import { getMeta, setMeta, removeMeta } from '../seo/metaUtils';
import { setCanonical, removeCanonical } from '../seo/canonicalUtils';
import { insertJsonLd, removeJsonLd, buildArticleJsonLd } from '../seo/jsonLdUtils';

export interface BlogSeoOptions {
  title: string | null;
  description?: string | null;
  ogImage?: string | null;
  url?: string | null;
  /** JSON-LD author (매장명 또는 저자명) */
  author?: string | null;
  /** ISO 8601 날짜 — Article.datePublished */
  publishedAt?: string | null;
  /** ISO 8601 날짜 — Article.dateModified */
  modifiedAt?: string | null;
}

export function useBlogSeo({
  title,
  description,
  ogImage,
  url,
  author,
  publishedAt,
  modifiedAt,
}: BlogSeoOptions): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // ── 1. 현재 상태 캡처 (cleanup 복원용) ──────────────────────────────
    const prevTitle = document.title;
    const prevDescription = getMeta('meta[name="description"]');
    const prevOgTitle = getMeta('meta[property="og:title"]');
    const prevOgDescription = getMeta('meta[property="og:description"]');
    const prevOgUrl = getMeta('meta[property="og:url"]');
    const prevOgType = getMeta('meta[property="og:type"]');

    // ── 2. 기본 meta 적용 ────────────────────────────────────────────────
    if (title) document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description ?? null);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title ?? null);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description ?? null);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'article');
    setMeta('meta[property="og:image"]', 'property', 'og:image', ogImage ?? null);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url ?? null);

    // ── 3. twitter:* ─────────────────────────────────────────────────────
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title ?? null);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description ?? null);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage ?? null);

    // ── 4. canonical ──────────────────────────────────────────────────────
    setCanonical(url ?? null);

    // ── 5. JSON-LD Article ────────────────────────────────────────────────
    const jsonLd = buildArticleJsonLd({ title, description, url, image: ogImage, author, publishedAt, modifiedAt });
    insertJsonLd('blog-article', jsonLd);

    // ── cleanup: unmount 또는 deps 변경 시 ───────────────────────────────
    return () => {
      // 기본 meta 복원 (SeoWatcher 가 다음 pathname에서 재적용)
      document.title = prevTitle;
      setMeta('meta[name="description"]', 'name', 'description', prevDescription);
      setMeta('meta[property="og:title"]', 'property', 'og:title', prevOgTitle);
      setMeta('meta[property="og:description"]', 'property', 'og:description', prevOgDescription);
      setMeta('meta[property="og:url"]', 'property', 'og:url', prevOgUrl);
      setMeta('meta[property="og:type"]', 'property', 'og:type', prevOgType);

      // 블로그 전용 태그 제거 (SeoWatcher 가 설정하지 않으므로 직접 정리)
      removeCanonical();
      removeMeta('meta[name="twitter:card"]');
      removeMeta('meta[name="twitter:title"]');
      removeMeta('meta[name="twitter:description"]');
      removeMeta('meta[name="twitter:image"]');
      removeJsonLd('blog-article');
    };
  }, [title, description, ogImage, url, author, publishedAt, modifiedAt]);
}
