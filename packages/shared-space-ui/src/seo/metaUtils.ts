/**
 * meta DOM 조작 공통 유틸
 *
 * WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1
 * WO-O4O-BLOG-SEO-JSONLD-CANONICAL-V1: getMeta / removeMeta 추가
 *
 * - useBlogSeo / usePageSeo 양쪽에서 재사용
 * - value 가 null/undefined/빈문자열이면 기존 태그 제거
 * - 태그가 없고 value 도 없으면 아무것도 하지 않음
 */

/** meta 태그 content 값 읽기 (없으면 null) */
export function getMeta(selector: string): string | null {
  if (typeof document === 'undefined') return null;
  return document.head.querySelector<HTMLMetaElement>(selector)?.getAttribute('content') ?? null;
}

/** meta 태그 생성/업데이트/삭제 */
export function setMeta(
  selector: string,
  attr: 'name' | 'property',
  key: string,
  value: string | null | undefined,
): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    if (!value) return;
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (!value) {
    el.remove();
    return;
  }
  el.setAttribute('content', value);
}

/** meta 태그 제거 (존재하지 않으면 no-op) */
export function removeMeta(selector: string): void {
  if (typeof document === 'undefined') return;
  document.head.querySelector(selector)?.remove();
}
