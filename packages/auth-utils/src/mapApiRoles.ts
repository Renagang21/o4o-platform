import type { RoleMap } from './types.js';

/**
 * API roles → 서비스별 web roles 매핑
 * RBAC 우선: roles[] 배열 → role 단일 → [fallback]
 */
export function mapApiRoles<R extends string>(
  apiUser: { roles?: string[]; role?: string },
  roleMap: RoleMap<R>,
  fallback: R,
): R[] {
  const rawRoles: string[] =
    Array.isArray(apiUser.roles) && apiUser.roles.length > 0
      ? apiUser.roles
      : apiUser.role
        ? [apiUser.role]
        : [];

  if (rawRoles.length === 0) return [fallback];

  const mapped = rawRoles.map((r) => roleMap[r] ?? fallback);
  return [...new Set(mapped)];
}
