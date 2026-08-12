/**
 * API 오류 메시지 정규화
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 실패를 빈 상태로 삼키지 않는다. 특히 403(BRANCH_SCOPE_MISMATCH)은
 * "다른 분회 화면에 들어왔다"는 뜻이므로 감추지 않고 그대로 알린다.
 */
export function describeApiError(e: unknown): string {
  const res = (e as { response?: { status?: number; data?: { error?: string; code?: string } } })?.response;
  if (res?.status === 401) return '로그인이 필요합니다.';
  if (res?.status === 403) return res.data?.error ?? '이 분회에 대한 권한이 없습니다.';
  if (res?.status === 404) return res.data?.error ?? '대상을 찾을 수 없습니다.';
  return res?.data?.error ?? '요청을 처리하지 못했습니다.';
}
