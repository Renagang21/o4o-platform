import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2
 *
 * role_assignments 테이블에 남아있는 unprefixed role 값을 prefixed 형식으로 변환.
 * 예: 'admin' → 'platform:admin', 'operator' → 'platform:operator'
 *
 * 배경: Frontend/Backend 모두 prefixed role('service:role')을 기준으로 통일됨.
 * unprefixed role은 더 이상 인식되지 않으므로, DB 데이터도 일치시켜야 함.
 */
export class PrefixUnprefixedRoles1771200000019 implements MigrationInterface {
  name = 'PrefixUnprefixedRoles1771200000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 안전 버전: 알려진 unprefixed role만 변환
    const result = await queryRunner.query(`
      UPDATE role_assignments
      SET role = CASE
        WHEN role IN ('admin', 'operator', 'super_admin') THEN 'platform:' || role
        ELSE role
      END,
      updated_at = NOW()
      WHERE role NOT LIKE '%:%'
      AND is_active = true
    `);

    // 검증: unprefixed role이 남아있으면 경고 로그
    const remaining = await queryRunner.query(`
      SELECT role, COUNT(*)::int AS cnt
      FROM role_assignments
      WHERE role NOT LIKE '%:%'
      AND is_active = true
      GROUP BY role
      ORDER BY role
    `);

    if (remaining.length > 0) {
      console.warn(
        '[Migration] Unprefixed roles still remain (inactive or unknown):',
        remaining,
      );
    }

    console.warn('[Migration] PrefixUnprefixedRoles completed. Rows affected:', result?.[1] ?? 'unknown');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: strip 'platform:' prefix
    await queryRunner.query(`
      UPDATE role_assignments
      SET role = REPLACE(role, 'platform:', ''),
      updated_at = NOW()
      WHERE role IN ('platform:admin', 'platform:operator', 'platform:super_admin')
      AND is_active = true
    `);
  }
}
