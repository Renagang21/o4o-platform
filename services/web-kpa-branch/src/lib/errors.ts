/**
 * API 오류 메시지 정규화
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 실패를 빈 상태로 삼키지 않는다. 특히 403(BRANCH_SCOPE_MISMATCH)은
 * "다른 분회 화면에 들어왔다"는 뜻이므로 감추지 않고 그대로 알린다.
 *
 * WO-O4O-KPA-BRANCH-OPERATOR-FORBIDDEN-WHITE-SCREEN-CLOSURE-V1:
 *   API error 본문은 두 shape 가 공존한다.
 *     - 문자열형 `{ error: string, code }`            — kpa-branch 자체 guard(requireBranchScope 등)·라우트 핸들러
 *     - 객체형   `{ error: { code, message } }`       — security-core scope guard(운영자 role 없음 403)·global error handler
 *   객체형 `error` 를 그대로 React child 로 넘기면 React #31 로 화면 전체가 비었다.
 *   여기서 항상 string 으로 정규화한다 — 호출부는 반환값을 그대로 렌더해도 안전하다.
 *   서버 guard 와 403 semantics 는 바꾸지 않는다.
 */

type ApiErrorBody = {
  error?: unknown;
  code?: unknown;
  message?: unknown;
};

/** `error` 필드(문자열 / `{code,message}` 객체 / 그 외)를 사용자 안내 문자열로 내린다. 없으면 null. */
function errorText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as ApiErrorBody;
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  if (body.error && typeof body.error === 'object') {
    const msg = (body.error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    return null;
  }
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  return null;
}

export function describeApiError(e: unknown): string {
  const res = (e as { response?: { status?: number; data?: unknown } })?.response;
  const text = errorText(res?.data);
  if (res?.status === 401) return '로그인이 필요합니다.';
  if (res?.status === 403) {
    // 객체형 403 은 scope guard 내부 문구("Required scope: …")라 그대로 보여주지 않는다.
    // 문자열형 403(BRANCH_SCOPE_MISMATCH 등)은 기존 계약대로 그대로 알린다.
    const bodyError = (res.data as ApiErrorBody | undefined)?.error;
    return typeof bodyError === 'string' && bodyError.trim() ? bodyError : '이 분회에 대한 권한이 없습니다.';
  }
  if (res?.status === 404) return text ?? '대상을 찾을 수 없습니다.';
  return text ?? '요청을 처리하지 못했습니다.';
}
