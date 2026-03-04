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
 * PL/pgSQL EXCEPTION 블록으로 존재하지 않는 테이블 안전 처리
 */
export class CleanupDemoSeedData1709564400000 implements MigrationInterface {
  name = 'CleanupDemoSeedData1709564400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Banner slot IDs (1~17)
    const bannerSlotIds = range(1, 17).map(n =>
      `'e1000000-0a00-4000-e100-${pad(n)}'`
    ).join(',');

    // Banner content IDs (1~28)
    const bannerContentIds = range(1, 28).map(n =>
      `'e0000000-0a00-4000-e000-${pad(n)}'`
    ).join(',');

    // Benefit slot IDs (101~111)
    const benefitSlotIds = range(101, 111).map(n =>
      `'e1000000-0a00-4000-e100-${pad(n)}'`
    ).join(',');

    // Benefit content IDs (101~124)
    const benefitContentIds = range(101, 124).map(n =>
      `'e0000000-0a00-4000-e000-${pad(n)}'`
    ).join(',');

    await queryRunner.query(`
      DO $$ BEGIN
        -- 1. Signage (UUID prefix 기반 삭제)
        BEGIN DELETE FROM signage_playlist_items WHERE id::text LIKE 'd2000000-0a00-4000-d200-%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM signage_playlists WHERE id::text LIKE 'd1000000-0a00-4000-d100-%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM signage_media WHERE id::text LIKE 'd0000000-0a00-4000-d000-%'; EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 2. Banner content + slots
        BEGIN DELETE FROM cms_content_slots WHERE id IN (${bannerSlotIds}); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM cms_contents WHERE id IN (${bannerContentIds}); EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 3. Benefit content + slots
        BEGIN DELETE FROM cms_content_slots WHERE id IN (${benefitSlotIds}); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM cms_contents WHERE id IN (${benefitContentIds}); EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 4. Hub hero content + slots
        BEGIN DELETE FROM cms_content_slots WHERE id IN ('e3000000-0a00-4000-e300-000000000001','e3000000-0a00-4000-e300-000000000002','e3000000-0a00-4000-e300-000000000003'); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM cms_contents WHERE id IN ('e2000000-0a00-4000-e200-000000000001','e2000000-0a00-4000-e200-000000000002','e2000000-0a00-4000-e200-000000000003'); EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 5. Forum service organization
        BEGIN DELETE FROM organizations WHERE code = 'FORUM_GLYCOPHARM'; EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 6. Platform services
        BEGIN DELETE FROM platform_services WHERE code IN ('glycopharm', 'glucoseview', 'neture', 'kpa-society', 'k-cosmetics'); EXCEPTION WHEN OTHERS THEN NULL; END;
      END $$;
    `);
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
