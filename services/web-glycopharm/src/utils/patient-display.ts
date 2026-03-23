/**
 * Patient Display Name Helper
 * WO-O4O-GLYCOPHARM-PATIENT-NAME-DISPLAY-FIX-V1
 *
 * 환자 이름이 없을 때 UUID/내부 ID가 화면에 노출되지 않도록
 * 안전한 대체 문구를 반환하는 공통 유틸.
 *
 * 우선순위:
 *   1. name이 유효한 문자열이면 그대로 사용
 *   2. 비어 있으면 fallback 문구 반환 (기본: '이름 미등록 당뇨인')
 */

const DEFAULT_FALLBACK = '이름 미등록 당뇨인';

/** 환자 표시 이름 반환. UUID 노출 방지. */
export function getPatientDisplayName(
  name: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK,
): string {
  if (name && name.trim().length > 0) return name;
  return fallback;
}

/** 환자 아바타 이니셜 (1글자). 이름이 없으면 '?' */
export function getPatientInitial(name: string | null | undefined): string {
  if (name && name.trim().length > 0) return name.charAt(0);
  return '?';
}
