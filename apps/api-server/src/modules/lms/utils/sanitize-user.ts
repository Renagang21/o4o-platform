/**
 * WO-KPA-LMS-INSTRUCTOR-RESPONSE-SANITIZATION-V1
 *
 * Sanitization utilities for User entities loaded via TypeORM relations.
 * Prevents password hash and other sensitive fields from leaking to API responses.
 *
 * Two strategies:
 * - sanitizeInstructor(): whitelist — only public profile fields (course.instructor)
 * - sanitizeUserFields(): blacklist — strip known sensitive fields (enrollment.user, certificate.user)
 */

/** Whitelist: instructor → only public profile fields */
export function sanitizeInstructor(user: any): Record<string, any> | null {
  if (!user || typeof user !== 'object') return null;
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname ?? null,
    avatar: user.avatar ?? null,
  };
}

/** Fields that must never appear in API responses */
const SENSITIVE_USER_FIELDS = [
  'password',
  'refreshTokenFamily',
  'resetPasswordToken',
  'resetPasswordExpires',
  'loginAttempts',
  'lockedUntil',
  'lastLoginIp',
  'provider',
  'provider_id',
] as const;

/** Blacklist: generic user → strip known sensitive fields (returns shallow copy) */
export function sanitizeUserFields(user: any): any {
  if (!user || typeof user !== 'object') return user;
  const sanitized = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) {
    delete sanitized[field];
  }
  return sanitized;
}
