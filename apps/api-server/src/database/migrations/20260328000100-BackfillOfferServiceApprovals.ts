import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PRODUCT-APPROVAL-DATA-SOURCE-UNIFICATION-V1
 *
 * supplier_product_offers 중 offer_service_approvals 레코드가 없는 건에 대해
 * 'neture' service approval을 backfill.
 *
 * 조건부 INSERT — 이미 존재하는 건은 skip (ON CONFLICT DO NOTHING).
 */
export class BackfillOfferServiceApprovals1711584060000 implements MigrationInterface {
  name = 'BackfillOfferServiceApprovals1711584060000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 누락 건수 사전 확인
    const missing = await queryRunner.query(`
      SELECT COUNT(*)::int AS cnt
      FROM supplier_product_offers spo
      WHERE NOT EXISTS (
        SELECT 1 FROM offer_service_approvals osa
        WHERE osa.offer_id = spo.id
      )
    `);
    const missingCount = missing[0]?.cnt || 0;
    console.log(`[BackfillOSA] Missing service approvals: ${missingCount} offers`);

    if (missingCount === 0) {
      console.log('[BackfillOSA] No backfill needed');
      return;
    }

    // offer의 approval_status에 따라 service approval 상태 결정:
    //   PENDING → 'pending', APPROVED → 'approved', REJECTED → 'rejected'
    const result = await queryRunner.query(`
      INSERT INTO offer_service_approvals (offer_id, service_key, approval_status, created_at, updated_at)
      SELECT
        spo.id,
        'neture',
        CASE
          WHEN spo.approval_status = 'APPROVED' THEN 'approved'
          WHEN spo.approval_status = 'REJECTED' THEN 'rejected'
          ELSE 'pending'
        END,
        spo.created_at,
        NOW()
      FROM supplier_product_offers spo
      WHERE NOT EXISTS (
        SELECT 1 FROM offer_service_approvals osa
        WHERE osa.offer_id = spo.id
      )
      ON CONFLICT (offer_id, service_key) DO NOTHING
    `);

    const insertedCount = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    console.log(`[BackfillOSA] Backfilled ${insertedCount} service approval(s)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Backfill된 데이터만 제거 (service_key='neture'이고 decided_by가 NULL인 건)
    await queryRunner.query(`
      DELETE FROM offer_service_approvals
      WHERE service_key = 'neture'
        AND decided_by IS NULL
        AND created_at < '2026-03-28T00:00:00Z'
    `);
  }
}
