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
 * 테이블이 존재하지 않으면 SKIP
 */
export class AddStoreIdentityFields1708300000003 implements MigrationInterface {
  name = 'AddStoreIdentityFields1708300000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── GlycopharmPharmacy ──
    if (await this.tableExists(queryRunner, 'glycopharm_pharmacies')) {
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
      await this.backfillSlugs(queryRunner, 'glycopharm_pharmacies', 'name');
    } else {
      console.log('[StoreIdentity] SKIP: glycopharm_pharmacies does not exist yet');
    }

    // ── GlucoseViewPharmacy ──
    if (await this.tableExists(queryRunner, 'glucoseview_pharmacies')) {
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
      await this.backfillSlugs(queryRunner, 'glucoseview_pharmacies', 'name');
    } else {
      console.log('[StoreIdentity] SKIP: glucoseview_pharmacies does not exist yet');
    }

    // ── CosmeticsStore (cosmetics schema) ──
    if (await this.tableExists(queryRunner, 'cosmetics_stores', 'cosmetics')) {
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
      await this.backfillSlugs(queryRunner, 'cosmetics.cosmetics_stores', 'name');
    } else {
      console.log('[StoreIdentity] SKIP: cosmetics.cosmetics_stores does not exist yet');
    }

    console.log('[StoreIdentity] Identity fields added and slugs backfilled.');
  }

  private async backfillSlugs(
    queryRunner: QueryRunner,
    tableName: string,
    nameColumn: string,
  ): Promise<void> {
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

    const existing = await queryRunner.query(`
      SELECT slug FROM ${tableName} WHERE slug IS NOT NULL
    `);
    for (const row of existing) {
      usedSlugs.add(row.slug);
    }

    for (const row of rows) {
      let baseSlug = this.slugify(row.store_name);
      if (!baseSlug) {
        baseSlug = row.id.slice(0, 8);
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
    await queryRunner.query(`DROP INDEX IF EXISTS idx_glycopharm_slug`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_glucoseview_slug`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cosmetics_store_slug`);

    if (await this.tableExists(queryRunner, 'glycopharm_pharmacies')) {
      await queryRunner.query(`
        ALTER TABLE glycopharm_pharmacies
        DROP COLUMN IF EXISTS slug,
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS logo,
        DROP COLUMN IF EXISTS hero_image
      `);
    }

    if (await this.tableExists(queryRunner, 'glucoseview_pharmacies')) {
      await queryRunner.query(`
        ALTER TABLE glucoseview_pharmacies
        DROP COLUMN IF EXISTS slug,
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS logo,
        DROP COLUMN IF EXISTS hero_image
      `);
    }

    if (await this.tableExists(queryRunner, 'cosmetics_stores', 'cosmetics')) {
      await queryRunner.query(`
        ALTER TABLE cosmetics.cosmetics_stores
        DROP COLUMN IF EXISTS slug,
        DROP COLUMN IF EXISTS description,
        DROP COLUMN IF EXISTS logo,
        DROP COLUMN IF EXISTS hero_image
      `);
    }
  }

  private async tableExists(
    queryRunner: QueryRunner,
    tableName: string,
    schema = 'public',
  ): Promise<boolean> {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
      ) AS exists
    `, [schema, tableName]);
    return result[0].exists;
  }
}
