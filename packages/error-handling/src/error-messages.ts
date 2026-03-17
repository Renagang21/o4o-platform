/**
 * ErrorCode → Korean User Message Mapping
 *
 * WO-O4O-FRONTEND-ERROR-HANDLING-STANDARDIZATION
 *
 * Covers all backend ErrorCode values from:
 * - apps/api-server/src/common/errors/index.ts (ErrorCode)
 * - packages/types/src/auth/index.ts (AUTH_ERROR_CODES)
 * - packages/types/src/api.ts (API_ERROR_CODES)
 */

/** Complete Korean error message map */
export const ERROR_MESSAGES: Record<string, string> = {
  // ─── Auth / Token (401) ────────────────────────────────────────────────
  AUTH_REQUIRED: '로그인이 필요합니다.',
  INVALID_TOKEN: '인증 토큰이 유효하지 않습니다. 다시 로그인해주세요.',
  TOKEN_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
  INVALID_CREDENTIALS: '비밀번호가 올바르지 않습니다.',
  INVALID_USER: '등록되지 않은 이메일입니다.',
  USER_INACTIVE: '계정이 비활성 상태입니다.',
  INVALID_REFRESH_TOKEN: '세션을 갱신할 수 없습니다. 다시 로그인해주세요.',
  NO_REFRESH_TOKEN: '로그인 정보가 없습니다. 다시 로그인해주세요.',
  SOCIAL_LOGIN_REQUIRED: '소셜 로그인으로 가입된 계정입니다.',

  // ─── Authorization (403) ───────────────────────────────────────────────
  FORBIDDEN: '접근 권한이 없습니다.',
  ROLE_REQUIRED: '해당 기능을 사용할 권한이 없습니다.',
  PERMISSION_DENIED: '접근이 거부되었습니다.',
  MEMBERSHIP_NOT_FOUND: '서비스 멤버십이 필요합니다.',
  MEMBERSHIP_NOT_ACTIVE: '멤버십이 활성 상태가 아닙니다.',
  SERVICE_TOKEN_NOT_ALLOWED: '해당 서비스 토큰으로는 접근할 수 없습니다.',
  PLATFORM_TOKEN_NOT_ALLOWED: '플랫폼 토큰으로는 접근할 수 없습니다.',
  GUEST_TOKEN_REQUIRED: '게스트 토큰이 필요합니다.',
  ACCOUNT_NOT_ACTIVE: '가입 승인 대기 중입니다. 운영자 승인 후 이용 가능합니다.',
  ACCOUNT_LOCKED: '로그인 시도가 너무 많아 계정이 일시적으로 잠겼습니다.',
  ACCOUNT_SUSPENDED: '계정이 정지되었습니다. 관리자에게 문의하세요.',
  EMAIL_NOT_VERIFIED: '이메일 인증이 필요합니다.',

  // ─── Validation (400) ──────────────────────────────────────────────────
  VALIDATION_ERROR: '입력 정보를 확인해주세요.',
  BAD_REQUEST: '잘못된 요청입니다.',
  INVALID_REQUEST: '잘못된 요청입니다.',
  MISSING_REQUIRED_FIELD: '필수 항목을 입력해주세요.',
  INVALID_FORMAT: '입력 형식이 올바르지 않습니다.',
  EMAIL_EXISTS: '이미 가입된 이메일입니다.',
  PASSWORD_VALIDATION_FAILED: '비밀번호 형식이 올바르지 않습니다.',
  INVALID_RESET_TOKEN: '비밀번호 재설정 링크가 만료되었습니다.',
  INVALID_VERIFICATION_TOKEN: '인증 링크가 만료되었습니다.',

  // ─── Not Found (404) ───────────────────────────────────────────────────
  NOT_FOUND: '요청한 정보를 찾을 수 없습니다.',
  RESOURCE_NOT_FOUND: '요청한 정보를 찾을 수 없습니다.',
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',

  // ─── Conflict (409) ────────────────────────────────────────────────────
  CONFLICT: '이미 처리된 요청입니다.',
  ALREADY_EXISTS: '이미 존재합니다.',
  DUPLICATE_ENTRY: '중복된 항목입니다.',

  // ─── Rate Limit (429) ──────────────────────────────────────────────────
  RATE_LIMITED: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  TOO_MANY_ATTEMPTS: '시도 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.',

  // ─── Server (500+) ────────────────────────────────────────────────────
  INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  SERVICE_UNAVAILABLE: '서비스를 일시적으로 사용할 수 없습니다.',
  DATABASE_ERROR: '데이터 처리 중 오류가 발생했습니다.',
  QUERY_FAILED: '데이터 조회에 실패했습니다.',

  // ─── External ──────────────────────────────────────────────────────────
  EXTERNAL_SERVICE_ERROR: '외부 서비스 연결에 실패했습니다.',
  PAYMENT_FAILED: '결제 처리에 실패했습니다.',
  EMAIL_SEND_FAILED: '이메일 전송에 실패했습니다.',

  // ─── File/Upload ───────────────────────────────────────────────────────
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다.',
  INVALID_FILE_TYPE: '지원하지 않는 파일 형식입니다.',
  UPLOAD_FAILED: '파일 업로드에 실패했습니다.',

  // ─── Frontend-specific ────────────────────────────────────────────────
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  TIMEOUT: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
  UNKNOWN: '알 수 없는 오류가 발생했습니다.',
};

/**
 * Get user-friendly Korean message for an error code.
 * Falls back to the raw message or a generic message.
 */
export function getErrorMessage(code: string | null | undefined, fallback?: string): string {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  return fallback || ERROR_MESSAGES.UNKNOWN;
}
