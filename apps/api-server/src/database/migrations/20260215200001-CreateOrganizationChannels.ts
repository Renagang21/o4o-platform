/**
 * Migration: Create organization_channels table
 *
 * WO-PHARMACY-HUB-OWNERSHIP-RESTRUCTURE-PHASE1-V1
 *
 * 약국(organization)이 소유하는 판매 채널 테이블.
 * 각 약국은 B2C, KIOSK, TABLET, SIGNAGE 등의 채널을 보유할 수 있다.
 * 채널별 승인 상태를 관리한다.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationChannels20260215200001 implements MigrationInterface {
  name = 'CreateOrganizationChannels20260215200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: check if table already exists
    const tableExists = await queryRunner.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'organization_channels'
    `);

    if (tableExists.length > 0) {
      return;
    }

    // Create ENUM types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE organization_channel_type AS ENUM ('B2C', 'KIOSK', 'TABLET', 'SIGNAGE');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE organization_channel_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'TERMINATED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Create table
    await queryRunner.query(`
      CREATE TABLE "organization_channels" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "organization_id" UUID NOT NULL,
        "channel_type" organization_channel_type NOT NULL,
        "status" organization_channel_status NOT NULL DEFAULT 'PENDING',
        "approved_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_org_channel_type" UNIQUE ("organization_id", "channel_type"),
        CONSTRAINT "FK_org_channel_organization" FOREIGN KEY ("organization_id")
          REFERENCES "kpa_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // Index for organization lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_org_channel_org_id" ON "organization_channels" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_channels"`);
    await queryRunner.query(`DROP TYPE IF EXISTS organization_channel_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS organization_channel_type`);
  }
}
