/**
 * setMeta — DOM meta 태그 조작 공통 유틸
 *
 * WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1
 *
 * - useBlogSeo / usePageSeo 양쪽에서 재사용
 * - value 가 null/undefined/빈문자열이면 기존 태그 제거
 * - 태그가 없고 value 도 없으면 아무것도 하지 않음
 */

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
