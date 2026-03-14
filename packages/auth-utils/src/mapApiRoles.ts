import type { RoleMap } from './types.js';
import { ROLE_PRIORITY } from './rolePriority.js';

/**
 * API roles → 서비스별 web roles 매핑
 * RBAC 우선: roles[] 배열 → role 단일 → [fallback]
 * WO-O4O-NETURE-AUTH-ROLE-REDIRECT-FIX-V1: ROLE_PRIORITY 순 정렬
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

  const mapped = rawRoles.map((r) => {
    if (roleMap[r] !== undefined) return roleMap[r];
    // Handle prefixed roles (e.g., 'glycopharm:admin' → 'admin')
    const colonIdx = r.indexOf(':');
    if (colonIdx !== -1) {
      const base = r.slice(colonIdx + 1);
      if (roleMap[base] !== undefined) return roleMap[base];
    }
    return fallback;
  });
  const unique = [...new Set(mapped)];
  // Sort by ROLE_PRIORITY so roles[0] is always the highest-priority role
  return unique.sort((a, b) => {
    const ai = ROLE_PRIORITY.indexOf(a);
    const bi = ROLE_PRIORITY.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}
