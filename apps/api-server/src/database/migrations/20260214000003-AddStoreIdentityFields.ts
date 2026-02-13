import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-IDENTITY-FIELD-ALIGNMENT-V1
 *
 * 각 서비스 매장 엔티티에 공통 Identity 필드 추가:
 * - slug: varchar(120) UNIQUE nullable (URL 식별자)
 * - description: text nullable
 * - logo: varchar(2000) nullable
 * - hero_image: varchar(2000) nullable
 *
 * 대상: glycopharm_pharmacies, glucoseview_pharmacies, cosmetics.cosmetics_stores
 * PhysicalStore 제외 (link hub 역할 유지)
 *
 * 비파괴적: 모든 컬럼 nullable, 기존 데이터/기능 영향 없음
 */
export class AddStoreIdentityFields1708300000003 implements MigrationInterface {
  name = 'AddStoreIdentityFields1708300000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── GlycopharmPharmacy ──
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      ADD COLUMN IF NOT EXISTS slug varchar(120),
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS logo varchar(2000),
      ADD COLUMN IF NOT EXISTS hero_image varchar(2000)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_glycopharm_slug
      ON glycopharm_pharmacies (slug) WHERE slug IS NOT NULL
    `);

    // ── GlucoseViewPharmacy ──
    await queryRunner.query(`
      ALTER TABLE glucoseview_pharmacies
      ADD COLUMN IF NOT EXISTS slug varchar(120),
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS logo varchar(2000),
      ADD COLUMN IF NOT EXISTS hero_image varchar(2000)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_glucoseview_slug
      ON glucoseview_pharmacies (slug) WHERE slug IS NOT NULL
    `);

    // ── CosmeticsStore (cosmetics schema) ──
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_stores
      ADD COLUMN IF NOT EXISTS slug varchar(120),
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS logo varchar(2000),
      ADD COLUMN IF NOT EXISTS hero_image varchar(2000)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cosmetics_store_slug
      ON cosmetics.cosmetics_stores (slug) WHERE slug IS NOT NULL
    `);

    // ── Phase 3: 기존 데이터 백필 (name → slug) ──
    // 한글/영문 모두 처리: 공백→하이픈, 특수문자 제거, 소문자화
    await this.backfillSlugs(queryRunner, 'glycopharm_pharmacies', 'name');
    await this.backfillSlugs(queryRunner, 'glucoseview_pharmacies', 'name');
    await this.backfillSlugs(queryRunner, 'cosmetics.cosmetics_stores', 'name');

    console.log('[StoreIdentity] Identity fields added and slugs backfilled.');
  }

  private async backfillSlugs(
    queryRunner: QueryRunner,
    tableName: string,
    nameColumn: string,
  ): Promise<void> {
    // slug가 NULL인 레코드만 백필
    const rows = await queryRunner.query(`
      SELECT id, ${nameColumn} AS store_name
      FROM ${tableName}
      WHERE slug IS NULL AND ${nameColumn} IS NOT NULL
    `);

    if (rows.length === 0) {
      console.log(`[StoreIdentity] ${tableName}: no rows to backfill`);
      return;
    }

    const usedSlugs = new Set<string>();

    // 이미 존재하는 slug 수집
    const existing = await queryRunner.query(`
      SELECT slug FROM ${tableName} WHERE slug IS NOT NULL
    `);
    for (const row of existing) {
      usedSlugs.add(row.slug);
    }

    for (const row of rows) {
      let baseSlug = this.slugify(row.store_name);
      if (!baseSlug) {
        baseSlug = row.id.slice(0, 8); // fallback to UUID prefix
      }

      let slug = baseSlug;
      let counter = 1;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      usedSlugs.add(slug);

      await queryRunner.query(
        `UPDATE ${tableName} SET slug = $1 WHERE id = $2`,
        [slug, row.id],
      );
    }

    console.log(`[StoreIdentity] ${tableName}: ${rows.length} slugs backfilled`);
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 제거
    await queryRunner.query(`DROP INDEX IF EXISTS idx_glycopharm_slug`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_glucoseview_slug`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cosmetics_store_slug`);

    // 컬럼 제거
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      DROP COLUMN IF EXISTS slug,
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS logo,
      DROP COLUMN IF EXISTS hero_image
    `);

    await queryRunner.query(`
      ALTER TABLE glucoseview_pharmacies
      DROP COLUMN IF EXISTS slug,
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS logo,
      DROP COLUMN IF EXISTS hero_image
    `);

    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_stores
      DROP COLUMN IF EXISTS slug,
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS logo,
      DROP COLUMN IF EXISTS hero_image
    `);
  }
}
