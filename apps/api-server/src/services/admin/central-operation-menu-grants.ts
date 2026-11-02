import { ADMIN_OPERATIONS_OPERATOR_ROLES } from './admin-operations-operator-contract.js';
import { centralMenusForRole, centralServiceForRole, type CentralOperationService } from '@o4o/types';
import type { DataSource, EntityManager } from 'typeorm';
import { CENTRAL_DELEGATION_SCOPE } from '../../config/operator-role-catalog.js';
import { lockOperatorAssignments } from '../../modules/auth/services/operator-assignment-lock.js';
import { OperationError, operationReason, recordOperation } from '../operations/operation-audit.js';
import { centralOperationRoles } from './central-operation-access.js';

type Db = Pick<EntityManager, 'query'>;
interface Grant { menuKeys: string[]; version: string | null }
const grantColumns = `menu_keys AS "menuKeys",to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') AS version`;

export function validateCentralMenuKeys(role: string, input: unknown): string[] {
  const allowed = new Set(centralMenusForRole(role).map(menu => menu.key));
  if (!Array.isArray(input) || input.length > 256 || input.some(key => typeof key !== 'string' || !allowed.has(key)) || role === 'platform:super_admin')
    throw new OperationError(400, 'INVALID_CENTRAL_MENU_GRANTS', '해당 서비스 역할에 위임할 수 있는 업무 메뉴를 선택해 주세요.');
  return [...new Set(input)].sort((left,right)=>left.localeCompare(right));
}

/** Existing explicit central assignments retain their service duties until an Admin narrows them. */
export async function centralOperationMenuKeys(db: Db, userId: string, roles: readonly string[]): Promise<string[]> {
  if (roles.includes('platform:super_admin')) return centralMenusForRole('platform:super_admin').map(menu => menu.key);
  const assignments: Array<{ role: string; menuKeys: string[] | null }> = await db.query(
    `SELECT ra.role,g.menu_keys AS "menuKeys" FROM role_assignments ra
     LEFT JOIN central_operation_menu_grants g ON g.assignment_id=ra.id
     WHERE ra.user_id=$1 AND ra.role=ANY($2::text[]) AND (ra.scope_type=$3 OR (ra.role=ANY($4::text[]) AND g.admin_operations=true)) AND ra.is_active=true
     AND (ra.valid_from IS NULL OR ra.valid_from<=now()) AND (ra.valid_until IS NULL OR ra.valid_until>=now())`,
    [userId, roles, CENTRAL_DELEGATION_SCOPE, ADMIN_OPERATIONS_OPERATOR_ROLES],
  );
  return [...new Set(assignments.flatMap(assignment => {
    const available = centralMenusForRole(assignment.role).map(menu => menu.key);
    return assignment.menuKeys === null ? available : available.filter(key => assignment.menuKeys!.includes(key));
  }))];
}

/** Additional restriction for centrally delegated operators, preserving independent/local service operators. */
export async function centralServiceMenuRestrictions(db: Db, userId: string, service: CentralOperationService): Promise<string[] | null> {
  const [provenance] = await db.query(`SELECT 1 FROM role_assignments WHERE user_id=$1 AND scope_type=$2 AND is_active=true
    AND role=ANY($3::text[]) LIMIT 1`, [userId, CENTRAL_DELEGATION_SCOPE,
      [`${service}:admin`, `${service}:operator`, ...(service === 'pharmcoop' ? ['neture:pharmcoop_admin', 'neture:pharmcoop_operator'] : [])]]);
  if (!provenance) return null; // The existing service/organization gate remains the authority for non-central assignments.
  const roles = await centralOperationRoles(db, userId);
  if (roles.includes('platform:super_admin')) return null;
  const relevant = roles.filter(role => centralServiceForRole(role) === service);
  return centralOperationMenuKeys(db, userId, relevant);
}
export async function assertCentralOperationMenu(db: Db, userId: string, service: CentralOperationService, requested: readonly string[]) {
  const keys = await centralServiceMenuRestrictions(db,userId,service);
  if (keys === null) return;
  if (!requested.some(key => key.startsWith(`${service}.`) && keys.includes(key)))
    throw new OperationError(403, 'CENTRAL_MENU_NOT_DELEGATED', '이 업무 메뉴를 위임받지 않았거나 권한이 회수되었습니다.');
}

