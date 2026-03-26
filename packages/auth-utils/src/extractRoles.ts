/**
 * extractRoles — JWT API 응답에서 roles 배열 추출
 *
 * WO-O4O-AUTH-FLOW-SIMPLIFICATION-V1
 * 4개 서비스 AuthContext에서 동일 로직이 반복되던 것을 공유 유틸리티로 통합.
 *
 * @param apiUser  API 응답 user 객체
 * @param fallback roles가 비어있을 때 fallback (기본: ['user'])
 */
export function extractRoles(
  apiUser: { roles?: string[]; role?: string },
  fallback: string[] = ['user'],
): string[] {
  if (Array.isArray(apiUser.roles) && apiUser.roles.length > 0) {
    return apiUser.roles;
  }
  if (apiUser.role) {
    return [apiUser.role];
  }
  return fallback;
}
