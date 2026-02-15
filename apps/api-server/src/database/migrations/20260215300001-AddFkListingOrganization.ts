/**
 * Migration: Add FK constraint to organization_product_listings.organization_id
 *
 * WO-PHARMACY-TREE-PHYSICAL-INTEGRITY-FIX-V1 — Phase 1
 *
 * IR-PHARMACY-HUB-TREE-INTEGRITY-VALIDATION-V1 발견사항:
 * Level 2 (Product Ownership) organization_id에 FK 제약 없음.
 * organization 삭제 시 orphan listing 발생 가능.
 *
 * ON DELETE RESTRICT: organization_channels과 동일 정책.
 * org 삭제 시 listing이 존재하면 차단 → 안전한 정리 절차 강제.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFkListingOrganization20260215300001 implements MigrationInterface {
  name = 'AddFkListingOrganization20260215300001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety: orphan check — 존재하면 FK 생성 실패하므로 사전 점검
    const orphans = await queryRunner.query(`
      SELECT opl.id, opl.organization_id
      FROM organization_product_listings opl
      LEFT JOIN kpa_organizations ko ON ko.id = opl.organization_id
      WHERE ko.id IS NULL
    `);

    if (orphans.length > 0) {
      console.warn(
        `[Migration] Found ${orphans.length} orphan listing(s). Deleting before FK creation.`,
        orphans.map((o: { id: string }) => o.id)
      );
      const orphanIds = orphans.map((o: { id: string }) => `'${o.id}'`).join(',');
      // Delete orphan product_channels first (CASCADE would handle this, but be explicit)
      await queryRunner.query(`
        DELETE FROM organization_product_channels
        WHERE product_listing_id IN (${orphanIds})
      `);
      await queryRunner.query(`
        DELETE FROM organization_product_listings
        WHERE id IN (${orphanIds})
      `);
    }

    // Check if FK already exists
    const fkExists = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'organization_product_listings'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'FK_listing_organization'
    `);

    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "organization_product_listings"
        ADD CONSTRAINT "FK_listing_organization"
        FOREIGN KEY ("organization_id")
        REFERENCES "kpa_organizations"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization_product_listings"
      DROP CONSTRAINT IF EXISTS "FK_listing_organization"
    `);
  }
}
