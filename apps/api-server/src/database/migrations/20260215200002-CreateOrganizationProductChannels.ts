/**
 * Migration: Create organization_product_channels table
 *
 * WO-PHARMACY-HUB-OWNERSHIP-RESTRUCTURE-PHASE1-V1
 *
 * 채널별 상품 진열 매핑 테이블.
 * organization_channels ↔ organization_product_listings 을 연결하여
 * 어떤 상품이 어떤 채널(B2C, KIOSK 등)에서 판매되는지를 결정한다.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationProductChannels20260215200002 implements MigrationInterface {
  name = 'CreateOrganizationProductChannels20260215200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: check if table already exists
    const tableExists = await queryRunner.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'organization_product_channels'
    `);

    if (tableExists.length > 0) {
      return;
    }

    // Create table
    await queryRunner.query(`
      CREATE TABLE "organization_product_channels" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "channel_id" UUID NOT NULL,
        "product_listing_id" UUID NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "display_order" INTEGER NOT NULL DEFAULT 0,
        "channel_price" INTEGER,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_channel_product" UNIQUE ("channel_id", "product_listing_id"),
        CONSTRAINT "FK_product_channel_channel" FOREIGN KEY ("channel_id")
          REFERENCES "organization_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_product_channel_listing" FOREIGN KEY ("product_listing_id")
          REFERENCES "organization_product_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    // Index for channel lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_product_channel_channel_id" ON "organization_product_channels" ("channel_id")
    `);

    // Index for product listing lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_product_channel_listing_id" ON "organization_product_channels" ("product_listing_id")
    `);

    // Index for active products per channel
    await queryRunner.query(`
      CREATE INDEX "IDX_product_channel_active" ON "organization_product_channels" ("channel_id", "is_active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_product_channels"`);
  }
}
