import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-ROLE-DATA-NORMALIZATION-V1
 *
 * KPA-B 데모 서비스 운영자에게 할당된 generic role(admin, operator)을
 * 진단하고 정리한다.
 *
 * 문제: 동일 사용자에게 서비스 역할(kpa-b:district 등)과
 * generic 역할(operator, admin)이 함께 존재하여 운영자 목록에서
 * 중복 표시됨.
 *
 * 정리 원칙:
 * - kpa-b:* 역할을 가진 사용자의 generic admin/operator 역할을 비활성화
 * - 다른 서비스(neture, kpa-a 등)의 역할이 있는 사용자는 제외
 */
export class KpaBRoleDataNormalization1771200000009 implements MigrationInterface {
  name = 'KpaBRoleDataNormalization1771200000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: 진단 — KPA 관련 role_assignments 전체 조회
    const allKpaRoles = await queryRunner.query(`
      SELECT ra.user_id, ra.role, ra.is_active, ra.scope_type,
             u.email, u.name
      FROM role_assignments ra
      JOIN users u ON u.id = ra.user_id
      WHERE ra.is_active = true
        AND (ra.role LIKE 'kpa%' OR ra.role IN ('admin', 'operator', 'user'))
      ORDER BY ra.user_id, ra.role
    `);
    console.log('[KPA-B Normalization] Step 1: All KPA-related active role_assignments:');
    for (const r of allKpaRoles) {
      console.log(`  ${r.email} | ${r.role} | scope=${r.scope_type || 'null'}`);
    }

    // Step 2: kpa-b:* 역할을 가진 사용자 식별
    const kpaBUsers = await queryRunner.query(`
      SELECT DISTINCT user_id
      FROM role_assignments
      WHERE is_active = true
        AND role LIKE 'kpa-b:%'
    `);
    const kpaBUserIds = kpaBUsers.map((r: { user_id: string }) => r.user_id);
    console.log(`[KPA-B Normalization] Step 2: Users with kpa-b roles: ${kpaBUserIds.length}`);

    if (kpaBUserIds.length === 0) {
      console.log('[KPA-B Normalization] No kpa-b users found. Skipping cleanup.');
      return;
    }

    // Step 3: kpa-b 사용자 중 generic role도 가진 사용자 찾기
    const duplicates = await queryRunner.query(`
      SELECT ra.id, ra.user_id, ra.role, u.email, u.name
      FROM role_assignments ra
      JOIN users u ON u.id = ra.user_id
      WHERE ra.is_active = true
        AND ra.role IN ('admin', 'operator')
        AND ra.user_id IN (
          SELECT DISTINCT user_id FROM role_assignments
          WHERE is_active = true AND role LIKE 'kpa-b:%'
        )
    `);

    console.log(`[KPA-B Normalization] Step 3: Duplicate generic roles found: ${duplicates.length}`);
    for (const d of duplicates) {
      console.log(`  DEACTIVATE: ${d.email} | generic role="${d.role}" | id=${d.id}`);
    }

    // Step 4: generic role 비활성화 (삭제 아님)
    if (duplicates.length > 0) {
      const ids = duplicates.map((d: { id: string }) => `'${d.id}'`).join(',');
      await queryRunner.query(`
        UPDATE role_assignments
        SET is_active = false
        WHERE id IN (${ids})
      `);
      console.log(`[KPA-B Normalization] Step 4: Deactivated ${duplicates.length} generic role(s)`);
    }

    // Step 5: 정리 후 확인
    const afterCleanup = await queryRunner.query(`
      SELECT ra.user_id, ra.role, ra.is_active, u.email
      FROM role_assignments ra
      JOIN users u ON u.id = ra.user_id
      WHERE ra.user_id IN (
        SELECT DISTINCT user_id FROM role_assignments
        WHERE role LIKE 'kpa-b:%'
      )
      ORDER BY ra.user_id, ra.role
    `);
    console.log('[KPA-B Normalization] Step 5: After cleanup:');
    for (const r of afterCleanup) {
      console.log(`  ${r.email} | ${r.role} | active=${r.is_active}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: reactivate deactivated generic roles for kpa-b users
    await queryRunner.query(`
      UPDATE role_assignments
      SET is_active = true
      WHERE is_active = false
        AND role IN ('admin', 'operator')
        AND user_id IN (
          SELECT DISTINCT user_id FROM role_assignments
          WHERE role LIKE 'kpa-b:%'
        )
    `);
    console.log('[KPA-B Normalization] Reverted: Reactivated generic roles for kpa-b users');
  }
}
