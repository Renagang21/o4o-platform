import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-SLUG-MEMBER-APPROVAL-PATH-FIX-V1 (backfill)
 *
 * member.controller.ts /:id/status 승인 경로에서 platform_store_slugs 가
 * 생성되지 않던 버그(BackfillKpaSlugsLateJoin 이후 발생)를 보정한다.
 *
 * 대상: organization_members(owner) + service_memberships(kpa-society/active) 가 있으나
 *       platform_store_slugs(kpa)가 누락된 조직.
 *
 * 동작: BackfillKpaSlugsLateJoin(20260518000000)와 동일한 조인·slug 생성 로직 사용.
 * 멱등: ON CONFLICT (slug) DO NOTHING + NOT EXISTS 가드.
 */
export class BackfillKpaSlugsPostMemberApprovalPath20261022000000 implements MigrationInterface {
  name = 'BackfillKpaSlugsPostMemberApprovalPath20261022000000';

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
        AND sm.status = 'active'
      WHERE o."isActive" = true
        AND o.name IS NOT NULL
        AND o.name != ''
        AND NOT EXISTS (
          SELECT 1 FROM platform_store_slugs
          WHERE store_id = o.id AND service_key = 'kpa'
        )
    `);

    if (rows.length === 0) {
      console.log('[BackfillKpaSlugsPostMemberApprovalPath] No KPA organizations without slugs found');
      return;
    }

    console.log(`[BackfillKpaSlugsPostMemberApprovalPath] Found ${rows.length} KPA organizations without slugs`);

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

      console.log(`[BackfillKpaSlugsPostMemberApprovalPath] ${row.name} → ${slug}`);
      insertedCount++;
    }

    console.log(`[BackfillKpaSlugsPostMemberApprovalPath] Done: ${insertedCount} slugs created`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[BackfillKpaSlugsPostMemberApprovalPath] down: no-op');
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
