/** 공통 로그인 에러 코드 → 사용자 메시지 매핑 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_USER: '등록되지 않은 이메일입니다.',
  INVALID_CREDENTIALS: '비밀번호가 올바르지 않습니다.',
  // WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1:
  //   `pending` 은 제한 로그인(WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1)으로 **성공**하므로
  //   이 코드는 더 이상 "승인 대기" 를 뜻하지 않는다. 상태 미상일 때의 중립 fallback 만 둔다.
  //   구체 상태(rejected / suspended / inactive)는 아래 ACCOUNT_STATUS_MESSAGES 가 담당한다.
  ACCOUNT_NOT_ACTIVE: '현재 로그인할 수 없는 계정 상태입니다. 운영자에게 문의해 주세요.',
  ACCOUNT_LOCKED: '로그인 시도가 너무 많아 계정이 일시적으로 잠겼습니다.',
  // WO-O4O-LOGIN-SERVICE-NOT-MEMBER-UX-V1:
  //   서비스별 LoginPage/LoginModal 이 자체 안내(서비스명/신청 링크)를 추가로 노출하므로
  //   여기서는 비밀번호 오류와 명확히 구분되는 generic fallback 만 제공한다.
  SERVICE_NOT_MEMBER: '이 서비스에 가입되어 있지 않습니다. 가입 또는 이용 신청 후 로그인할 수 있습니다.',
  INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

/**
 * 로그인 차단 응답의 `accountStatus` → 사용자 메시지.
 *
 * WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1
 *
 * 서버(`POST /auth/login` 403)가 `code: 'ACCOUNT_NOT_ACTIVE'` 를 유지한 채
 * 화이트리스트된 상태 라벨만 함께 내려준다. 문구 선택은 **여기 공통 계층에서만** 한다 —
 * 서비스별 문자열 분기를 만들지 않는다.
 *
 * 제품에 반려 재신청 경로가 없으므로 존재하지 않는 버튼·링크를 안내하지 않고
 * 실제로 가능한 행동(운영자 문의)만 제시한다.
 */
export const ACCOUNT_STATUS_MESSAGES: Record<string, string> = {
  rejected: '가입 신청이 반려된 계정입니다. 사유 확인과 재신청 가능 여부는 운영자에게 문의해 주세요.',
  suspended: '이용이 정지된 계정입니다. 운영자에게 문의해 주세요.',
  inactive: '비활성화된 계정입니다. 운영자에게 문의해 주세요.',
};

/**
 * API 에러 응답에서 사용자 메시지 도출
 * 매핑된 코드 → 한국어 메시지, 미매핑 → 한국어 기본 메시지 (영문 fallback 방지)
 */
export function resolveAuthError(
  data: { code?: string; message?: string; error?: string; accountStatus?: string },
  httpStatus: number,
  defaultMessage = '로그인에 실패했습니다.',
): string {
  // 상태 라벨이 있으면 코드보다 우선한다(같은 code 안에서 더 정확한 안내).
  if (data.accountStatus && ACCOUNT_STATUS_MESSAGES[data.accountStatus]) {
    return ACCOUNT_STATUS_MESSAGES[data.accountStatus];
  }
  if (data.code && AUTH_ERROR_MESSAGES[data.code]) {
    return AUTH_ERROR_MESSAGES[data.code];
  }
  if (httpStatus === 429) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  return defaultMessage;
}
