/**
 * WO-KPA-PHARMACY-IDENTITY-REALIGN-V1
 *
 * 오염 데이터 정리:
 * 1. pharmacy_join 승인으로 잘못 부여된 kpa-c:branch_admin 제거
 * 2. pharmacy_join 승인 사용자에게 pharmacist_role = 'pharmacy_owner' 설정
 *
 * 조건: kpa_organization_join_requests에서 pharmacy_join + approved인 사용자만 대상.
 * 실제 분회 관리자(별도 admin 승인 이력 존재)는 제외.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class PharmacyIdentityRealign20260219000004 implements MigrationInterface {
  name = 'PharmacyIdentityRealign20260219000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: pharmacy_join 승인 사용자에게 pharmacist_role 설정
    const step1Result = await queryRunner.query(`
      UPDATE users u
      SET pharmacist_role = 'pharmacy_owner'
      FROM kpa_organization_join_requests r
      WHERE r.user_id = u.id
        AND r.request_type = 'pharmacy_join'
        AND r.status = 'approved'
        AND (u.pharmacist_role IS NULL OR u.pharmacist_role != 'pharmacy_owner')
    `);
    console.log(`[PharmacyIdentityRealign] Step 1: pharmacist_role set for ${step1Result?.[1] ?? 0} users`);

    // Step 2: pharmacy_join으로만 branch_admin을 받은 사용자에서 해당 role 제거
    // 별도 admin 승인(join/promotion 등)이 있는 실제 분회 관리자는 제외
    const step2Result = await queryRunner.query(`
      UPDATE users u
      SET roles = array_remove(u.roles, 'kpa-c:branch_admin')
      FROM kpa_organization_join_requests r
      WHERE r.user_id = u.id
        AND r.request_type = 'pharmacy_join'
        AND r.status = 'approved'
        AND 'kpa-c:branch_admin' = ANY(u.roles)
        AND NOT EXISTS (
          SELECT 1 FROM kpa_organization_join_requests r2
          WHERE r2.user_id = u.id
            AND r2.request_type != 'pharmacy_join'
            AND r2.status = 'approved'
            AND r2.requested_role = 'admin'
        )
    `);
    console.log(`[PharmacyIdentityRealign] Step 2: kpa-c:branch_admin removed from ${step2Result?.[1] ?? 0} users`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: pharmacy_join 승인 사용자의 pharmacist_role 원복 + branch_admin 복원
    // 주의: 완전한 원복이 아닌 best-effort (원래 값을 모르므로)
    console.log('[PharmacyIdentityRealign] down: manual review required for rollback');
  }
}
