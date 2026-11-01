import { createHash } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { centralMenusForRole } from '@o4o/types';
import { CENTRAL_DELEGATION_SCOPE } from '../../config/operator-role-catalog.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { invalidateRoles } from '../../modules/auth/utils/role-cache.js';
import { lockOperatorAssignments } from '../../modules/auth/services/operator-assignment-lock.js';
import { OperationError, operationReason, recordOperation } from '../operations/operation-audit.js';
import { centralOperationRoles } from './central-operation-access.js';
import { ensureServiceMembershipsForRoles } from './service-membership-ensure.js';
import { demoAccountService } from '../auth/demo-account.service.js';
import { recordOperatorRevocation } from './operator-invitation-retention.js';
import { ADMIN_OPERATIONS_INVITATION_SCOPE, ADMIN_OPERATIONS_OPERATOR_ROLES, adminOperationsRoles, validateAdminOperationsMenus } from './admin-operations-operator-contract.js';

type Db = Pick<EntityManager, 'query'>;
interface Assignment { id: string; role: string; scope_type: string | null; scope_id: string | null; is_active: boolean; valid_from: Date | null; valid_until: Date | null; menu_keys: string[] | null; grant_version: string | null }
interface OperatorAccount { id: string; name: string | null; email: string; status: string; isActive: boolean }
const fail = (code: string, message: string, status = 409): never => { throw new OperationError(status, code, message); };
export async function requireOperationsAdmin(db: Db, actor: string) {
  if (!(await centralOperationRoles(db, actor, true)).includes('platform:super_admin'))
    fail('OPERATIONS_ADMIN_REQUIRED', '전체 관리자만 업무 운영자를 지정·변경·해제할 수 있습니다.', 403);
}
async function rows(db: Db, userId: string): Promise<Assignment[]> {
  return db.query(`SELECT ra.id,ra.role,ra.scope_type,ra.scope_id,ra.is_active,ra.valid_from,ra.valid_until,
    g.menu_keys,to_char(g.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') AS grant_version
    FROM role_assignments ra LEFT JOIN central_operation_menu_grants g ON g.assignment_id=ra.id
    WHERE ra.user_id=$1 AND ra.is_active=true AND ra.role=ANY($2::text[]) ORDER BY ra.role,ra.id`, [userId, ADMIN_OPERATIONS_OPERATOR_ROLES]);
}
const central = (row: Assignment) => row.scope_type === CENTRAL_DELEGATION_SCOPE && !row.scope_id &&
  (!row.valid_from || new Date(row.valid_from).getTime() <= Date.now()) && (!row.valid_until || new Date(row.valid_until).getTime() >= Date.now());
const version = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const menuKeysForRows = (value: Assignment[]) => [...new Set(value.filter(central).flatMap(row => {
  const allowed = centralMenusForRole(row.role).map(menu => menu.key);
  return row.menu_keys === null ? allowed : allowed.filter(key => row.menu_keys.includes(key));
}))].sort((left, right) => left.localeCompare(right));

