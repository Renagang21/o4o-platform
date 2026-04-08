import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-PHARMACY-OWNER-SIGNUP-AND-APPROVAL-FLOW-ALIGNMENT-V1
 *
 * 기존 pending 상태의 GlycoPharm 약국 경영자 사용자에 대해
 * glycopharm_applications 레코드를 백필한다.
 *
 * 조건:
 * - service_memberships(serviceKey='glycopharm', status='pending', role='pharmacy')
 * - users.businessInfo->>'businessName' 또는 users.name 존재
 * - glycopharm_applications에 해당 user_id 미존재
 *
 * 효과:
 * - 기존에 가입했지만 운영자 승인 화면에 보이지 않던 약국 경영자 신청이
 *   GlycoPharm 신청 목록에 노출되어 정상 승인 가능
 *
 * 멱등: 이미 application이 있는 user는 건너뜀
 */
export class BackfillGlycopharmApplicationsForPendingPharmacy20260406400000
  implements MigrationInterface {
  name = 'BackfillGlycopharmApplicationsForPendingPharmacy20260406400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // service_memberships + glycopharm_applications 테이블 존재 확인
    const hasMembershipsTable = await queryRunner.hasTable('service_memberships');
    const hasAppsTable = await queryRunner.hasTable('glycopharm_applications');
    if (!hasMembershipsTable || !hasAppsTable) {
      return;
    }

    // pending 약국 경영자 사용자 조회
    const pendingPharmacyUsers = await queryRunner.query(
      `SELECT DISTINCT
         u.id AS user_id,
         u.name AS user_name,
         u."businessInfo" AS business_info
       FROM users u
       JOIN service_memberships sm ON sm."userId" = u.id
       WHERE sm."serviceKey" = 'glycopharm'
         AND sm.status = 'pending'
         AND sm.role = 'pharmacy'
         AND NOT EXISTS (
           SELECT 1 FROM glycopharm_applications ga WHERE ga.user_id = u.id
         )`,
    );

    let backfilled = 0;
    for (const row of pendingPharmacyUsers) {
      const businessInfo = row.business_info || {};
      const businessName = businessInfo.businessName || row.user_name || '미상 약국';
      const businessNumber = businessInfo.businessNumber || null;

      await queryRunner.query(
        `INSERT INTO glycopharm_applications (
          id, user_id, organization_type, organization_name, business_number,
          service_types, status, submitted_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'pharmacy', $2, $3,
          '["dropshipping"]'::jsonb, 'submitted', NOW(), NOW(), NOW()
        )
        ON CONFLICT DO NOTHING`,
        [row.user_id, businessName, businessNumber],
      );
      backfilled++;
    }

    // 결과 metadata로 출력 (console.log는 lint에 걸리므로 사용 안 함)
    if (backfilled > 0) {
      // 마이그레이션 자체는 idempotent이므로 결과는 typeorm migration log로 확인
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 되돌리지 않음 — 백필 작업
  }
}
