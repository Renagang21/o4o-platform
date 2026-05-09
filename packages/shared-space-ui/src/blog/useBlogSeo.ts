/**
 * useBlogSeo — Public Blog SEO meta hook
 *
 * WO-O4O-KPA-STORE-BLOG-PUBLIC-HEADER-V1
 *
 * - document.title 설정
 * - <meta name="description">, og:title, og:description, og:image, og:url 동기화
 * - Helmet 미사용 (현재 repo canonical pattern: imperative useEffect — 예: QrLandingPage.tsx)
 * - cleanup 시 이전 값 복원하지 않음 (SPA 전환 시 다음 페이지가 재설정)
 */

import { useEffect } from 'react';

interface BlogSeoOptions {
  title: string | null;
  description?: string | null;
  ogImage?: string | null;
  url?: string | null;
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, value: string | null) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    if (!value) return;
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (value === null || value === '') {
    el.remove();
    return;
  }
  el.setAttribute('content', value);
}

export function useBlogSeo({ title, description, ogImage, url }: BlogSeoOptions): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (title) document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description ?? null);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title ?? null);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description ?? null);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'article');
    setMeta('meta[property="og:image"]', 'property', 'og:image', ogImage ?? null);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url ?? null);
  }, [title, description, ogImage, url]);
}
