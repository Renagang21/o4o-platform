import type { EntityManager } from 'typeorm';
import { resolveRolePrefixFromCanonicalServiceKey } from '@o4o/security-core';
import { OperationError } from './operation-audit.js';

/** Removing membership must not bypass central operator/last-admin role protections. */
export async function assertOrdinaryServiceMember(manager: Pick<EntityManager, 'query'>, userId: string, serviceKeys: string[]) {
  const protectedRoles = serviceKeys.flatMap(key => {
    const prefix = resolveRolePrefixFromCanonicalServiceKey(key);
    return [`${prefix}:admin`, `${prefix}:operator`];
  });
  const roles = await manager.query(`SELECT role FROM role_assignments WHERE user_id=$1 AND role=ANY($2::text[])
    AND is_active=true AND (valid_from IS NULL OR valid_from<=CURRENT_TIMESTAMP)
    AND (valid_until IS NULL OR valid_until>=CURRENT_TIMESTAMP) FOR UPDATE`, [userId, protectedRoles]);
  if (roles.length) throw new OperationError(409, 'OPERATIONAL_MEMBER_PROTECTED', '활성 서비스 운영 권한을 중앙 운영자 관리에서 먼저 정리해 주세요.');
}
