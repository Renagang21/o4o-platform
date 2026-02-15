/**
 * Migration: Create organization_product_applications table
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 *
 * 약국 → 상품 판매 신청 테이블
 * 약국 개설자가 자신의 매장에서 판매할 상품을 신청하면,
 * 운영자가 승인/거부하는 워크플로우.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationProductApplications20260215000020 implements MigrationInterface {
  name = 'CreateOrganizationProductApplications20260215000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: check if table already exists
    const tableExists = await queryRunner.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'organization_product_applications'
    `);

    if (tableExists.length === 0) {
      await queryRunner.query(`
        CREATE TABLE "organization_product_applications" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "organization_id" UUID NOT NULL,
          "service_key" VARCHAR(50) NOT NULL DEFAULT 'kpa',
          "external_product_id" VARCHAR(200) NOT NULL,
          "product_name" VARCHAR(300) NOT NULL,
          "product_metadata" JSONB NOT NULL DEFAULT '{}',
          "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
          "reject_reason" VARCHAR(500),
          "requested_by" UUID NOT NULL,
          "requested_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "reviewed_by" UUID,
          "reviewed_at" TIMESTAMPTZ,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT "UQ_org_product_app_unique" UNIQUE ("organization_id", "service_key", "external_product_id")
        )
      `);

      // Indexes
      await queryRunner.query(`
        CREATE INDEX "IDX_org_product_app_org_id" ON "organization_product_applications" ("organization_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_org_product_app_status" ON "organization_product_applications" ("status")
      `);
      await queryRunner.query(`
        CREATE INDEX "IDX_org_product_app_requested_by" ON "organization_product_applications" ("requested_by")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_product_applications"`);
  }
}
