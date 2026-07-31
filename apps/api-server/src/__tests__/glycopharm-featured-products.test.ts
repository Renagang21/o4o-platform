/**
 * WO-O4O-GLYCOPHARM-FEATURED-PRODUCTS-TABLE-RECOVERY-V1 — regression guard
 *
 * 배경: `glycopharm_featured_products` 테이블이 운영에 없어 featured-products API 가 500 이었고,
 *   응답 본문에 `relation "public.glycopharm_featured_products" does not exist` 가 그대로 실렸다.
 *   테이블을 만드는 migration 이 러너 미스캔 디렉터리(`src/migrations/`)에 있어 실행된 적이 없었다.
 *
 * DB 연결 없이 (1) migration 을 recording mock 으로 실행하고
 * (2) postgres metadata 로 entity ↔ migration 정합을 대조하며
 * (3) 컨트롤러가 내부 오류 원문을 응답에 싣지 않는지 소스로 검증한다.
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

import { GlycopharmFeaturedProduct } from '../routes/glycopharm/entities/glycopharm-featured-product.entity.js';
import { GlycopharmProduct } from '../routes/glycopharm/entities/glycopharm-product.entity.js';
// relation 폐포를 닫기 위해 필요 (GlycopharmProduct#pharmacy → OrganizationStore, #logs → ProductLog)
import { OrganizationStore } from '../modules/store-core/entities/organization-store.entity.js';
import { GlycopharmProductLog } from '../routes/glycopharm/entities/glycopharm-product-log.entity.js';

const MIGRATION = '../database/migrations/20270222000000-CreateGlycopharmFeaturedProductsTable.js';

const EXPECTED_COLUMNS = [
  'id', 'service', 'context', 'product_id', 'position', 'is_active',
  'created_by_user_id', 'created_by_user_name', 'created_at', 'updated_at',
];
const EXPECTED_INDEXES = ['IDX_glycopharm_featured_unique', 'IDX_glycopharm_featured_order'];
const FK_NAME = 'FK_glycopharm_featured_product';

async function runUp(opts: {
  existingBefore?: string[];
  columnsAfter?: string[];
  indexesAfter?: string[];
  fkCount?: number;
} = {}) {
  const { CreateGlycopharmFeaturedProductsTable20270222000000 } = await import(MIGRATION);
  const ddl: string[] = [];
  let postApply = false;
  const qr: any = {
    query: async (sql: string) => {
      if (/information_schema\.columns/i.test(sql)) {
        const cols = postApply ? (opts.columnsAfter ?? EXPECTED_COLUMNS) : (opts.existingBefore ?? []);
        return cols.map((column_name) => ({ column_name }));
      }
      if (/pg_indexes/i.test(sql)) {
        return (opts.indexesAfter ?? EXPECTED_INDEXES).map((indexname) => ({ indexname }));
      }
      if (/pg_constraint/i.test(sql) && /count\(\*\)/i.test(sql)) {
        return [{ c: opts.fkCount ?? 1 }];
      }
      ddl.push(sql);
      postApply = true;
      return [];
    },
  };
  await new CreateGlycopharmFeaturedProductsTable20270222000000().up(qr);
  return ddl;
}

describe('glycopharm_featured_products migration', () => {
  it('creates the table with every column the entity declares', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "glycopharm_featured_products"/);
    for (const c of EXPECTED_COLUMNS) expect(sql).toMatch(new RegExp(`"${c}"`));
  });

  it('creates both entity-declared indexes, unique one included', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "IDX_glycopharm_featured_unique"[\s\S]*?"service", "context", "product_id"/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS "IDX_glycopharm_featured_order"[\s\S]*?"service", "context", "position"/);
  });

  it('creates the FK to glycopharm_products idempotently', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).toMatch(new RegExp(`ADD CONSTRAINT "${FK_NAME}"`));
    expect(sql).toMatch(/REFERENCES "glycopharm_products"\("id"\)/);
    expect(sql).toMatch(/ON DELETE CASCADE/);
    // 조건부 생성이라 재실행해도 중복 제약이 생기지 않는다
    expect(sql).toMatch(/IF NOT EXISTS \(\s*SELECT 1 FROM pg_constraint/);
  });

  it('is idempotent: table and indexes guarded by IF NOT EXISTS', async () => {
    const sql = (await runUp()).join('\n');
    const creates = sql.match(/CREATE (?:TABLE|(?:UNIQUE )?INDEX)[^\n(]*/g) ?? [];
    expect(creates).toHaveLength(3);
    for (const c of creates) expect(c).toContain('IF NOT EXISTS');
  });

  it.each([
    ['table absent', [] as string[]],
    ['table already complete', EXPECTED_COLUMNS],
  ])('applies safely when %s', async (_l, existingBefore) => {
    await expect(runUp({ existingBefore })).resolves.toBeDefined();
  });

  it('ABORTS instead of ALTERing when an existing table conflicts with the entity', async () => {
    await expect(
      runUp({ existingBefore: EXPECTED_COLUMNS.filter((c) => c !== 'position') })
    ).rejects.toThrow(/position/);
  });

  it('ABORTS if a column is missing after apply', async () => {
    await expect(
      runUp({ columnsAfter: EXPECTED_COLUMNS.filter((c) => c !== 'is_active') })
    ).rejects.toThrow(/is_active/);
  });

  it('ABORTS if an index is missing after apply', async () => {
    await expect(runUp({ indexesAfter: ['IDX_glycopharm_featured_order'] }))
      .rejects.toThrow(/IDX_glycopharm_featured_unique/);
  });

  it('ABORTS if the FK was not created', async () => {
    await expect(runUp({ fkCount: 0 })).rejects.toThrow(new RegExp(FK_NAME));
  });

  it('performs no DML, nothing destructive, and touches no other table', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).not.toMatch(/\b(INSERT INTO|UPDATE\s+"|DELETE FROM)\b/i);
    expect(sql).not.toMatch(/DROP/i);
    // FK 의 `ON DELETE CASCADE` 는 의도된 것. 금지 대상은 DROP ... CASCADE 다.
    expect(sql).not.toMatch(/DROP[^\n;]*CASCADE/i);
    const created = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS "(\w+)"|ON "(\w+)"|ALTER TABLE "(\w+)"/g)]
      .map((m) => m[1] ?? m[2] ?? m[3]);
    for (const t of created) expect(t).toBe('glycopharm_featured_products');
  });

  it('down is a no-op (rollback would re-break the API and destroy curation data)', async () => {
    const { CreateGlycopharmFeaturedProductsTable20270222000000 } = await import(MIGRATION);
    const qr: any = { query: jest.fn() };
    await new CreateGlycopharmFeaturedProductsTable20270222000000().down();
    expect(qr.query).not.toHaveBeenCalled();
  });
});

