/**
 * 사업자번호(Business Registration Number) 정규화 및 검증 유틸리티
 *
 * WO-O4O-BUSINESS-NUMBER-NORMALIZATION-V1
 *
 * 저장 형식: 숫자 10자리 (예: "1234567890")
 * 한국 사업자번호 표준: XXX-XX-XXXXX → 10자리
 */

/**
 * 사업자번호 정규화: 하이픈/공백/점 등 비숫자 문자 제거
 *
 * "123-45-67890" → "1234567890"
 * "123 45 67890" → "1234567890"
 * "1234567890"   → "1234567890"
 */
export function normalizeBusinessNumber(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * 정규화된 사업자번호 유효성 검증 (숫자 10자리)
 */
export function isValidBusinessNumber(normalized: string): boolean {
  return /^\d{10}$/.test(normalized);
}

/**
 * 정규화 + 검증을 한 번에 수행. 유효하면 정규화된 값 반환, 아니면 null.
 */
export function parseBusinessNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = normalizeBusinessNumber(raw);
  return isValidBusinessNumber(normalized) ? normalized : null;
}
