import type { EntityManager } from 'typeorm';
import { OperationError } from './operation-audit.js';

/** Target policy for Operator workflows; never grants additional read scope. */
export const protectedMemberSql = (userExpression: string) => `EXISTS(SELECT 1 FROM role_assignments protected_role
 WHERE protected_role.user_id=${userExpression} AND protected_role.role='platform:super_admin'
 AND protected_role.is_active=true AND (protected_role.valid_from IS NULL OR protected_role.valid_from<=now())
 AND (protected_role.valid_until IS NULL OR protected_role.valid_until>=now()))`;

export async function assertOperatorMemberTarget(db: Pick<EntityManager, 'query'>, userId: string) {
  const [row] = await db.query(`SELECT ${protectedMemberSql('$1::uuid')} AS protected`, [userId]);
  if (row?.protected === true)
    throw new OperationError(403, 'ADMIN_ACCOUNT_PROTECTED', '전체 관리자 — 처리 대상 아님');
}
