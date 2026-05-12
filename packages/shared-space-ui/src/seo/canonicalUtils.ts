/**
 * canonical 링크 DOM 조작 유틸
 *
 * WO-O4O-BLOG-SEO-JSONLD-CANONICAL-V1
 *
 * 정책:
 *   - trailing slash 제거 (루트 '/' 제외)
 *   - query string / hash 포함 금지 — 호출측에서 순수 path 전달
 *   - <link rel="canonical"> 는 페이지당 1개
 */

/** canonical URL 설정 또는 제거 */
export function setCanonical(url: string | null | undefined): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!url) {
    el?.remove();
    return;
  }
  const clean = url === '/' ? url : url.replace(/\/$/, '');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = clean;
}

/** canonical 링크 제거 (없으면 no-op) */
export function removeCanonical(): void {
  if (typeof document === 'undefined') return;
  document.head.querySelector('link[rel="canonical"]')?.remove();
}
