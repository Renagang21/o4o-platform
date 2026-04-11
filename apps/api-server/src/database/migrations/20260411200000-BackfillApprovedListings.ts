import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-PRODUCT-APPROVAL-LISTING-UPSERT-FIX-V1
 *
 * 기존에 승인(approved)되었지만 organization_product_listings가 생성되지 않은
 * product_approvals에 대해 listing을 백필한다.
 *
 * 원인: UPSERT 코드가 배포되기 전에 승인된 건은 listing row가 없다.
 * 이 마이그레이션은 해당 갭을 메운다.
 *
 * 멱등성: INSERT ... ON CONFLICT DO UPDATE — 이미 listing이 있으면 is_active=true로 갱신.
 */
export class BackfillApprovedListings20260411200000 implements MigrationInterface {
  name = 'BackfillApprovedListings20260411200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 승인 완료(approved)인데 listing이 없는 건을 찾아 INSERT
    const result = await queryRunner.query(`
      INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id, is_active, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        pa.organization_id,
        pa.service_key,
        spo.master_id,
        pa.offer_id,
        true,
        NOW(),
        NOW()
      FROM product_approvals pa
      JOIN supplier_product_offers spo ON spo.id = pa.offer_id
      WHERE pa.approval_status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM organization_product_listings opl
          WHERE opl.organization_id = pa.organization_id
            AND opl.offer_id = pa.offer_id
        )
      ON CONFLICT (organization_id, service_key, offer_id)
      DO UPDATE SET is_active = true, updated_at = NOW()
      RETURNING organization_id, offer_id, service_key
    `);

    console.log(`[Migration] BackfillApprovedListings: ${result.length} listings created/activated`);
    for (const row of result) {
      console.log(`  - org=${row.organization_id}, offer=${row.offer_id}, svc=${row.service_key}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // down()은 no-op — 생성된 listing을 제거하면 약국 매장에서 상품이 사라짐
    console.log('[Migration] BackfillApprovedListings down: no-op (removing listings would break store display)');
  }
}
