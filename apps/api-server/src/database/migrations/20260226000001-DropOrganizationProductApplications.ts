/**
 * Migration: Drop organization_product_applications table
 *
 * WO-PRODUCT-POLICY-V2-APPLICATION-REMOVAL-V1
 *
 * v1 application 구조 완전 제거.
 * v2 product_approvals 시스템이 전면 대체.
 * 롤백: down()에서 원본 스키마 복원 가능.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropOrganizationProductApplications20260226000001 implements MigrationInterface {
  name = 'DropOrganizationProductApplications20260226000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // FK 존재 여부 확인 (없어야 정상)
    const fks = await queryRunner.query(`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND (table_name = 'organization_product_applications'
          OR constraint_name LIKE '%organization_product_application%')
    `);

    // FK 있으면 명시적 DROP
    for (const fk of fks) {
      await queryRunner.query(
        `ALTER TABLE "${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`,
      );
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "organization_product_applications" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 원본 스키마 복원 (20260215000020 기준)
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

    await queryRunner.query(
      `CREATE INDEX "IDX_org_product_app_org_id" ON "organization_product_applications" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_org_product_app_status" ON "organization_product_applications" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_org_product_app_requested_by" ON "organization_product_applications" ("requested_by")`,
    );
  }
}
