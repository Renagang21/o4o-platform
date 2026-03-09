import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-SLUG-REGISTRATION-V1 (수정)
 *
 * 이전 마이그레이션(20260309100000)이 service_code='kpa'로 조회했으나,
 * 실제 DB에는 service_code='kpa-society'로 등록되어 있어 0건 매칭.
 *
 * 이 마이그레이션은 올바른 service_code='kpa-society'를 사용하여
 * KPA organization slug을 platform_store_slugs에 backfill.
 *
 * platform_store_slugs.service_key는 'kpa'를 사용 (storefront 시스템 규칙).
 */
export class BackfillKpaStoreSlugsV220260309300000 implements MigrationInterface {
  name = 'BackfillKpaStoreSlugsV220260309300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. KPA 서비스에 등록된 활성 organization 조회
    // organization_service_enrollments.service_code = 'kpa-society' (실제 DB 값)
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
    `);

    if (rows.length === 0) {
      console.log('[BackfillKpaStoreSlugsV2] No KPA organizations found to backfill');
      return;
    }

    console.log(`[BackfillKpaStoreSlugsV2] Found ${rows.length} KPA organizations`);

    // 2. 기존 slug 수집 (충돌 방지)
    const existingSlugs = new Set<string>();
    const existing: Array<{ slug: string }> = await queryRunner.query(
      `SELECT slug FROM platform_store_slugs WHERE slug IS NOT NULL`
    );
    for (const row of existing) {
      existingSlugs.add(row.slug);
    }

    // 3. 각 organization에 대해 slug 생성 + INSERT
    let insertedCount = 0;
    for (const row of rows) {
      // 이미 등록된 store인지 확인 (service_key='kpa')
      const alreadyRegistered: Array<{ id: string }> = await queryRunner.query(
        `SELECT id FROM platform_store_slugs WHERE store_id = $1 AND service_key = 'kpa'`,
        [row.id]
      );
      if (alreadyRegistered.length > 0) {
        continue;
      }

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

    console.log(`[BackfillKpaStoreSlugsV2] Backfilled ${insertedCount} KPA store slugs (total orgs: ${rows.length})`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM platform_store_slugs
      WHERE service_key = 'kpa'
    `);
    console.log('[BackfillKpaStoreSlugsV2] Removed all KPA store slugs');
  }

  /**
   * Slugify — 한국어 지원 slug 생성
   */
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
