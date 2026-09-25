/**
 * @core O4O_PLATFORM_CORE — Approval
 * Core Controller: User list, status change (approve/reject), password reset, delete
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { User, UserRole, UserStatus } from '../../modules/auth/entities/User.js';
import { validationResult } from 'express-validator';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import logger from '../../utils/logger.js';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
// WO-O4O-ADMIN-USER-LIST-SENSITIVE-FIELD-EXPOSURE-FIX-V1
import { sanitizeAdminUser } from './admin-user-sanitizer.js';
// WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1
import { invalidateRoles } from '../../modules/auth/utils/role-cache.js';
import { isPlatformAdmin } from '../../utils/role.utils.js';
import {
  canRevokeOwnRole,
  getServiceAdminRoleServiceKey,
  LAST_ADMIN_PROTECTED_CODE,
  lastAdminProtectedMessage,
  revokeServiceAdminRoleWithLock,
  SELF_ROLE_REVOKE_FORBIDDEN_CODE,
  SELF_ROLE_REVOKE_FORBIDDEN_MESSAGE,
} from '../../utils/role-revoke-safety.js';
// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   비밀번호 재설정 적용범위 안내(`resolveAdminPasswordResetScope`)는 은퇴했다.
//   재설정할 비밀번호가 어디에도 없다.

// WO-O4O-ADMIN-OPERATOR-MEMBERSHIP-CANONICAL-KEY-FIX-V1 +
// WO-O4O-BACKFILL-MIGRATION-CANONICAL-KEY-CONSISTENCY-V1:
// service-prefixed role (e.g., 'kpa:operator') prefix → service_memberships canonical service_key 매핑.
// SSOT: @o4o/security-core 의 resolveCanonicalServiceKey() 사용. 로컬 const 정의 금지.
function toCanonicalServiceKey(rolePrefix: string): string {
  return resolveCanonicalServiceKey(rolePrefix);
}

/**
 * 서비스 운영자 등록 계약 위반 — 트랜잭션 안에서 던져 부분 생성을 롤백시킨다.
 * WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1
 */
export class OperatorRegistrationContractError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OperatorRegistrationContractError';
  }
}

/**
 * 등록 대상 서비스(canonical service_key) 확정.
 *
 * WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1
 *
 * 계약:
 *   - 한 번의 등록에서 대상 서비스는 **하나**다. 서로 다른 서비스 role 이 섞이면 거절한다
 *     (여러 서비스 credential 을 한 번에 만들지 않는다).
 *   - `platform:*` 과 무접두 legacy role 은 서비스 credential 개념이 없다 → 대상 서비스 없음(null).
 *   - role prefix → canonical key 변환은 `resolveCanonicalServiceKey` SSOT 에만 위임한다.
 *   - body.serviceKey 를 명시하면 role 에서 파생한 키와 **일치해야** 한다(모순 시 거절).
 */
export function resolveOperatorTargetServiceKey(
  roles: string[],
  explicitServiceKey?: unknown,
): { serviceKey: string | null; error?: OperatorRegistrationContractError } {
  const canonicalKeys = new Set<string>();
  for (const raw of roles) {
    if (typeof raw !== 'string' || !raw.includes(':')) continue; // 무접두 legacy = platform 축
    const prefix = raw.split(':')[0];
    if (prefix === 'platform') continue;
    canonicalKeys.add(toCanonicalServiceKey(prefix));
  }

  if (canonicalKeys.size > 1) {
    return {
      serviceKey: null,
      error: new OperatorRegistrationContractError(
        400,
        'MULTI_SERVICE_NOT_ALLOWED',
        '한 번의 등록에서는 대상 서비스를 하나만 선택할 수 있습니다. 서비스별로 나누어 등록하세요.',
      ),
    };
  }

  const derived = canonicalKeys.size === 1 ? [...canonicalKeys][0] : null;
  const requested =
    typeof explicitServiceKey === 'string' && explicitServiceKey.trim()
      ? explicitServiceKey.trim()
      : undefined;

  if (requested && requested !== derived) {
    return {
      serviceKey: null,
      error: new OperatorRegistrationContractError(
        400,
        'SERVICE_KEY_MISMATCH',
        `요청한 서비스(${requested})와 선택한 역할의 서비스(${derived ?? '없음'})가 일치하지 않습니다.`,
      ),
    };
  }

  return { serviceKey: derived };
}

