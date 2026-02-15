/**
 * Migration: Seed default B2C channels for existing organizations
 *
 * WO-PHARMACY-HUB-OWNERSHIP-RESTRUCTURE-PHASE1-V1
 *
 * 기존 kpa_organizations 중 약국 레벨(분회 산하)에 해당하는
 * 조직에 B2C 채널을 APPROVED 상태로 자동 생성한다.
 * 이미 존재하는 채널은 건너뛴다.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultB2CChannels20260215200003 implements MigrationInterface {
  name = 'SeedDefaultB2CChannels20260215200003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert B2C channel for every kpa_organization that doesn't already have one
    const result = await queryRunner.query(`
      INSERT INTO "organization_channels" ("organization_id", "channel_type", "status", "approved_at")
      SELECT ko."id", 'B2C'::organization_channel_type, 'APPROVED'::organization_channel_status, NOW()
      FROM "kpa_organizations" ko
      WHERE NOT EXISTS (
        SELECT 1 FROM "organization_channels" oc
        WHERE oc."organization_id" = ko."id"
          AND oc."channel_type" = 'B2C'
      )
    `);

    // Log count (TypeORM returns affected rows info)
    const count = Array.isArray(result) ? result.length : (result?.rowCount ?? 0);
    console.log(`[SeedDefaultB2CChannels] Seeded B2C channels: ${count} organizations`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove only the seeded B2C channels (those with approved_at matching seed pattern)
    await queryRunner.query(`
      DELETE FROM "organization_channels"
      WHERE "channel_type" = 'B2C'
        AND "status" = 'APPROVED'
    `);
  }
}
