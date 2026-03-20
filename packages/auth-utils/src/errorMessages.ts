/** 공통 로그인 에러 코드 → 사용자 메시지 매핑 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_USER: '등록되지 않은 이메일입니다.',
  INVALID_CREDENTIALS: '비밀번호가 올바르지 않습니다.',
  PASSWORD_MISMATCH: '비밀번호가 올바르지 않습니다.',
  ACCOUNT_NOT_ACTIVE: '가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다.',
  ACCOUNT_LOCKED: '로그인 시도가 너무 많아 계정이 일시적으로 잠겼습니다.',
  INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

/**
 * API 에러 응답에서 사용자 메시지 도출
 * 매핑된 코드 → 한국어 메시지, 미매핑 → 한국어 기본 메시지 (영문 fallback 방지)
 */
export function resolveAuthError(
  data: { code?: string; message?: string; error?: string },
  httpStatus: number,
  defaultMessage = '로그인에 실패했습니다.',
): string {
  if (data.code && AUTH_ERROR_MESSAGES[data.code]) {
    return AUTH_ERROR_MESSAGES[data.code];
  }
  if (httpStatus === 429) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  return defaultMessage;
}