/**
 * 관리자 사용자 검색 대상 필드 — WO-O4O-ADMIN-USER-SEARCH-500-FIX-V1
 *
 * ⚠️ **여기에는 User 엔티티에 실제로 매핑된 속성만 넣는다.**
 *   이전 구현은 존재하지 않는 `company` 를 참조했다. TypeORM 은 매핑되지 않은 속성을
 *   치환하지 못해 SQL 에 `user.company` 를 그대로 남기는데, `user` 는 PostgreSQL 예약어
 *   (niladic USER 함수)라 따옴표 없이 쓰이면 `syntax error at or near "."` 로 실패했다.
 *   매핑된 속성만 `"user"."x"` 로 치환되므로 오탈자·삭제된 컬럼이 곧바로 500 이 된다.
 *   `admin-user-search.test.ts` 가 이 배열의 모든 항목이 실제 컬럼인지 검사한다.
 *
 * 검색 계약: 이메일 · 이름 · 전화번호.
 *   한글 이름은 대부분 `name` 컬럼에 있다(`firstName`/`lastName` 은 nullable 이고 비어 있는 경우가 많다).
 *   NULL 컬럼은 `NULL ILIKE ...` → NULL 로 평가되어 매칭에서 자연 제외된다(오류 아님).
 */
export const ADMIN_USER_SEARCH_FIELDS = [
  'name',
  'firstName',
  'lastName',
  'email',
  'phone',
] as const;

/** 검색어 정규화 — 앞뒤 공백 제거, 공백만 입력하면 '검색 없음'과 동일하게 취급한다. */
export function normalizeUserSearch(search: unknown): string {
  return typeof search === 'string' ? search.trim() : '';
}

/** 검색 WHERE 절 — 파라미터는 `:search` 하나로 바인딩한다(raw interpolation 금지). */
export function buildUserSearchWhere(alias: string): string {
  return `(${ADMIN_USER_SEARCH_FIELDS.map((f) => `${alias}.${f} ILIKE :search`).join(' OR ')})`;
}

/**
 * membership ensure 계약은 `services/admin/service-membership-ensure.ts` 로 추출됐다
 * (WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 — 직접 지정·초대 수락이 같은 함수를 쓴다).
 * 기존 import 경로를 유지하기 위해 여기서 re-export 한다. 구현을 여기에 복제하지 않는다.
 */
import {
  ensureServiceMembershipsForRoles,
  type MembershipPolicy,
} from '../../services/admin/service-membership-ensure.js';

export {
  resolveMembershipPolicy,
  ensureServiceMembershipsForRoles,
} from '../../services/admin/service-membership-ensure.js';
export type {
  MembershipPolicy,
  MembershipEnsureResult,
} from '../../services/admin/service-membership-ensure.js';

export class AdminUserController {

  
  // Get all users with pagination and filters
  // WO-OPERATOR-FIX-V1: JOIN role_assignments to include roles in response
  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const userRepo = AppDataSource.getRepository(User);
      const queryBuilder = userRepo.createQueryBuilder('user');

      // Apply search filter — WO-O4O-ADMIN-USER-SEARCH-500-FIX-V1
      const searchTerm = normalizeUserSearch(search);
      if (searchTerm) {
        queryBuilder.where(buildUserSearchWhere('user'), { search: `%${searchTerm}%` });
      }

      // WO-OPERATOR-FIX-V1: role filter via role_assignments
      if (role && role !== 'all') {
        queryBuilder.andWhere(
          `EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.user_id = user.id AND ra.is_active = true AND ra.role = :filterRole)`,
          { filterRole: role }
        );
      }

      // Apply status filter
      if (status && status !== 'all') {
        queryBuilder.andWhere('user.status = :status', { status });
      }

