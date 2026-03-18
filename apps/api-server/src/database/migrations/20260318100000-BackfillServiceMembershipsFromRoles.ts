import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-OPERATOR-CREATION-FLOW-FIX-V1: Backfill service_memberships
 *
 * Admin에서 생성된 operator는 role_assignments만 있고 service_memberships가 없었음.
 * 이 마이그레이션은 role_assignments에서 'service:role' 형태의 역할을 가진 사용자 중
 * 대응하는 service_memberships가 없는 경우 자동 생성한다.
 *
 * 조건:
 *   - role_assignments.role에 ':' 포함 (service:role 형태)
 *   - 대응하는 service_memberships 레코드 미존재
 *   - role_assignments.is_active = true
 */
export class BackfillServiceMembershipsFromRoles20260318100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 백필 대상 확인 (dry-run 로그)
    const orphaned = await queryRunner.query(`
      SELECT ra.user_id, ra.role,
             SPLIT_PART(ra.role, ':', 1) AS service_key,
             SPLIT_PART(ra.role, ':', 2) AS role_name
      FROM role_assignments ra
      LEFT JOIN service_memberships sm
        ON sm.user_id = ra.user_id
       AND sm.service_key = SPLIT_PART(ra.role, ':', 1)
      WHERE ra.is_active = true
        AND ra.role LIKE '%:%'
        AND sm.id IS NULL
    `);

    console.log(`[BackfillServiceMemberships] Found ${orphaned.length} orphaned role_assignments without service_memberships`);
    for (const row of orphaned) {
      console.log(`  → user_id=${row.user_id}, role=${row.role}, service_key=${row.service_key}`);
    }

    if (orphaned.length === 0) {
      console.log('[BackfillServiceMemberships] No backfill needed. Skipping.');
      return;
    }

    // 2. 백필 INSERT — ON CONFLICT 안전 처리
    const result = await queryRunner.query(`
      INSERT INTO service_memberships (id, user_id, service_key, role, status, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        ra.user_id,
        SPLIT_PART(ra.role, ':', 1),
        SPLIT_PART(ra.role, ':', 2),
        'active',
        NOW(),
        NOW()
      FROM role_assignments ra
      LEFT JOIN service_memberships sm
        ON sm.user_id = ra.user_id
       AND sm.service_key = SPLIT_PART(ra.role, ':', 1)
      WHERE ra.is_active = true
        AND ra.role LIKE '%:%'
        AND sm.id IS NULL
      ON CONFLICT (user_id, service_key) DO NOTHING
    `);

    console.log(`[BackfillServiceMemberships] Inserted ${result?.[1] ?? 'unknown'} service_memberships`);

    // 3. 결과 검증
    const verify = await queryRunner.query(`
      SELECT COUNT(*)::int AS total_with_membership
      FROM role_assignments ra
      INNER JOIN service_memberships sm
        ON sm.user_id = ra.user_id
       AND sm.service_key = SPLIT_PART(ra.role, ':', 1)
      WHERE ra.is_active = true
        AND ra.role LIKE '%:%'
    `);
    console.log(`[BackfillServiceMemberships] Verification: ${verify[0]?.total_with_membership} role_assignments now have matching service_memberships`);

    const stillOrphaned = await queryRunner.query(`
      SELECT COUNT(*)::int AS cnt
      FROM role_assignments ra
      LEFT JOIN service_memberships sm
        ON sm.user_id = ra.user_id
       AND sm.service_key = SPLIT_PART(ra.role, ':', 1)
      WHERE ra.is_active = true
        AND ra.role LIKE '%:%'
        AND sm.id IS NULL
    `);
    console.log(`[BackfillServiceMemberships] Remaining orphans: ${stillOrphaned[0]?.cnt}`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Backfill은 되돌리지 않음 — membership 삭제는 위험
    console.log('[BackfillServiceMemberships] down() is no-op — backfilled memberships are kept');
  }
}
