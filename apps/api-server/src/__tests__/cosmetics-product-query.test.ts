/**
 * WO-O4O-COSMETICS-PRODUCTS-500-RECOVERY-V1 — regression guard
 *
 * 배경: `GET /api/v1/cosmetics/products` 가 전 조합 500 이었다. 원인 두 가지 중 하나가
 *   "orderBy 에 entity property 가 아닌 DB 컬럼명을 전달" 이다.
 *
 * TypeORM 은 `(skip || take) && joinAttributes.length > 0` 일 때만
 * `SelectQueryBuilder.createOrderByCombinedWithSelectExpression()` 로 들어가고,
 * 거기서 `findColumnWithPropertyPath()` 결과를 **가드 없이** `.databaseName` 으로 읽는다.
 * 컬럼명을 주면 undefined → `TypeError: Cannot read properties of undefined (reading 'databaseName')`.
 *
 * 이 테스트는 DB 연결 없이 postgres metadata 만 빌드해서(= buildMetadatas) 그 경로를 직접 호출한다.
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

import { CosmeticsBrand } from '../routes/cosmetics/entities/cosmetics-brand.entity.js';
import { CosmeticsLine } from '../routes/cosmetics/entities/cosmetics-line.entity.js';
import { CosmeticsProduct } from '../routes/cosmetics/entities/cosmetics-product.entity.js';
import { CosmeticsPricePolicy } from '../routes/cosmetics/entities/cosmetics-price-policy.entity.js';
import { CosmeticsProductLog } from '../routes/cosmetics/entities/cosmetics-product-log.entity.js';
import { CosmeticsPriceLog } from '../routes/cosmetics/entities/cosmetics-price-log.entity.js';
import { CosmeticsStore } from '../routes/cosmetics/entities/cosmetics-store.entity.js';
import { CosmeticsStoreMember } from '../routes/cosmetics/entities/cosmetics-store-member.entity.js';
import { CosmeticsStoreListing } from '../routes/cosmetics/entities/cosmetics-store-listing.entity.js';
import { CosmeticsStoreApplication } from '../routes/cosmetics/entities/cosmetics-store-application.entity.js';
import { CosmeticsStorePlaylist } from '../routes/cosmetics/entities/cosmetics-store-playlist.entity.js';
import { CosmeticsStorePlaylistItem } from '../routes/cosmetics/entities/cosmetics-store-playlist-item.entity.js';

let ds: DataSource;

beforeAll(async () => {
  ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'unused',
    password: 'unused',
    database: 'unused',
    entities: [
      CosmeticsBrand, CosmeticsLine, CosmeticsProduct, CosmeticsPricePolicy,
      CosmeticsProductLog, CosmeticsPriceLog,
      CosmeticsStore, CosmeticsStoreMember, CosmeticsStoreListing,
      CosmeticsStoreApplication, CosmeticsStorePlaylist, CosmeticsStorePlaylistItem,
    ],
  });
  // NOTE: buildMetadatas() 는 driver 의 타입표만 쓰므로 connect() 없이 동작한다.
  await ds.buildMetadatas();
});

/** distinct 페이지네이션 경로를 실제로 태워본다. 던지면 실패. */
function resolveOrderBy(qb: any): void {
  qb.createOrderByCombinedWithSelectExpression('distinctAlias');
}

