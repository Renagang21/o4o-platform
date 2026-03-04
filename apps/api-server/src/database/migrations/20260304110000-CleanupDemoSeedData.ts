import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 데모 시드 데이터 정리 (KPA-b/c 보존)
 *
 * 삭제 대상:
 * 1. SeedKpaSignageContent — signage_media, signage_playlists, signage_playlist_items
 * 2. SeedKpaBannerContent — cms_contents (hero), cms_content_slots
 * 3. SeedKpaBenefitContent — cms_contents (promo), cms_content_slots
 * 4. SeedHubSlotContent — cms_contents (hub hero), cms_content_slots
 * 5. SeedForumServiceOrganizations — organizations (FORUM_GLYCOPHARM)
 * 6. SeedPlatformServices — platform_services
 *
 * 보존: KPA-b/c (TestAccounts, TestForums, TestPostsComments, OrganizationsFullHierarchy)
 */
export class CleanupDemoSeedData1709564400000 implements MigrationInterface {
  name = 'CleanupDemoSeedData1709564400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Signage (UUID prefix 기반 삭제) ──

    await queryRunner.query(`
      DELETE FROM signage_playlist_items
      WHERE id::text LIKE 'd2000000-0a00-4000-d200-%'
    `).catch(() => {});

    await queryRunner.query(`
      DELETE FROM signage_playlists
      WHERE id::text LIKE 'd1000000-0a00-4000-d100-%'
    `).catch(() => {});

    await queryRunner.query(`
      DELETE FROM signage_media
      WHERE id::text LIKE 'd0000000-0a00-4000-d000-%'
    `).catch(() => {});

    // ── 2. Banner content (28건) + slots (17건) ──

    const bannerSlotIds = range(1, 17).map(n =>
      `'e1000000-0a00-4000-e100-${pad(n)}'`
    ).join(',');

    await queryRunner.query(`
      DELETE FROM cms_content_slots WHERE id IN (${bannerSlotIds})
    `).catch(() => {});

    const bannerContentIds = range(1, 28).map(n =>
      `'e0000000-0a00-4000-e000-${pad(n)}'`
    ).join(',');

    await queryRunner.query(`
      DELETE FROM cms_contents WHERE id IN (${bannerContentIds})
    `).catch(() => {});

    // ── 3. Benefit content (24건) + slots (11건) ──

    const benefitSlotIds = range(101, 111).map(n =>
      `'e1000000-0a00-4000-e100-${pad(n)}'`
    ).join(',');

    await queryRunner.query(`
      DELETE FROM cms_content_slots WHERE id IN (${benefitSlotIds})
    `).catch(() => {});

    const benefitContentIds = range(101, 124).map(n =>
      `'e0000000-0a00-4000-e000-${pad(n)}'`
    ).join(',');

    await queryRunner.query(`
      DELETE FROM cms_contents WHERE id IN (${benefitContentIds})
    `).catch(() => {});

    // ── 4. Hub hero content (3건) + slots (3건) ──

    await queryRunner.query(`
      DELETE FROM cms_content_slots
      WHERE id IN (
        'e3000000-0a00-4000-e300-000000000001',
        'e3000000-0a00-4000-e300-000000000002',
        'e3000000-0a00-4000-e300-000000000003'
      )
    `).catch(() => {});

    await queryRunner.query(`
      DELETE FROM cms_contents
      WHERE id IN (
        'e2000000-0a00-4000-e200-000000000001',
        'e2000000-0a00-4000-e200-000000000002',
        'e2000000-0a00-4000-e200-000000000003'
      )
    `).catch(() => {});

    // ── 5. Forum service organization ──

    await queryRunner.query(`
      DELETE FROM organizations WHERE code = 'FORUM_GLYCOPHARM'
    `).catch(() => {});

    // ── 6. Platform services ──

    await queryRunner.query(`
      DELETE FROM platform_services
      WHERE code IN ('glycopharm', 'glucoseview', 'neture', 'kpa-society', 'k-cosmetics')
    `).catch(() => {});
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 데모 데이터 복원 불필요
  }
}

function pad(n: number): string {
  return n.toString().padStart(12, '0');
}

function range(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}
