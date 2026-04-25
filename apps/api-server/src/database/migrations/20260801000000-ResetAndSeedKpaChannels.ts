import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-CHANNEL-RESET-AND-ENABLE-V1
 *
 * KPA-Society 채널 완전 초기화 + 기본 채널 4종 재생성.
 *
 * Phase 1: 기존 채널 관련 데이터 삭제
 *   - organization_product_channels (KPA 소속)
 *   - store_tablet_displays / store_tablets (KPA 소속, SAVEPOINT)
 *   - organization_channels (KPA 소속)
 *
 * Phase 2: 모든 KPA-Society 조직에 4채널(B2C/KIOSK/TABLET/SIGNAGE) 생성
 *   - status = APPROVED, approved_at = NOW()
 *   - 기본 config JSON 설정
 */
export class ResetAndSeedKpaChannels20260801000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Phase 1: Clean Reset ────────────────────────────────────────────

    // 1a. Delete product-channel mappings for KPA orgs
    const [{ pc_cnt }] = await queryRunner.query(`
      SELECT COUNT(*)::int AS pc_cnt
      FROM organization_product_channels
      WHERE channel_id IN (
        SELECT oc.id FROM organization_channels oc
        WHERE oc.organization_id IN (
          SELECT organization_id FROM organization_service_enrollments
          WHERE service_code = 'kpa-society'
        )
      )
    `);
    console.log(`[ResetAndSeedKpaChannels] Deleting ${pc_cnt} product-channel mappings`);

    if (pc_cnt > 0) {
      await queryRunner.query(`
        DELETE FROM organization_product_channels
        WHERE channel_id IN (
          SELECT oc.id FROM organization_channels oc
          WHERE oc.organization_id IN (
            SELECT organization_id FROM organization_service_enrollments
            WHERE service_code = 'kpa-society'
          )
        )
      `);
    }

    // 1b. Clean tablet displays (SAVEPOINT — may not exist or have data)
    await queryRunner.query('SAVEPOINT tablet_cleanup');
    try {
      await queryRunner.query(`
        DELETE FROM store_tablet_displays
        WHERE tablet_id IN (
          SELECT id FROM store_tablets
          WHERE organization_id IN (
            SELECT organization_id FROM organization_service_enrollments
            WHERE service_code = 'kpa-society'
          )
        )
      `);
      await queryRunner.query('RELEASE SAVEPOINT tablet_cleanup');
      console.log('[ResetAndSeedKpaChannels] Tablet displays cleaned');
    } catch {
      await queryRunner.query('ROLLBACK TO SAVEPOINT tablet_cleanup');
      console.log('[ResetAndSeedKpaChannels] Tablet display cleanup skipped (table may not exist)');
    }

    // 1c. Delete channels for KPA orgs
    const [{ ch_cnt }] = await queryRunner.query(`
      SELECT COUNT(*)::int AS ch_cnt
      FROM organization_channels
      WHERE organization_id IN (
        SELECT organization_id FROM organization_service_enrollments
        WHERE service_code = 'kpa-society'
      )
    `);
    console.log(`[ResetAndSeedKpaChannels] Deleting ${ch_cnt} channels`);

    if (ch_cnt > 0) {
      await queryRunner.query(`
        DELETE FROM organization_channels
        WHERE organization_id IN (
          SELECT organization_id FROM organization_service_enrollments
          WHERE service_code = 'kpa-society'
        )
      `);
    }

    // ── Phase 2: Seed 4 channels per KPA org ────────────────────────────

    const orgs: { organization_id: string }[] = await queryRunner.query(`
      SELECT DISTINCT organization_id
      FROM organization_service_enrollments
      WHERE service_code = 'kpa-society'
    `);

    console.log(`[ResetAndSeedKpaChannels] Creating channels for ${orgs.length} organizations`);

    const channelConfigs: [string, string][] = [
      ['B2C',     JSON.stringify({ enabled: true, visibilityMode: 'PUBLIC', productLimit: 100 })],
      ['KIOSK',   JSON.stringify({ enabled: true, pin: null, autoResetMinutes: 5 })],
      ['TABLET',  JSON.stringify({ enabled: true, pin: null, autoResetMinutes: 5, slideShowIntervalSeconds: 10 })],
      ['SIGNAGE', JSON.stringify({ enabled: true, playlistId: null, autoRotateSeconds: 10 })],
    ];

    let created = 0;
    for (const { organization_id } of orgs) {
      for (const [channelType, config] of channelConfigs) {
        await queryRunner.query(`
          INSERT INTO organization_channels
            (id, organization_id, channel_type, status, approved_at, config, created_at, updated_at)
          VALUES
            (gen_random_uuid(), $1, $2, 'APPROVED', NOW(), $3::jsonb, NOW(), NOW())
          ON CONFLICT (organization_id, channel_type) DO NOTHING
        `, [organization_id, channelType, config]);
        created++;
      }
    }

    // ── Verification ────────────────────────────────────────────────────

    const [{ total }] = await queryRunner.query(`
      SELECT COUNT(*)::int AS total
      FROM organization_channels
      WHERE organization_id IN (
        SELECT organization_id FROM organization_service_enrollments
        WHERE service_code = 'kpa-society'
      )
    `);
    console.log(`[ResetAndSeedKpaChannels] Done — ${total} channels for ${orgs.length} orgs (expected ${orgs.length * 4})`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: delete all KPA channels created by this migration
    await queryRunner.query(`
      DELETE FROM organization_product_channels
      WHERE channel_id IN (
        SELECT id FROM organization_channels
        WHERE organization_id IN (
          SELECT organization_id FROM organization_service_enrollments
          WHERE service_code = 'kpa-society'
        )
      )
    `);
    await queryRunner.query(`
      DELETE FROM organization_channels
      WHERE organization_id IN (
        SELECT organization_id FROM organization_service_enrollments
        WHERE service_code = 'kpa-society'
      )
    `);
    console.log('[ResetAndSeedKpaChannels] Rolled back — deleted KPA channels');
  }
}
