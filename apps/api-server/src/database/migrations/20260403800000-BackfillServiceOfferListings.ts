import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-SERVICE-DISTRIBUTION-AUTO-EXPAND-V1
 *
 * Backfill: 기존 승인 완료된 SERVICE offer에 대해 누락된 organization_product_listings 생성.
 * 이전에는 distribution_type='SERVICE' 승인 후 auto-expand가 없어서 listing이 생성되지 않았음.
 *
 * 멱등: ON CONFLICT DO NOTHING으로 이미 존재하는 listing은 skip.
 */
export class BackfillServiceOfferListings1714700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`
      INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id,
         is_active, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        ose.organization_id,
        ose.service_code,
        spo.master_id,
        spo.id,
        false,
        NOW(), NOW()
      FROM supplier_product_offers spo
      JOIN offer_service_approvals osa ON osa.offer_id = spo.id
        AND osa.approval_status = 'approved'
      JOIN organization_service_enrollments ose ON ose.service_code = osa.service_key
        AND ose.status = 'active'
      JOIN organizations o ON o.id = ose.organization_id
        AND o."isActive" = true
      WHERE spo.distribution_type = 'SERVICE'
        AND spo.approval_status = 'APPROVED'
        AND spo.is_active = true
      ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING
    `);

    const count = Array.isArray(result) ? result.length : (result as any).rowCount ?? 0;
    console.log(`[BackfillServiceOfferListings] Created ${count} listings for existing approved SERVICE offers`);
  }

  public async down(): Promise<void> {
    // Backfill은 멱등적이므로 rollback은 no-op
  }
}