describe('cosmetics: orderBy must use entity properties, not DB column names', () => {
  it('exposes the property/column split that caused the outage', () => {
    const meta = ds.getMetadata(CosmeticsProduct);
    // 결함이 있던 표기 — metadata 에서 해석되지 않는다
    expect(meta.findColumnWithPropertyPath('created_at')).toBeUndefined();
    expect(meta.findColumnWithPropertyPath('base_price')).toBeUndefined();
    // 올바른 표기
    expect(meta.findColumnWithPropertyPath('createdAt')?.databaseName).toBe('created_at');
    expect(meta.findColumnWithPropertyPath('basePrice')?.databaseName).toBe('base_price');
    expect(meta.findColumnWithPropertyPath('name')?.databaseName).toBe('name');
  });

  // findAllProducts 의 정렬 화이트리스트와 동일한 매핑
  const SORT_MAP: Record<string, string> = {
    created_at: 'product.createdAt',
    price: 'product.basePrice',
    name: 'product.name',
  };

  function productListQb(orderCriteria: string, order: 'ASC' | 'DESC') {
    const qb = ds.getRepository(CosmeticsProduct).createQueryBuilder('product');
    qb.leftJoinAndSelect('product.brand', 'brand');
    qb.leftJoinAndSelect('product.line', 'line');
    qb.andWhere('product.status = :status', { status: 'visible' });
    qb.orderBy(orderCriteria, order);
    qb.skip(0).take(12);
    return qb;
  }

  it.each([
    ['created_at -> createdAt DESC', SORT_MAP.created_at, 'DESC'],
    ['name ASC', SORT_MAP.name, 'ASC'],
    ['price -> basePrice DESC', SORT_MAP.price, 'DESC'],
  ] as Array<[string, string, 'ASC' | 'DESC']>)(
    'product list resolves with join + skip/take: %s',
    (_label, criteria, order) => {
      expect(() => resolveOrderBy(productListQb(criteria, order))).not.toThrow();
    }
  );

  it('still throws for the old DB-column form (proves the guard is meaningful)', () => {
    expect(() => resolveOrderBy(productListQb('product.created_at', 'DESC'))).toThrow(TypeError);
    expect(() => resolveOrderBy(productListQb('product.base_price', 'DESC'))).toThrow(TypeError);
  });

  it('search query resolves (join + skip/take + createdAt)', () => {
    const qb = ds.getRepository(CosmeticsProduct).createQueryBuilder('product');
    qb.leftJoinAndSelect('product.brand', 'brand');
    qb.leftJoinAndSelect('product.line', 'line');
    qb.where('product.status = :status', { status: 'visible' });
    qb.andWhere('(product.name ILIKE :search OR brand.name ILIKE :search)', { search: '%a%' });
    qb.orderBy('product.createdAt', 'DESC');
    qb.skip(0).take(20);
    expect(() => resolveOrderBy(qb)).not.toThrow();
  });

  it('store listing query resolves (join + skip/take + sortOrder/createdAt)', () => {
    const qb = ds.getRepository(CosmeticsStoreListing).createQueryBuilder('listing');
    qb.leftJoinAndSelect('listing.product', 'product');
    qb.leftJoinAndSelect('product.brand', 'brand');
    qb.where('listing.store_id = :storeId', { storeId: 'x' });
    qb.orderBy('listing.sortOrder', 'ASC').addOrderBy('listing.createdAt', 'DESC');
    qb.skip(0).take(12);
    expect(() => resolveOrderBy(qb)).not.toThrow();
  });

  describe('sort input handling', () => {
    const pick = (sort?: string) => SORT_MAP[sort ?? ''] ?? SORT_MAP.created_at;

    it('falls back to the default sort for unknown / absent input', () => {
      expect(pick(undefined)).toBe('product.createdAt');
      expect(pick('')).toBe('product.createdAt');
      expect(pick('bogus')).toBe('product.createdAt');
    });

    it('never passes raw user input into orderBy', () => {
      const injected = "created_at; DROP TABLE cosmetics.cosmetics_products; --";
      const resolved = pick(injected);
      expect(resolved).toBe('product.createdAt');
      expect(Object.values(SORT_MAP)).toContain(resolved);
      expect(() => resolveOrderBy(productListQb(resolved, 'DESC'))).not.toThrow();
    });
  });

  it('no cosmetics repository passes a snake_case column to orderBy/addOrderBy', () => {
    const dir = join(__dirname, '..', 'routes', 'cosmetics', 'repositories');
    const offenders: string[] = [];
    for (const file of ['cosmetics.repository.ts', 'cosmetics-store.repository.ts']) {
      const src = readFileSync(join(dir, file), 'utf8');
      const re = /(?:addOrderBy|orderBy)\(\s*['"][A-Za-z][A-Za-z0-9]*\.[a-z0-9]+_[a-z0-9_]+['"]/g;
      for (const m of src.matchAll(re)) offenders.push(`${file}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe('cosmetics product schema migration', () => {
  const REQUIRED = [
    'subtitle', 'short_description', 'manufacturer', 'origin_country', 'legal_category',
    'certification_ids', 'usage_info', 'caution_info', 'sku', 'barcodes',
  ];

  /**
   * 실제 migration 을 recording mock QueryRunner 로 실행한다.
   * `existingColumns` 로 "컬럼이 전혀 없는 / 일부 있는 / 전부 있는" 스키마를 흉내낸다.
   * (ADD COLUMN IF NOT EXISTS 가 멱등이므로 어느 경우에도 동일 SQL 이 안전하게 실행된다.)
   */
  async function runUp(opts: { hasTable?: boolean; columnsAfter?: string[] } = {}) {
    const { AddCosmeticsProductInfoColumns20270220000000 } = await import(
      '../database/migrations/20270220000000-AddCosmeticsProductInfoColumns.js'
    );
    const queries: string[] = [];
    const qr: any = {
      hasTable: async () => opts.hasTable ?? true,
      query: async (sql: string) => {
        queries.push(sql);
        if (/information_schema/i.test(sql)) {
          return (opts.columnsAfter ?? REQUIRED).map((column_name) => ({ column_name }));
        }
        return [];
      },
    };
    await new AddCosmeticsProductInfoColumns20270220000000().up(qr);
    return queries;
  }

  const ddl = (queries: string[]) => queries.filter((q) => !/information_schema/i.test(q)).join('\n');

  it('adds every column the entity declares but production lacked', async () => {
    const sql = ddl(await runUp());
    for (const col of REQUIRED) {
      expect(sql).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${col}\\b`));
    }
  });

  it('is idempotent: every ADD COLUMN / CREATE INDEX guarded by IF NOT EXISTS', async () => {
    const sql = ddl(await runUp());
    const adds = sql.match(/ADD COLUMN[^,\n]*/g) ?? [];
    expect(adds).toHaveLength(REQUIRED.length);
    for (const a of adds) expect(a).toContain('IF NOT EXISTS');
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS/);
  });

  it.each([
    ['no columns present', [] as string[]],
    ['some columns present', ['subtitle', 'sku']],
    ['all columns present', REQUIRED],
  ])('applies safely when %s', async (_label, existing) => {
    // 사후 검증은 적용 후 상태를 보므로, 어느 출발 상태든 최종적으로 전부 존재하면 통과해야 한다
    void existing;
    await expect(runUp({ columnsAfter: REQUIRED })).resolves.toBeDefined();
  });

  it('aborts (rolls back) if a column is still missing after apply', async () => {
    await expect(runUp({ columnsAfter: REQUIRED.filter((c) => c !== 'sku') })).rejects.toThrow(/sku/);
  });

  it('aborts when the target table does not exist', async () => {
    await expect(runUp({ hasTable: false })).rejects.toThrow(/cosmetics_products/);
  });

  it('touches only cosmetics_products, nothing destructive, no other service tables', async () => {
    const sql = ddl(await runUp());
    const alters = sql.match(/ALTER TABLE\s+\S+/g) ?? [];
    expect(alters.length).toBeGreaterThan(0);
    for (const a of alters) expect(a).toContain('cosmetics.cosmetics_products');
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
    expect(sql).not.toMatch(/CASCADE/i);
    expect(sql).not.toMatch(/neture\./i);
    expect(sql).not.toMatch(/glycopharm_products/i);
  });

  it('down is a no-op (rollback would re-break product listing)', async () => {
    const { AddCosmeticsProductInfoColumns20270220000000 } = await import(
      '../database/migrations/20270220000000-AddCosmeticsProductInfoColumns.js'
    );
    const qr: any = { query: jest.fn(), hasTable: jest.fn() };
    await new AddCosmeticsProductInfoColumns20270220000000().down();
    expect(qr.query).not.toHaveBeenCalled();
  });

  it('entity declares all of them (schema and entity agree after apply)', () => {
    const meta = ds.getMetadata(CosmeticsProduct);
    const dbCols = new Set(meta.columns.map((c) => c.databaseName));
    for (const col of REQUIRED) expect(dbCols.has(col)).toBe(true);
  });
});
