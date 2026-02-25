/**
 * Migration: Normalize PENDING base-right channels to APPROVED
 *
 * WO-STORE-CHANNEL-PENDING-DATA-NORMALIZATION-V1
 *
 * 과거 생성된 B2C / KIOSK 채널 중 status = 'PENDING' 상태로 남아 있는 레코드를
 * 현재 확정된 정책(기본 채널 = 즉시 사용 가능)에 맞게 APPROVED로 정규화한다.
 *
 * 대상: organization_channels WHERE channel_type IN ('B2C', 'KIOSK') AND status = 'PENDING'
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizePendingBaseRightChannels20260225000002 implements MigrationInterface {
  name = 'NormalizePendingBaseRightChannels20260225000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Dry-run — log affected rows before update
    const pending: any[] = await queryRunner.query(`
      SELECT "id", "organization_id", "channel_type", "status", "approved_at", "created_at"
      FROM "organization_channels"
      WHERE "channel_type" IN ('B2C', 'KIOSK')
        AND "status" = 'PENDING'
    `);

    console.log(`[NormalizePendingBaseRightChannels] Dry-run: found ${pending.length} PENDING B2C/KIOSK channels`);

    if (pending.length > 0) {
      for (const row of pending) {
        console.log(`  - id=${row.id} org=${row.organization_id} type=${row.channel_type} created=${row.created_at}`);
      }

      // Step 2: Actual update
      const result = await queryRunner.query(`
        UPDATE "organization_channels"
        SET "status" = 'APPROVED',
            "approved_at" = COALESCE("approved_at", NOW()),
            "updated_at" = NOW()
        WHERE "channel_type" IN ('B2C', 'KIOSK')
          AND "status" = 'PENDING'
      `);

      const updatedCount = Array.isArray(result) ? result.length : (result?.[1] ?? 0);
      console.log(`[NormalizePendingBaseRightChannels] Updated ${updatedCount} channels to APPROVED`);
    }

    // Step 3: Verification
    const remaining: any[] = await queryRunner.query(`
      SELECT COUNT(*)::int as count
      FROM "organization_channels"
      WHERE "channel_type" IN ('B2C', 'KIOSK')
        AND "status" = 'PENDING'
    `);

    const remainingCount = remaining[0]?.count ?? 0;
    console.log(`[NormalizePendingBaseRightChannels] Verification: ${remainingCount} PENDING B2C/KIOSK remaining (expected 0)`);

    if (remainingCount > 0) {
      throw new Error(`[NormalizePendingBaseRightChannels] FAILED: ${remainingCount} PENDING records still exist after update`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: revert channels that were normalized in this migration.
    // We identify them by approved_at being set by this migration (within the last day as safety window).
    // Note: This is a best-effort rollback. Manual verification recommended.
    console.log('[NormalizePendingBaseRightChannels] down() — No automatic rollback. Channels remain APPROVED.');
    console.log('To manually revert, identify affected channels by their updated_at timestamp.');
  }
}
