/**
 * Role Allowlist — ROLE_REGISTRY 기반
 * WO-O4O-ROLE-ALLOWLIST-V1
 *
 * @deprecated WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1: DB 기반 roleService.isValidRole()로 대체
 * MembershipConsoleController는 이제 roleService.getRoleByName()을 사용.
 * 다른 곳에서 참조 시 roleService로 전환 권장.
 */
import { ROLE_REGISTRY } from '../types/roles.js';

export const ALLOWED_ROLES: ReadonlySet<string> = new Set(Object.keys(ROLE_REGISTRY));

export function isAllowedRole(role: string): boolean {
  return ALLOWED_ROLES.has(role);
}
