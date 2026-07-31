/**
 * Admin User Response Sanitizer
 *
 * WO-O4O-ADMIN-USER-LIST-SENSITIVE-FIELD-EXPOSURE-FIX-V1
 *
 * `AdminUserController` 의 응답은 User 엔티티를 spread 하면서 `password` 만 제거했다.
 * 그 결과 `refreshTokenFamily`(refresh token 회전 식별자) 등 인증 관련 내부 필드가
 * 관리자 목록·단건 응답에 그대로 실려 나갔다.
 *
 * 이 모듈은 **관리자 조회 응답 전용** 블랙리스트다.
 * 값을 가리는 것이 아니라 **key 자체를 제거**하며, 입력 객체는 변형하지 않는다(shallow copy).
 *
 * ── 왜 lms/utils/sanitize-user.ts 를 재사용하지 않는가 ────────────────────────
 * 그 sanitizer 는 포럼·LMS 등 **공개 표시 맥락**용이라 `businessInfo` · `lastLoginAt` ·
 * `approvedAt/By` · `loginAttempts` · `lockedUntil` 까지 제거한다.
 * 관리자 화면은 이 값들을 실제로 쓴다(`ActiveUsers.tsx` 의 lastLoginAt 컬럼,
 * `BusinessInfoSection.tsx` 의 businessInfo). 그대로 가져오면 관리자 기능이 깨진다.
 * 따라서 맥락이 다른 별도 목록을 두고, 각 목록의 근거를 아래에 남긴다.
 */

/**
 * 관리자 응답에서 절대 반환하지 않는 필드.
 *
 * | 필드 | 근거 |
 * |------|------|
 * | `password`              | bcrypt 해시 (기존에도 제거하던 값) |
 * | `refreshTokenFamily`    | refresh token 회전 식별자 — 인증 내부 상태 |
 * | `resetPasswordToken`    | 비밀번호 재설정 토큰 — 노출 시 계정 탈취 가능 |
 * | `resetPasswordExpires`  | 위 토큰의 유효기간 (동반 값) |
 *
 * 아래는 **의도적으로 유지**한다 — 관리자 기능이 사용하거나 보안 토큰이 아니다:
 *   lastLoginAt / lastLoginIp (감사) · loginAttempts / lockedUntil (잠금 상태 관리) ·
 *   businessInfo (사업자 정보 화면) · provider / provider_id (소셜 계정 식별자, 비밀값 아님) ·
 *   approvedAt / approvedBy (승인 이력)
 */
export const ADMIN_USER_SENSITIVE_FIELDS = [
  'password',
  'refreshTokenFamily',
  'resetPasswordToken',
  'resetPasswordExpires',
] as const;

export type AdminUserSensitiveField = (typeof ADMIN_USER_SENSITIVE_FIELDS)[number];

/**
 * 사용자 1건에서 민감 필드 key 를 제거한 **새 객체**를 돌려준다.
 * 값이 `null`/`undefined` 여도 key 자체를 남기지 않는다.
 * 입력 객체는 변형하지 않는다.
 */
export function sanitizeAdminUser<T extends Record<string, any>>(user: T): Omit<T, AdminUserSensitiveField> {
  const sanitized: Record<string, any> = { ...user };
  for (const field of ADMIN_USER_SENSITIVE_FIELDS) {
    delete sanitized[field];
  }
  return sanitized as Omit<T, AdminUserSensitiveField>;
}

/** 목록용 — 각 항목에 `sanitizeAdminUser` 를 적용한 새 배열을 돌려준다. */
export function sanitizeAdminUsers<T extends Record<string, any>>(
  users: readonly T[],
): Array<Omit<T, AdminUserSensitiveField>> {
  return users.map((u) => sanitizeAdminUser(u));
}
