import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1
 *
 * User.roles[]에서 kpa-c:* 역할 제거.
 * KpaMember.role이 조직 역할의 SSOT.
 *
 * 제거 대상:
 *   - kpa-c:operator
 *   - kpa-c:branch_admin
 *   - kpa-c:branch_operator
 *
 * 전제: Phase 1-3 (Guard 교체 + 승인 로직 수정 + 프론트엔드 전환) 완료 후 실행.
 */
export class RemoveKpaCRolesFromUsers20260222200000 implements MigrationInterface {
  name = 'RemoveKpaCRolesFromUsers20260222200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rolesToRemove = ['kpa-c:operator', 'kpa-c:branch_admin', 'kpa-c:branch_operator'];

    for (const role of rolesToRemove) {
      const result = await queryRunner.query(
        `UPDATE users SET roles = array_remove(roles, $1)
         WHERE $1 = ANY(roles)`,
        [role]
      );
      const affected = result?.[1] ?? 0;
      console.log(`[RemoveKpaCRoles] Removed '${role}' from ${affected} users`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort: kpa-c:* 역할 복원은 KpaMember.role 기반으로 재계산
    // operator → kpa-c:operator, admin → kpa-c:branch_admin
    const restoreOperator = await queryRunner.query(`
      UPDATE users u
      SET roles = array_append(u.roles, 'kpa-c:operator')
      FROM kpa_members m
      WHERE m.user_id = u.id
        AND m.role = 'operator'
        AND m.status = 'active'
        AND NOT ('kpa-c:operator' = ANY(u.roles))
    `);
    console.log(`[RemoveKpaCRoles] Restored kpa-c:operator: ${restoreOperator?.[1] ?? 0} users`);

    const restoreAdmin = await queryRunner.query(`
      UPDATE users u
      SET roles = array_append(u.roles, 'kpa-c:branch_admin')
      FROM kpa_members m
      WHERE m.user_id = u.id
        AND m.role = 'admin'
        AND m.status = 'active'
        AND NOT ('kpa-c:branch_admin' = ANY(u.roles))
    `);
    console.log(`[RemoveKpaCRoles] Restored kpa-c:branch_admin: ${restoreAdmin?.[1] ?? 0} users`);
  }
}
