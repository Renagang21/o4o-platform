/**
 * AssignmentRow
 *
 * RBAC SSOT (`role_assignments`) 을 UI 행 단위로 매핑.
 * 한 user 가 N 개의 active role 을 가지면 N rows 로 펼쳐진다.
 *
 * GET /admin/users 응답이 이미 roles: string[] 을 JOIN 하여 반환하므로
 * 백엔드 변경 없이 frontend flatMap 만으로 생성한다.
 *
 * Related:
 *   - docs/investigations/IR-O4O-ADMIN-ROLE-LIST-SERVICE-CENTRIC-UX-AUDIT-V1.md
 *   - apps/api-server/src/controllers/admin/AdminUserController.ts (getUsers)
 */

import type { ParsedRole, RoleMeta, ServiceMeta } from './rbac-catalog';
import { getRoleMeta, getServiceMeta, parseRole } from './rbac-catalog';

export interface AdminUserDto {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  username?: string;
  email?: string;
  roles?: string[];
  /** legacy fallback: roles[0] || 'user' */
  role?: string;
  isActive?: boolean;
  status?: string;
  createdAt?: string | Date;
  lastLoginAt?: string | Date;
  lastLogin?: string | Date;
  avatar?: string;
  postsCount?: number;
}

export interface AssignmentRow {
  /** 안정적 row key — BaseTable rowKey */
  key: string;
  /** 사용자 정보 */
  userId: string;
  userName: string;
  userEmail: string;
  username: string;
  userAvatar?: string;
  userIsActive: boolean;
  userCreatedAt: string;
  userLastLogin?: string;
  /** assignment 정보 */
  role: string;
  parsedRole: ParsedRole;
  service: ServiceMeta;
  roleMeta: RoleMeta;
  /** 같은 user 의 다른 active roles (다중 권한 표시용 보조) */
  userAllRoles: string[];
  /** 원본 DTO (action callback 용) */
  user: AdminUserDto;
}

function toDateString(v?: string | Date): string {
  if (!v) return '';
  try {
    return new Date(v).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function resolveUserName(u: AdminUserDto): string {
  if (u.name) return u.name;
  const combined = `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim();
  return combined || 'Unknown';
}

function resolveUsername(u: AdminUserDto): string {
  if (u.username) return u.username;
  if (u.email) return u.email.split('@')[0];
  return 'unknown';
}

/**
 * GET /admin/users 응답의 user 배열을 assignment-row 배열로 flatMap.
 *
 * - roles 배열이 비어 있으면 legacy fallback 'user' role 한 줄을 생성하여 행에서 사라지지 않도록 함.
 * - status === 'suspended' 또는 isActive === false 인 경우 userIsActive = false.
 */
export function flattenUsersToAssignments(users: AdminUserDto[]): AssignmentRow[] {
  const rows: AssignmentRow[] = [];

  for (const u of users) {
    const userId = u.id ?? u._id;
    if (!userId) continue;

    const allRoles: string[] =
      Array.isArray(u.roles) && u.roles.length > 0
        ? u.roles
        : u.role
          ? [u.role]
          : ['user'];

    const userIsActive = u.isActive !== false && u.status !== 'suspended';
    const userCreatedAt = toDateString(u.createdAt);
    const userLastLogin = toDateString(u.lastLoginAt ?? u.lastLogin) || undefined;
    const userName = resolveUserName(u);
    const username = resolveUsername(u);

    for (const role of allRoles) {
      const parsed = parseRole(role);
      rows.push({
        key: `${userId}::${role}`,
        userId,
        userName,
        userEmail: u.email ?? '',
        username,
        userAvatar: u.avatar,
        userIsActive,
        userCreatedAt,
        userLastLogin,
        role,
        parsedRole: parsed,
        service: getServiceMeta(parsed),
        roleMeta: getRoleMeta(parsed),
        userAllRoles: allRoles,
        user: u,
      });
    }
  }

  return rows;
}

/**
 * selectedKeys (assignment keys) 에서 고유 userId 집합 추출.
 *
 * Bulk action (delete user 등) 은 user 단위로 동작해야 하므로
 * 같은 user 의 여러 assignment row 가 선택되어도 1회만 처리한다.
 */
export function uniqueUserIdsFromKeys(keys: Iterable<string>): string[] {
  const set = new Set<string>();
  for (const k of keys) {
    const [userId] = k.split('::');
    if (userId) set.add(userId);
  }
  return Array.from(set);
}
