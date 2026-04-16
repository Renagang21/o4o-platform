/**
 * Migration: BackfillPharmacyToGlycopharmPharmacist
 *
 * WO-GLYCOPHARM-ACCESS-POLICY-AND-ROLE-CLEANUP-V1 — Phase 1
 *
 * role_assignments 에서 role = 'pharmacy' (레거시) 인 모든 행을
 * role = 'glycopharm:pharmacist' 로 변환한다.
 *
 * 사전 조건:
 *   - glycopharm:pharmacist 역할이 이미 정상 사용 중이어야 한다.
 *   - 동일 userId에 이미 glycopharm:pharmacist가 있으면 pharmacy 행 삭제(중복 방지).
 *
 * ⚠️  실행 전 확인 쿼리:
 *     SELECT role, COUNT(*) FROM role_assignments
 *     WHERE role IN ('pharmacy','glycopharm:pharmacist') AND is_active=true
 *     GROUP BY role;
 *
 * ✅ 실행 후 검증 쿼리:
 *     SELECT role, COUNT(*) FROM role_assignments
 *     WHERE role IN ('pharmacy','glycopharm:pharmacist')
 *     GROUP BY role;
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillPharmacyToGlycopharmPharmacist20260416000001 implements MigrationInterface {
  name = 'BackfillPharmacyToGlycopharmPharmacist20260416000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: 이미 glycopharm:pharmacist를 가진 userId에 대해 pharmacy 행 삭제 (중복 제거)
    await queryRunner.query(`
      DELETE FROM role_assignments ra
      WHERE ra.role = 'pharmacy'
        AND EXISTS (
          SELECT 1 FROM role_assignments ra2
          WHERE ra2.user_id = ra.user_id
            AND ra2.role = 'glycopharm:pharmacist'
            AND ra2.is_active = true
        )
    `);

    // Step 2: 남은 pharmacy 행을 glycopharm:pharmacist 로 변환
    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'glycopharm:pharmacist',
          updated_at = NOW()
      WHERE role = 'pharmacy'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백: glycopharm:pharmacist → pharmacy
    // 안전을 위해 down은 수동 확인 후 실행 권장
    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'pharmacy',
          updated_at = NOW()
      WHERE role = 'glycopharm:pharmacist'
    `);
  }
}