      // Apply sorting
      const validSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`user.${sortField}`, order);

      // Apply pagination
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const [users, totalCount] = await queryBuilder.getManyAndCount();

      // WO-OPERATOR-FIX-V1: Fetch roles for all users in batch
      const userIds = users.map(u => u.id);
      const roleMap: Record<string, string[]> = {};
      if (userIds.length > 0) {
        const roleRows = await AppDataSource.query(
          `SELECT user_id, ARRAY_AGG(role ORDER BY role) as roles
           FROM role_assignments
           WHERE user_id = ANY($1) AND is_active = true
           GROUP BY user_id`,
          [userIds]
        );
        for (const row of roleRows) {
          roleMap[row.user_id] = row.roles || [];
        }
      }

      // WO-O4O-ADMIN-USER-LIST-SENSITIVE-FIELD-EXPOSURE-FIX-V1:
      //   password 만 제거하던 방식을 공통 sanitizer 로 교체한다 (refreshTokenFamily 등 포함).
      const sanitizedUsers = users.map(user => ({
        ...sanitizeAdminUser(user),
        roles: roleMap[user.id] || [],
        role: (roleMap[user.id] || [])[0] || 'user'
      }));

      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        users: sanitizedUsers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  };

  // Get single user by ID
  getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userRepo = AppDataSource.getRepository(User);
      
      const user = await userRepo.findOne({ where: { id } });
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // WO-O4O-ADMIN-USER-LIST-SENSITIVE-FIELD-EXPOSURE-FIX-V1: 목록과 동일한 제외 계약
      res.json({
        success: true,
        user: sanitizeAdminUser(user)
      });
    } catch (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user'
      });
    }
  };

  // Create new user
  /**
   * POST /admin/users — **기존 사용자에게 운영 역할·membership 을 추가하는 경로만 남는다.**
   *
   * WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §17 · §18:
   *   운영자 onboarding 의 Identity 계약이 Google 기준으로 바뀌었다. 관리자는 더 이상 타인의
   *   비밀번호를 만들지 않는다. 따라서 이 경로에서 은퇴하는 것은 다음 둘이다.
   *     1. `password` 수신 → `service_credentials` / `users.password` 생성  (400 PASSWORD_NOT_ALLOWED_HERE)
   *     2. 미가입 email 로 신규 user 생성                                     (400 USER_SIGNUP_REQUIRED)
   *   대체 경로: `POST /api/v1/admin/operator-assignments` (기존 사용자 · userId 로 지정) ·
   *   **조용한 대체(silent fallback)를 만들지 않는다** — 옛 계약으로 온 요청은 명시 코드로 거절한다.
   */
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        email,
        password,
        role = UserRole.USER,
        roles: rolesArray,
      } = req.body;

      // 은퇴 1 — 비밀번호는 이 경로에 존재하지 않는다(부분 수용도 하지 않는다).
      if (typeof password === 'string' && password.length > 0) {
        res.status(400).json({
          success: false,
          error: '이 경로에서는 비밀번호를 만들지 않습니다. 운영자는 Google 계정으로 지정·초대합니다.',
          code: 'PASSWORD_NOT_ALLOWED_HERE',
        });
        return;
      }

      const userRepo = AppDataSource.getRepository(User);
      const rolesToAssign = Array.isArray(rolesArray) && rolesArray.length > 0 ? rolesArray : [role];

      // 대상 서비스 확정 — 여기서 걸리면 아무것도 쓰지 않는다(멀티 서비스 · serviceKey 모순 거절).
      const target = resolveOperatorTargetServiceKey(rolesToAssign, req.body?.serviceKey);
      if (target.error) {
        res.status(target.error.status).json({
          success: false,
          error: target.error.message,
          code: target.error.code,
        });
        return;
      }
      const targetServiceKey = target.serviceKey;

      const existingUser = await userRepo.findOne({ where: { email } });

      // 은퇴 2 — 미가입자는 초대 경로로만 운영자가 된다. 여기서 users 를 만들지 않는다.
      if (!existingUser) {
        res.status(400).json({
          success: false,
          error: '가입하지 않은 사용자입니다. 대상자가 Google 로 O4O 에 가입한 뒤 운영자로 지정하세요.',
          code: 'USER_SIGNUP_REQUIRED',
        });
        return;
      }

      let membershipPolicy: MembershipPolicy = 'NOT_APPLICABLE';
      let membershipStatuses: Record<string, string> = {};

      await AppDataSource.transaction(async (manager) => {
        for (const r of rolesToAssign) {
          await roleAssignmentService.assignRole({ userId: existingUser.id, role: r }, manager);
        }
        const ensured = await ensureServiceMembershipsForRoles(existingUser.id, rolesToAssign, manager);
        membershipPolicy = ensured.policy;
        membershipStatuses = ensured.existingStatuses;
      });

      res.status(200).json({
        success: true,
        user: sanitizeAdminUser(existingUser),
        message: 'Roles added to existing user',
        isExistingUser: true,
        serviceKey: targetServiceKey,
        // 이 경로는 users.password 도 service_credentials 도 쓰지 않는다.
        passwordPolicy: 'KEEP_EXISTING_PASSWORD',
        credentialPolicy: 'NOT_APPLICABLE',
        // 기존 membership 은 승격되지 않는다 — 관리자가 그 사실을 알 수 있게 명시한다.
        membershipPolicy,
        membershipStatuses,
      });
    } catch (error) {
      if (error instanceof OperatorRegistrationContractError) {
        res.status(error.status).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      logger.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }
  };

  // Update user
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const userRepo = AppDataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { id } });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      const {
        email,
        password,
        firstName,
        lastName,
        name,
        role,
        roles: rolesArray,
        status,
        isActive
      } = req.body;

      // WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1:
      //   이 경로는 **일반 사용자 정보 수정** 전용이다. 비밀번호는 더 이상 받지 않는다.
      //
      //   WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 대체 경로도 더는 없다.
      //   O4O 인증에 비밀번호가 존재하지 않으므로 이 필드는 어디로도 라우팅되지 않는다.
      //   조용히 무시하지 않고 **명시적으로 거부**한다 — 무시하면 "성공했는데 안 바뀜" 이 된다.
      if (password !== undefined) {
        res.status(400).json({
          success: false,
          error:
            '이 API 는 비밀번호를 변경하지 않습니다. 서비스 비밀번호는 운영자 회원 관리(서비스 선택 후 변경), ' +
            '플랫폼 계정 비밀번호는 플랫폼 계정 관리에서 변경하세요.',
          code: 'PASSWORD_NOT_ALLOWED_HERE',
        });
        return;
      }

      // Check if email is being changed and already exists
      if (email && email !== user.email) {
        const existingUser = await userRepo.findOne({ where: { email } });
        if (existingUser) {
          res.status(400).json({
            success: false,
            error: 'Email already exists'
          });
          return;
        }
      }

      // Update fields
      if (email) user.email = email;
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (name) user.name = name;
      // WO-OPERATOR-FIX-V1: Support multiple roles from frontend
      if (Array.isArray(rolesArray) && rolesArray.length > 0) {
        await roleAssignmentService.removeAllRoles(user.id);
        for (const r of rolesArray) {
          await roleAssignmentService.assignRole({ userId: user.id, role: r });
        }
      } else if (role) {
        await roleAssignmentService.removeAllRoles(user.id);
        await roleAssignmentService.assignRole({ userId: user.id, role });
      }
      if (status !== undefined) user.status = status;
      if (isActive !== undefined) user.isActive = isActive;

      const updatedUser = await userRepo.save(user);

      res.json({
        success: true,
        user: sanitizeAdminUser(updatedUser),
        message: 'User updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  };

  // Update user status
  updateUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id } });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      user.status = status;
      await userRepo.save(user);

      // KPA 회원 승인 시 kpa_members.status도 'active'로 동기화
      if (status === 'approved') {
        try {
          await AppDataSource.query(
            `UPDATE kpa_members SET status = 'active', updated_at = NOW() WHERE user_id = $1 AND status = 'pending'`,
            [id]
          );
        } catch { /* kpa_members 없는 경우 무시 */ }
      }

      res.json({
        success: true,
        message: `User status updated to ${status}`
      });
    } catch (error) {
      logger.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }
  };

  // Delete user
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userRepo = AppDataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { id } });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // WO-O4O-ADMIN-OPERATOR-ROLE-REVOKE-AND-SUPERADMIN-GUARD-V1:
      // platform:super_admin 계정은 이 API로 삭제/비활성화 불가
      const isSuperAdmin = await roleAssignmentService.hasAnyRole(id, ['platform:super_admin']);
      if (isSuperAdmin) {
        res.status(403).json({
          success: false,
          error: 'Cannot delete or deactivate a platform super admin account',
          code: 'SUPER_ADMIN_PROTECTED',
        });
        return;
      }

      // Try hard delete first; if FK constraint prevents it, soft-delete instead
      try {
        await userRepo.remove(user);
        res.json({
          success: true,
          message: 'User deleted successfully'
        });
      } catch (deleteError: any) {
        // FK constraint violation — fall back to soft delete
        if (deleteError?.code === '23503' || deleteError?.message?.includes('violates foreign key')) {
          await userRepo.update(id, { isActive: false });
          // Also remove role assignments so the user can no longer log in
          await AppDataSource.query(
            `DELETE FROM role_assignments WHERE user_id = $1`,
            [id]
          );
          res.json({
            success: true,
            message: 'User deactivated (has related records that prevent full deletion)'
          });
        } else {
          throw deleteError;
        }
      }
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  };

  // WO-O4O-ADMIN-OPERATOR-ROLE-REVOKE-AND-SUPERADMIN-GUARD-V1
  // 단일 역할 해제 — 계정 삭제/비활성화 없이 role_assignments만 비활성화
  revokeRoleAssignment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, role } = req.params;

      // platform:super_admin 역할 해제는 차단
      if (role === 'platform:super_admin') {
        res.status(403).json({
          success: false,
          error: 'Cannot revoke the platform:super_admin role via this API',
          code: 'SUPER_ADMIN_ROLE_PROTECTED',
        });
        return;
      }

      // WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1 (2):
      //   요청자가 자기 자신의 역할을 해제하는 행위 차단.
      //   requireAuth 를 통과한 요청자 ID 와 경로의 대상 ID 를 직접 비교한다.
      //   (대상 존재 확인보다 앞에 둔다 — 계정 조회 없이 판정이 끝나는 조건이다.)
      //
      // WO-O4O-PLATFORM-ADMIN-SERVICE-ROLE-RESET-V1:
      //   단, `platform:super_admin` 요청자가 **자기 service-scoped 역할**을 해제하는 것은
      //   허용한다. 플랫폼 관리자는 각 서비스의 admin/operator 를 보유하지 않아도 되며,
      //   종전 전면 금지는 그 정리를 불가능하게 만들었다. 자기 `platform:*` 해제는 그대로 금지다
      //   (`platform:super_admin` 은 위에서 이미 전면 차단된다).
      const requesterId = (req as any).user?.id;
      const requesterIsPlatformSuperAdmin = isPlatformAdmin((req as any).user?.roles ?? []);
      if (
        requesterId &&
        requesterId === userId &&
        !canRevokeOwnRole({ requesterIsPlatformSuperAdmin, role })
      ) {
        res.status(403).json({
          success: false,
          error: SELF_ROLE_REVOKE_FORBIDDEN_MESSAGE,
          code: SELF_ROLE_REVOKE_FORBIDDEN_CODE,
        });
        return;
      }

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1 (1):
      //   마지막 활성 서비스 admin 해제 차단.
      //   동시 해제로 보호가 우회되지 않도록, 같은 role 의 활성 assignment 전체를
      //   FOR UPDATE 로 잠근 뒤 보유자 집합을 판정하고 같은 트랜잭션에서 UPDATE 한다.
      //   (READ COMMITTED 에서 후행 트랜잭션은 선행 커밋 후 잠금을 얻으며,
      //    이미 is_active=false 로 바뀐 행은 WHERE 재평가에서 탈락한다.)
      const adminServiceKey = getServiceAdminRoleServiceKey(role);

      let affected = 0;
      if (adminServiceKey) {
        // WO-O4O-MEMBERSHIP-CONSOLE-ROLE-REVOKE-SAFETY-GUARDS-V1:
        //   잠금·판정·UPDATE 는 `revokeServiceAdminRoleWithLock` 정본을 사용한다.
        //   같은 계약을 쓰는 다른 해제 경로(MembershipConsoleController.removeMemberRole)와
        //   판정이 갈리지 않게 하기 위해서다(동작 동일, SQL 동일).
        // WO-O4O-PLATFORM-ADMIN-SERVICE-ROLE-RESET-V1: platform:super_admin 은 마지막 서비스 admin 도 정리할 수 있다.
        const outcome = await revokeServiceAdminRoleWithLock(AppDataSource, userId, role, {
          allowLastAdmin: requesterIsPlatformSuperAdmin,
        });
        const notHolder = outcome.status === 'not_holder';
        const lastAdmin = outcome.status === 'last_admin';
        if (outcome.status === 'revoked') affected = outcome.affected;

        if (notHolder) {
          res.status(404).json({
            success: false,
            error: `Active role assignment '${role}' not found for this user`,
            code: 'ROLE_ASSIGNMENT_NOT_FOUND',
          });
          return;
        }
        if (lastAdmin) {
          res.status(403).json({
            success: false,
            error: lastAdminProtectedMessage(role),
            code: LAST_ADMIN_PROTECTED_CODE,
          });
          return;
        }
      } else {
        // 서비스 admin 이 아닌 역할은 기존 경로를 그대로 유지한다(동작 변경 없음).
        // role_assignments에서 해당 userId + role만 비활성화 (soft revoke)
        const result = await AppDataSource.query(
          `UPDATE role_assignments SET is_active = false, updated_at = NOW()
           WHERE user_id = $1 AND role = $2 AND is_active = true`,
          [userId, role]
        );
        affected = result?.[1] ?? 0;
      }

      if (affected === 0) {
        res.status(404).json({
          success: false,
          error: `Active role assignment '${role}' not found for this user`,
          code: 'ROLE_ASSIGNMENT_NOT_FOUND',
        });
        return;
      }

      // WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-CACHE-INVALIDATION-V1:
      //   DB 해제가 실제로 성공한(affected > 0) 뒤에만, 그리고 응답 전에 캐시를 지운다.
      //   무효화 대상은 요청자가 아니라 **역할을 잃은 대상 사용자**다.
      //   두 해제 분기(일반 UPDATE · revokeServiceAdminRoleWithLock) 모두 이 지점을 지난다.
      //   `roleAssignmentService.assignRole/removeRole/removeAllRoles` 와 동일한 관례이며
      //   (WO-O4O-AUTH-ROLE-FRESHEN-V1), 저장소 전체에서 캐시 무효화 실패를 이유로
      //   DB 작업을 되돌리는 경로는 없다. `invalidateRoles` 는 동기 `Map.delete` 라
      //   보상 트랜잭션 대상이 아니므로 같은 실패 계약(호출 후 즉시 응답)을 따른다.
      invalidateRoles(userId);

      logger.info(`[revokeRoleAssignment] role=${role} revoked from userId=${userId}`);
      res.json({
        success: true,
        message: `Role '${role}' revoked. User account remains active.`,
      });
    } catch (error) {
      logger.error('Error revoking role assignment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke role assignment',
      });
    }
  };

  // Get user statistics
  getUserStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRepo = AppDataSource.getRepository(User);

      const [
        totalUsers,
        activeUsers,
        usersByRole,
        usersByStatus,
        recentUsers
      ] = await Promise.all([
        userRepo.count(),
        userRepo.count({ where: { isActive: true } }),
        // role column removed - return empty array for role stats
        Promise.resolve([]),
        userRepo
          .createQueryBuilder('user')
          .select('user.status as status, COUNT(*) as count')
          .groupBy('user.status')
          .getRawMany(),
        userRepo.find({
          order: { createdAt: 'DESC' },
          take: 10,
          select: ['id', 'firstName', 'lastName', 'email', 'createdAt']
        })
      ]);

      res.json({
        success: true,
        statistics: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          byRole: usersByRole,
          byStatus: usersByStatus,
          recent: recentUsers
        }
      });
    } catch (error) {
      logger.error('Error fetching user statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics'
      });
    }
  };
}