describe('entity ↔ migration parity', () => {
  let ds: DataSource;
  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host: 'localhost', port: 5432, username: 'unused', password: 'unused', database: 'unused',
      entities: [GlycopharmFeaturedProduct, GlycopharmProduct, OrganizationStore, GlycopharmProductLog],
    });
    await ds.buildMetadatas();
  });

  it('entity columns match the migration exactly', () => {
    const meta = ds.getMetadata(GlycopharmFeaturedProduct);
    expect(meta.tableName).toBe('glycopharm_featured_products');
    expect(meta.columns.map((c) => c.databaseName).sort()).toEqual([...EXPECTED_COLUMNS].sort());
  });

  it('declares the product relation the FK backs', () => {
    const meta = ds.getMetadata(GlycopharmFeaturedProduct);
    const rel = meta.relations.find((r) => r.propertyName === 'product');
    expect(rel).toBeDefined();
    expect(rel!.joinColumns.map((c) => c.databaseName)).toEqual(['product_id']);
  });

  it('declares one unique and one ordering index', () => {
    const meta = ds.getMetadata(GlycopharmFeaturedProduct);
    const unique = meta.indices.filter((i) => i.isUnique);
    expect(unique).toHaveLength(1);
    expect(unique[0].columns.map((c) => c.databaseName)).toEqual(['service', 'context', 'product_id']);
    const ordering = meta.indices.filter((i) => !i.isUnique);
    expect(ordering).toHaveLength(1);
    expect(ordering[0].columns.map((c) => c.databaseName)).toEqual(['service', 'context', 'position']);
  });
});

describe('featured-products API does not leak internal DB details', () => {
  const controller = () =>
    readFileSync(
      join(__dirname, '..', 'routes', 'glycopharm', 'controllers', 'glycopharm.controller.ts'),
      'utf8'
    );

  /** FEATURED PRODUCTS 섹션만 잘라낸다 (다른 Glycopharm API 는 이번 범위가 아니다). */
  function featuredSection(src: string): string {
    const start = src.indexOf('// FEATURED PRODUCTS (OPERATOR)');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('PARTNER RECRUITMENT', start);
    return src.slice(start, end > start ? end : undefined);
  }

  it('no INTERNAL_ERROR handler in the featured block returns error.message', () => {
    const section = featuredSection(controller());
    const leaks = section.match(/code: 'INTERNAL_ERROR', message: error\.message/g) ?? [];
    expect(leaks).toEqual([]);
  });

  it('all five featured INTERNAL_ERROR responses use the generic message', () => {
    const section = featuredSection(controller());
    const generic = section.match(/code: 'INTERNAL_ERROR', message: FEATURED_INTERNAL_ERROR_MESSAGE/g) ?? [];
    expect(generic).toHaveLength(5);
  });

  it('the generic message exposes no relation / schema / SQL detail', () => {
    const m = controller().match(/const FEATURED_INTERNAL_ERROR_MESSAGE = '([^']+)'/);
    expect(m).not.toBeNull();
    const msg = m![1];
    expect(msg).not.toMatch(/relation|schema|select|table|glycopharm_featured_products|does not exist/i);
  });

  it('keeps deliberate domain messages (ALREADY_EXISTS / NOT_FOUND) intact', () => {
    const section = featuredSection(controller());
    expect(section).toMatch(/code: 'ALREADY_EXISTS', message: error\.message/);
    expect(section).toMatch(/code: 'NOT_FOUND', message: error\.message/);
  });

  it('still logs the real error server-side for diagnosis', () => {
    const section = featuredSection(controller());
    expect((section.match(/console\.error\([^)]*error\)/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
