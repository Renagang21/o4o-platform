import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-SLUG-INTEGRITY-FIX-V1 (수정)
 *
 * 이전 backfill(BackfillKpaStoreSlugsV2, BackfillMissingKpaSlugs)은
 * `organization_service_enrollments.service_code = 'kpa-society'`를 사용했으나
 * 실제 KPA 약국은 이 테이블에 등록되지 않음.
 *
 * 실제 KPA 약국 연결 경로:
 *   organizations o
 *   JOIN organization_members om ON om.organization_id = o.id AND om.role = 'owner'
 *   JOIN service_memberships sm ON sm.user_id = om.user_id AND sm.service_key = 'kpa-society'
 *
 * 이 마이그레이션은 올바른 조인으로 KPA 약국 조직에 platform_store_slug를 생성한다.
 * status 필터 없이 pending/approved 모두 포함 (slug는 가입 시 즉시 필요).
 */
export class BackfillKpaSlugsByMembership20260416400000 implements MigrationInterface {
  name = 'BackfillKpaSlugsByMembership20260416400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // KPA 약국 조직 조회: service_memberships 기반 (pending/approved 모두 포함)
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
      console.log('[BackfillKpaSlugsByMembership] No KPA organizations without slugs found');
      return;
    }

    console.log(`[BackfillKpaSlugsByMembership] Found ${rows.length} KPA organizations without slugs`);

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
      // org.code가 이미 slug 형태면 우선 사용, 아니면 name으로 생성
      let baseSlug = this.isSlugLike(row.code)
        ? row.code!.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
        : this.slugify(row.name);

      if (!baseSlug || baseSlug.length < 3) {
        baseSlug = `kpa-${row.id.slice(0, 8)}`;
      }

      // 중복 해결
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

      console.log(`[BackfillKpaSlugsByMembership] ${row.name} → ${slug}`);
      insertedCount++;
    }

    console.log(`[BackfillKpaSlugsByMembership] Done: ${insertedCount} slugs created`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[BackfillKpaSlugsByMembership] down: no-op');
  }

  private isSlugLike(code: string | null): boolean {
    if (!code) return false;
    // 'gp-8596a54f...' 형태의 자동생성 코드는 제외, 의미있는 코드만 사용
    if (/^gp-[a-f0-9]{32}/.test(code)) return false;
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
