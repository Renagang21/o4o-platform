import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-FK-ORGANIZATION-REALIGNMENT-V1
 *
 * organization_product_listings.FK_listing_organization이
 * 레거시 kpa_organizations를 참조하고 있어 모든 PUBLIC 상품 승인이 실패함.
 *
 * autoExpandPublicProduct()는 organizations + organization_service_enrollments를 사용하므로
 * FK 대상을 organizations(id)로 재지정한다.
 *
 * 안전성: Phase A UPSERT로 kpa_organizations.id == organizations.id 보장됨 (orphan 없음).
 */
export class RepointListingOrganizationFK1711440600000 implements MigrationInterface {
  name = 'RepointListingOrganizationFK1711440600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety: orphan check
    const orphans = await queryRunner.query(`
      SELECT opl.id, opl.organization_id
      FROM organization_product_listings opl
      LEFT JOIN organizations o ON o.id = opl.organization_id
      WHERE o.id IS NULL
    `);
    if (orphans.length > 0) {
      throw new Error(
        `ABORT: ${orphans.length} orphan listing(s) found without matching organizations record. Fix data first.`,
      );
    }

    // Drop legacy FK → kpa_organizations
    await queryRunner.query(`
      ALTER TABLE "organization_product_listings"
      DROP CONSTRAINT IF EXISTS "FK_listing_organization"
    `);

    // Add correct FK → organizations
    await queryRunner.query(`
      ALTER TABLE "organization_product_listings"
      ADD CONSTRAINT "FK_listing_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "organizations"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization_product_listings"
      DROP CONSTRAINT IF EXISTS "FK_listing_organization"
    `);

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
