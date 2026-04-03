import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-SOCIETY-SECOND-REVIEW-BRIDGE-FOUNDATION-V1
 *
 * 이미 kpa-society가 approved된 기존 offers에 대해
 * product_approvals PENDING row를 백필한다.
 *
 * 이후 Neture 승인 시에는 syncOfferFromServiceApprovals()에서 자동 생성.
 */
export class BackfillKpaSecondReviewPendingRows1712195400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`
      INSERT INTO product_approvals (offer_id, organization_id, service_key, approval_type, approval_status, metadata)
      SELECT osa.offer_id,
             'a0000000-0a00-4000-a000-000000000001',
             'kpa-society',
             'service',
             'pending',
             '{"source":"backfill_bridge"}'::jsonb
      FROM offer_service_approvals osa
      WHERE osa.service_key = 'kpa-society'
        AND osa.approval_status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM product_approvals pa
          WHERE pa.offer_id = osa.offer_id
            AND pa.organization_id = 'a0000000-0a00-4000-a000-000000000001'
            AND pa.approval_type = 'service'
        )
    `);

    console.log(`[BackfillKpaSecondReview] Backfilled ${result[1] ?? 0} product_approvals PENDING rows`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM product_approvals
      WHERE service_key = 'kpa-society'
        AND approval_type = 'service'
        AND organization_id = 'a0000000-0a00-4000-a000-000000000001'
        AND metadata->>'source' = 'backfill_bridge'
    `);
  }
}
