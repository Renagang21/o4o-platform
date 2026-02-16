/**
 * Permission Checker Interface
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Core는 역할을 "문자열 배열"로만 인지한다.
 * 서비스는 PermissionChecker 구현을 Core에 주입한다.
 */

/**
 * Permission Checker — injectable role-based access control.
 *
 * Core never imports service-specific role logic.
 * Each service provides an implementation (or uses the default).
 */
export interface PermissionChecker {
  hasAnyRole(userRoles: string[], allowedRoles: string[]): boolean;
}

/**
 * Default PermissionChecker — exact string match.
 *
 * Suitable for most services. Services with hierarchical roles
 * can provide custom implementations.
 */
export class DefaultPermissionChecker implements PermissionChecker {
  hasAnyRole(userRoles: string[], allowedRoles: string[]): boolean {
    return userRoles.some(role => allowedRoles.includes(role));
  }
}
