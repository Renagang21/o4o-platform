/**
 * 공급자가 입력한 외부 URL 검증 — 절대 http(s) URL 만 허용한다.
 *
 * 공급자 이미지 URL 등록(product_images · 다른 공급자 · 매장에도 노출)과 자료함 fileUrl
 * (비로그인 공개 조회 · CMS 전달)에 `javascript:` · `data:` 등 스킴이 저장되지 않게 한다.
 * 기준은 신규 제품 검토 요청(Candidate) 이미지 URL 과 같다(supplier-single-candidate.mapper isHttpUrl).
 */
export const SUPPLIER_URL_MAX_LENGTH = 2048;

export function isSupplierHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s || s.length > SUPPLIER_URL_MAX_LENGTH) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