/** Caller holds the target lock and verifies invitation identity/consent. No service/global/Admin role is overwritten. */
export async function assertOperationsTarget(db: Db, userId: string, menuKeys: string[]) {
  const [admin] = await db.query(`SELECT 1 FROM role_assignments WHERE user_id=$1 AND role='platform:super_admin' AND is_active=true`, [userId]);
  if (admin) fail('TARGET_IS_ADMIN', '전체 관리자는 이미 업무 운영 전체를 이용할 수 있습니다.');
  const required = adminOperationsRoles(menuKeys);
  const checked = [...required, ...required.map(role => role.replace(/operator$/, 'admin'))];
  const prior: Array<Pick<Assignment, 'role' | 'is_active' | 'scope_type' | 'scope_id' | 'valid_from' | 'valid_until'>> = await db.query(`SELECT DISTINCT ON (role) role,is_active,scope_type,scope_id,valid_from,valid_until FROM role_assignments
    WHERE user_id=$1 AND role=ANY($2::text[]) ORDER BY role,is_active DESC,assigned_at DESC,id DESC`, [userId, checked]);
  if (prior.some(row => row.scope_id || row.is_active && row.scope_type !== CENTRAL_DELEGATION_SCOPE || required.includes(row.role) && (row.valid_until || row.valid_from && new Date(row.valid_from).getTime() > Date.now())))
    fail('OPERATIONS_ROLE_SCOPE_CONFLICT', '기존 서비스·조직 권한 또는 유효기간이 설정되어 있습니다. 기존 권한을 유지하며 먼저 범위를 검토해 주세요.');
}
export async function activateOperationsOperator(m: EntityManager, actor: string, userId: string, menuKeys: string[], reason?: string) {
  await assertOperationsTarget(m, userId, menuKeys);
  const roles = adminOperationsRoles(menuKeys);
  for (const role of roles) await roleAssignmentService.assignRole({ userId, role, assignedBy: actor, scopeType: CENTRAL_DELEGATION_SCOPE }, m);
  const ensured = await ensureServiceMembershipsForRoles(userId, roles, m);
  // All central Operator rows receive explicit restrictions, including duties removed from this workspace.
  for (const row of (await rows(m, userId)).filter(central)) {
    const allowed = new Set(centralMenusForRole(row.role).map(menu => menu.key));
    await m.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) VALUES($1,$2)
      ON CONFLICT(assignment_id) DO UPDATE SET menu_keys=$2,updated_at=clock_timestamp()`, [row.id, menuKeys.filter(key => allowed.has(key))]);
    await recordOperation(m, row.role.split(':')[0], actor, reason ? 'operator.central_menu_grants_changed' : 'admin.service_operator_assigned', { scope: CENTRAL_DELEGATION_SCOPE, targetUserId: userId, role: row.role, menuKeys: menuKeys.filter(key => allowed.has(key)), ...(reason ? { reason } : {}) });
  }
  return ensured;
}
export class AdminOperationsOperators {
  constructor(private readonly db: Pick<DataSource, 'transaction'>) {}
  list(actor: string) {
    return this.db.transaction(async m => {
      await requireOperationsAdmin(m, actor);
      const users: OperatorAccount[] = await m.query(`SELECT DISTINCT u.id,u.name,u.email,u.status,u."isActive" FROM users u JOIN role_assignments ra ON ra.user_id=u.id
        WHERE ra.scope_type=$1 AND ra.is_active=true AND ra.role=ANY($2::text[])
        AND (ra.valid_from IS NULL OR ra.valid_from<=now()) AND (ra.valid_until IS NULL OR ra.valid_until>=now()) ORDER BY u.id`, [CENTRAL_DELEGATION_SCOPE, ADMIN_OPERATIONS_OPERATOR_ROLES]);
      return Promise.all(users.map(async user => { const current = await rows(m, user.id); return { ...user, menuKeys: menuKeysForRows(current), version: version(current) }; }));
    });
  }
  async change(actor: string, userId: string, input: { menuKeys?: unknown; version: unknown; reason: unknown }, revoke = false) {
    const reason = operationReason(input.reason);
    const menus = revoke ? [] : validateAdminOperationsMenus(input.menuKeys, true);
    const result = await this.db.transaction(async m => {
      await lockOperatorAssignments(m, userId);
      await requireOperationsAdmin(m, actor);
      await demoAccountService.assertNotDemoAccount(userId, m);
      const current = await rows(m, userId), delegated = current.filter(central);
      if (!delegated.length) fail('OPERATIONS_OPERATOR_NOT_FOUND', '업무 운영자 지정을 찾지 못했습니다.', 404);
      if (typeof input.version !== 'string' || version(current) !== input.version) fail('OPERATIONS_OPERATOR_CHANGED', '다른 관리자가 변경했습니다. 목록을 새로고침해 주세요.');
      if (revoke) {
        for (const row of delegated) {
          await roleAssignmentService.removeRole(userId, row.role, m);
          await recordOperatorRevocation(m, actor, userId, row.role.split(':')[0], row.role, 'platform', CENTRAL_DELEGATION_SCOPE);
          await recordOperation(m, row.role.split(':')[0], actor, 'operator.central_menu_grants_changed', { targetUserId: userId, role: row.role, menuKeys: [], reason });
        }
        await m.query(`UPDATE service_operator_invitations SET status='cancelled',invited_email=NULL,token_hash=NULL,updated_at=now()
          WHERE status='pending' AND scope_type='platform' AND scope_key=$2 AND (target_user_id=$1 OR lower(invited_email)=(SELECT lower(email) FROM users WHERE id=$1))`, [userId, ADMIN_OPERATIONS_INVITATION_SCOPE]);
      } else {
        const [user] = await m.query(`SELECT 1 FROM users WHERE id=$1 AND "isActive"=true AND "isEmailVerified"=true AND status IN ('active','approved') FOR SHARE`, [userId]);
        if (!user) fail('ACCOUNT_INACTIVE', '사용할 수 없는 계정입니다.', 403);
        if (adminOperationsRoles(menus).some(role => !delegated.some(row => row.role === role)))
          fail('OPERATIONS_NEW_DUTIES_REQUIRE_INVITATION', '새 업무 분야를 추가하려면 업무 운영자 초대를 다시 보내고 본인 수락을 받아 주세요.');
        await activateOperationsOperator(m, actor, userId, menus, reason);
      }
      return { revoked: revoke };
    });
    invalidateRoles(userId);
    return result;
  }
}
