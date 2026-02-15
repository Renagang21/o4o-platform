/**
 * Migration: Create organization_product_listings table
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 *
 * 승인된 상품의 매장 진열 정보.
 * 약국 개설자가 승인받은 상품을 자신의 매장에 진열할 때 사용.
 * retail_price, display_order, is_active 등 매장별 설정 관리.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationProductListings20260215000021 implements MigrationInterface {
  name = 'CreateOrganizationProductListings20260215000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: check if table already exists
    const tableExists = await queryRunner.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'organization_product_listings'
    `);

    if (tableExists.length === 0) {
      await queryRunner.query(`
        CREATE TABLE "organization_product_listings" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "organization_id" UUID NOT NULL,
          "service_key" VARCHAR(50) NOT NULL DEFAULT 'kpa',
          "external_product_id" VARCHAR(200) NOT NULL,
          "product_name" VARCHAR(300) NOT NULL,
          "product_metadata" JSONB NOT NULL DEFAULT '{}',
          "retail_price" INTEGER,
          "is_active" BOOLEAN NOT NULL DEFAULT true,
          "display_order" INTEGER NOT NULL DEFAULT 0,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT "UQ_org_product_listing_unique" UNIQUE ("organization_id", "service_key", "external_product_id")
        )
      `);

      // Indexes
      await queryRunner.query(`
        CREATE INDEX "IDX_org_product_listing_org_id" ON "organization_product_listings" ("organization_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_org_product_listing_active" ON "organization_product_listings" ("is_active")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_product_listings"`);
  }
}