/** Central operations require Google proof; ordinary member/provider flows do not use this gate. */
export async function assertCentralOperationRequest(db: Db, userId: string, service: CentralOperationService, requested: readonly string[], authMethod?: string) {
  const keys = await centralServiceMenuRestrictions(db,userId,service);
  if (keys === null) return;
  if (authMethod !== 'google') throw new OperationError(403,'CENTRAL_GOOGLE_REQUIRED','직영 운영 업무는 Google로 로그인해 주세요.');
  if (!requested.some(key => keys.includes(key))) throw new OperationError(403,'CENTRAL_MENU_NOT_DELEGATED','이 업무를 위임받지 않았습니다.');
}

async function platformAdmin(db: Db, actor: string) {
  if (!(await centralOperationRoles(db, actor, true)).includes('platform:super_admin'))
    throw new OperationError(403, 'CENTRAL_MENU_ADMIN_REQUIRED', '통합 관리자의 업무 위임 권한이 필요합니다.');
}
async function assignment(db: Db, userId: string, role: string, lock = false) {
  const [row] = await db.query(`SELECT id FROM role_assignments ra WHERE user_id=$1 AND role=$2 AND is_active=true
    AND (scope_type=$3 OR (role=ANY($4::text[]) AND EXISTS (
      SELECT 1 FROM central_operation_menu_grants g WHERE g.assignment_id=ra.id AND g.admin_operations=true)))
    AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now()) ${lock ? 'FOR UPDATE' : ''}`, [userId, role, CENTRAL_DELEGATION_SCOPE, ADMIN_OPERATIONS_OPERATOR_ROLES]);
  if (!row || !centralMenusForRole(role).length || role === 'platform:super_admin')
    throw new OperationError(404, 'CENTRAL_ASSIGNMENT_NOT_FOUND', '유효한 직영 업무 위임을 찾을 수 없습니다. 초대 수락과 역할 유효기간을 확인해 주세요.');
  return String(row.id);
}

export class CentralOperationMenuGrantService {
  constructor(private readonly db: Pick<DataSource, 'transaction'>) {}
  read(actor: string, userId: string, role: string) {
    return this.db.transaction(async m => {
      await platformAdmin(m, actor);
      const id = await assignment(m, userId, role);
      const [grant]: Grant[] = await m.query(`SELECT ${grantColumns} FROM central_operation_menu_grants WHERE assignment_id=$1`, [id]);
      const available = centralMenusForRole(role);
      return { assignmentId: id, role, available, menuKeys: grant?.menuKeys ?? available.map(menu => menu.key), version: grant?.version ?? null };
    });
  }
  async update(actor: string, userId: string, role: string, input: { menuKeys: unknown; reason: unknown; version: string | null }) {
    const menuKeys = validateCentralMenuKeys(role, input.menuKeys);
    const reason = operationReason(input.reason);
    return this.db.transaction(async m => {
      await lockOperatorAssignments(m, userId);
      await platformAdmin(m, actor);
      const id = await assignment(m, userId, role, true);
      const [prior]: Grant[] = await m.query(`SELECT ${grantColumns} FROM central_operation_menu_grants WHERE assignment_id=$1 FOR UPDATE`, [id]);
      if ((prior?.version ?? null) !== input.version) throw new OperationError(409, 'CENTRAL_MENU_GRANTS_CHANGED', '다른 관리자가 변경했습니다. 다시 조회한 뒤 설정해 주세요.');
      const [saved]: Grant[] = await m.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) VALUES($1,$2)
        ON CONFLICT(assignment_id) DO UPDATE SET menu_keys=$2,updated_at=clock_timestamp() RETURNING ${grantColumns}`, [id, menuKeys]);
      await recordOperation(m, role.split(':')[0], actor, 'operator.central_menu_grants_changed', { targetUserId: userId, role, menuKeys, reason });
      return saved;
    });
  }
}
