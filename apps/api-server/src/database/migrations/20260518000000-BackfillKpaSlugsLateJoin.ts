import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-SLUG-ON-APPROVE-V1 (backfill)
 *
 * BackfillKpaSlugsByMembership(20260416400000) 이후 가입한 KPA 약국 계정에는
 * slug가 생성되지 않았음. 이 마이그레이션은 누락된 계정을 보정한다.
 *
 * 조인 조건 (BackfillKpaSlugsByMembership와 동일):
 *   organizations o
 *   JOIN organization_members om ON om.organization_id = o.id AND om.role = 'owner'
 *   JOIN service_memberships sm ON sm.user_id = om.user_id AND sm.service_key = 'kpa-society'
 *   WHERE NOT EXISTS (platform_store_slugs for this org)
 *
 * 이 마이그레이션 실행 후 신규 가입자는 pharmacy-request.controller.ts 승인 시
 * 즉시 slug가 생성되므로 추가 backfill 불필요.
 */
export class BackfillKpaSlugsLateJoin20260518000000 implements MigrationInterface {
  name = 'BackfillKpaSlugsLateJoin20260518000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: string; name: string; code: string | null }> = await queryRunner.query(`
      SELECT DISTINCT o.id, o.name, o.code
      FROM organizations o
      JOIN organization_members om
        ON om.organization_id = o.id
        AND om.role = 'owner'
      JOIN service_memberships sm
        ON sm.user_id = om.user_id
        AND sm.service_key = 'kpa-society'
      WHERE o."isActive" = true
        AND o.name IS NOT NULL
        AND o.name != ''
        AND NOT EXISTS (
          SELECT 1 FROM platform_store_slugs
          WHERE store_id = o.id AND service_key = 'kpa'
        )
    `);

    if (rows.length === 0) {
      console.log('[BackfillKpaSlugsLateJoin] No KPA organizations without slugs found');
      return;
    }

    console.log(`[BackfillKpaSlugsLateJoin] Found ${rows.length} KPA organizations without slugs`);

    const existingSlugs = new Set<string>();
    const existing: Array<{ slug: string }> = await queryRunner.query(
      `SELECT slug FROM platform_store_slugs WHERE slug IS NOT NULL`
    );
    for (const row of existing) {
      existingSlugs.add(row.slug);
    }

    let insertedCount = 0;
    for (const row of rows) {
      let baseSlug = this.isSlugLike(row.code)
        ? row.code!.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
        : this.slugify(row.name);

      if (!baseSlug || baseSlug.length < 3) {
        baseSlug = `kpa-${row.id.slice(0, 8)}`;
      }

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

      console.log(`[BackfillKpaSlugsLateJoin] ${row.name} → ${slug}`);
      insertedCount++;
    }

    console.log(`[BackfillKpaSlugsLateJoin] Done: ${insertedCount} slugs created`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[BackfillKpaSlugsLateJoin] down: no-op');
  }

  private isSlugLike(code: string | null): boolean {
    if (!code) return false;
    if (/^gp-[a-f0-9]{32}/.test(code)) return false;
    if (/^kpa-pharm-\d+/.test(code)) return false; // business_number 기반 자동 코드 제외
    return code.length >= 3 && code.length <= 120;
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
