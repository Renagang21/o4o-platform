import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-SLUG-INTEGRITY-FIX-V1
 *
 * pharmacy-info.controller.ts가 platform_store_slugs 기준으로 slug를 반환하도록
 * 변경됨에 따라, 이전 backfill 이후 새로 가입한 KPA 약국 조직에도
 * slug가 없을 수 있음. 이 마이그레이션은 누락된 slug를 보정한다.
 *
 * - 기존 BackfillKpaStoreSlugsV2(20260309300000)와 동일한 로직
 * - ON CONFLICT (store_id, service_key) 또는 이미 등록된 경우 스킵
 */
export class BackfillMissingKpaSlugs20260416300000 implements MigrationInterface {
  name = 'BackfillMissingKpaSlugs20260416300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // KPA 서비스에 등록된 활성 organization 중 slug가 없는 것만 조회
    const rows: Array<{ id: string; name: string }> = await queryRunner.query(`
      SELECT o.id, o.name
      FROM organizations o
      JOIN organization_service_enrollments ose
        ON ose.organization_id = o.id
        AND ose.service_code = 'kpa-society'
        AND ose.status = 'active'
      WHERE o."isActive" = true
        AND o.name IS NOT NULL
        AND o.name != ''
        AND NOT EXISTS (
          SELECT 1 FROM platform_store_slugs
          WHERE store_id = o.id AND service_key = 'kpa'
        )
    `);

    if (rows.length === 0) {
      console.log('[BackfillMissingKpaSlugs] All KPA organizations already have slugs');
      return;
    }

    console.log(`[BackfillMissingKpaSlugs] Found ${rows.length} KPA organizations without slugs`);

    // 기존 slug 수집 (충돌 방지)
    const existingSlugs = new Set<string>();
    const existing: Array<{ slug: string }> = await queryRunner.query(
      `SELECT slug FROM platform_store_slugs WHERE slug IS NOT NULL`
    );
    for (const row of existing) {
      existingSlugs.add(row.slug);
    }

    let insertedCount = 0;
    for (const row of rows) {
      let baseSlug = this.slugify(row.name);
      if (!baseSlug || baseSlug.length < 3) {
        baseSlug = `kpa-${row.id.slice(0, 8)}`;
      }

      // 중복 해결: -1, -2, ... 접미사
      let slug = baseSlug;
      let counter = 1;
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      existingSlugs.add(slug);

      await queryRunner.query(
        `INSERT INTO platform_store_slugs (id, slug, store_id, service_key, is_active, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, 'kpa', true, NOW(), NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [slug, row.id]
      );
      insertedCount++;
    }

    console.log(`[BackfillMissingKpaSlugs] Backfilled ${insertedCount} KPA store slugs`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // down은 no-op — slug를 일괄 삭제하면 기존 slug까지 삭제되므로 안전하지 않음
    console.log('[BackfillMissingKpaSlugs] down: no-op (slugs preserved)');
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\u3131-\u318E\u3200-\u321E\uAC00-\uD7AF\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }
}
