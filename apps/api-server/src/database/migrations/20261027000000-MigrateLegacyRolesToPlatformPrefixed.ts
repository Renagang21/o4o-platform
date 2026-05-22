import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LEGACY-ROLE-MIGRATION-V1
 *
 * role_assignments의 legacy unprefixed 역할을 platform: 접두사 형식으로 마이그레이션.
 *
 * 배경:
 *   - isPlatformAdmin()은 'platform:admin'/'platform:super_admin'만 인식
 *   - DB에 'super_admin'(legacy) 잔존 → isPlatformAdmin() FALSE 반환 → serviceScope 오판정
 *   - IR-O4O-LEGACY-ROLE-PREFIX-COMPATIBILITY-AUDIT-V1에서 실증된 위험
 *
 * 마이그레이션 범위:
 *   - super_admin → platform:super_admin
 *   - admin       → platform:admin       (존재할 경우 대비)
 *
 * 안전 처리:
 *   - 중복 방지: 이미 platform:super_admin이 있는 사용자는 중복 생성 금지
 *   - 없는 역할 수정 시 0 rows affected (안전)
 *   - DOWN: platform:super_admin → super_admin 복원
 */
export class MigrateLegacyRolesToPlatformPrefixed20261027000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. super_admin → platform:super_admin
    //    단, 이미 platform:super_admin이 있는 user는 legacy row 삭제 (중복 방지)
    await queryRunner.query(`
      DELETE FROM role_assignments ra
      WHERE ra.role = 'super_admin'
        AND EXISTS (
          SELECT 1 FROM role_assignments ra2
          WHERE ra2.user_id = ra.user_id
            AND ra2.role = 'platform:super_admin'
        )
    `);

    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'platform:super_admin',
          updated_at = NOW()
      WHERE role = 'super_admin'
    `);

    // 2. admin → platform:admin (존재할 경우 대비)
    await queryRunner.query(`
      DELETE FROM role_assignments ra
      WHERE ra.role = 'admin'
        AND EXISTS (
          SELECT 1 FROM role_assignments ra2
          WHERE ra2.user_id = ra.user_id
            AND ra2.role = 'platform:admin'
        )
    `);

    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'platform:admin',
          updated_at = NOW()
      WHERE role = 'admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'super_admin',
          updated_at = NOW()
      WHERE role = 'platform:super_admin'
    `);

    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'admin',
          updated_at = NOW()
      WHERE role = 'platform:admin'
    `);
  }
}
