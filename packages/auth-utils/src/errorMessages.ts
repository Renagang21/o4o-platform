/** 공통 로그인 에러 코드 → 사용자 메시지 매핑 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_USER: '등록되지 않은 이메일입니다.',
  INVALID_CREDENTIALS: '비밀번호가 올바르지 않습니다.',
  ACCOUNT_NOT_ACTIVE: '가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다.',
  ACCOUNT_LOCKED: '로그인 시도가 너무 많아 계정이 일시적으로 잠겼습니다.',
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1:
  //   서비스별 LoginPage/LoginModal 이 자체 안내(서비스명/신청 링크)를 추가로 노출하므로
  //   여기서는 비밀번호 오류와 명확히 구분되는 generic fallback 만 제공한다.
  SERVICE_NOT_MEMBER: '이 서비스에 가입되어 있지 않습니다. 가입 또는 이용 신청 후 로그인할 수 있습니다.',
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
