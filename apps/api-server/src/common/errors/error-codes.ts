/**
 * O4O Platform — Standardized Error Codes
 *
 * WO-O4O-ERROR-CODE-STANDARDIZATION-V1
 *
 * 공통 에러 코드 상수. Global Error Handler에서 자동 매핑에 사용.
 * 기존 코드의 errorCode가 있으면 그대로 유지, 없으면 HTTP status 기반 매핑.
 */

export const ERROR_CODES = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // 공통
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',

  // 인증/권한
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 비즈니스
  BUSINESS_ERROR: 'BUSINESS_ERROR',
  CONFLICT: 'CONFLICT',

  // 외부
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
