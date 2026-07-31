/**
 * WO-O4O-PLATFORM-STORE-POLICY-TABLES-RECOVERY-V1 — regression guard
 *
 * 배경: `platform_store_policies` / `platform_store_payment_configs` 테이블이 운영에 없어
 *   공개 정책 API 가 500 이었다(`relation ... does not exist`). 테이블을 만드는 migration 이
 *   러너가 스캔하지 않는 `src/migrations/` 에 있어 실행된 적이 없었다.
 *
 * 이 테스트는 DB 연결 없이
 *   (1) migration 을 recording mock QueryRunner 로 실행해 DDL·멱등성·중지조건을 검증하고
 *   (2) postgres metadata 를 빌드해 entity 정의와 migration 이 만든 컬럼을 대조한다.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// NOTE: jest resolver 는 '@o4o/platform-core/store-policy' subpath export 를 해석하지 못한다.
//       런타임(entities.ts)은 subpath 를 쓰지만, 테스트는 같은 소스를 상대 경로로 직접 읽는다.
import { PlatformStorePolicy } from '../../../../packages/platform-core/src/store-policy/entities/platform-store-policy.entity.js';
import { PlatformStorePaymentConfig } from '../../../../packages/platform-core/src/store-policy/entities/platform-store-payment-config.entity.js';

const MIGRATION = '../database/migrations/20270221000000-CreatePlatformStorePolicyTables.js';

const EXPECTED: Record<string, string[]> = {
  platform_store_policies: [
    'id', 'store_id', 'service_key', 'terms_of_service', 'privacy_policy',
    'refund_policy', 'shipping_policy', 'is_active', 'version', 'created_at', 'updated_at',
  ],
  platform_store_payment_configs: [
    'id', 'store_id', 'service_key', 'provider', 'mode', 'merchant_id',
    'api_key', 'api_secret', 'is_active', 'version', 'created_at', 'updated_at',
  ],
};
const EXPECTED_INDEXES = [
  'idx_platform_store_policies_store_service',
  'idx_platform_store_policies_is_active',
  'idx_platform_store_payment_configs_store_service',
  'idx_platform_store_payment_configs_is_active',
];

/**
 * @param existingBefore  적용 전 이미 존재하는 테이블→컬럼 (부분 존재 상태 재현)
 * @param columnsAfter    적용 후 census 가 돌려줄 컬럼 (실패 주입용)
 */
async function runUp(opts: {
  existingBefore?: Record<string, string[]>;
  columnsAfter?: Record<string, string[]>;
  indexesAfter?: string[];
} = {}) {
  const { CreatePlatformStorePolicyTables20270221000000 } = await import(MIGRATION);
  const ddl: string[] = [];
  let postApply = false;
  const qr: any = {
    query: async (sql: string, params?: any[]) => {
      if (/information_schema\.columns/i.test(sql)) {
        const table = params?.[0] as string;
        const src = postApply
          ? (opts.columnsAfter ?? EXPECTED)
          : (opts.existingBefore ?? {});
        return (src[table] ?? []).map((column_name) => ({ column_name }));
      }
      if (/pg_indexes/i.test(sql)) {
        return (opts.indexesAfter ?? EXPECTED_INDEXES).map((indexname) => ({ indexname }));
      }
      ddl.push(sql);
      postApply = true; // 첫 DDL 이후의 information_schema 조회는 "적용 후" census
      return [];
    },
  };
  await new CreatePlatformStorePolicyTables20270221000000().up(qr);
  return ddl;
}

describe('platform store policy/payment tables migration', () => {
  it('creates both tables with every column the entities declare', async () => {
    const sql = (await runUp()).join('\n');
    for (const [table, cols] of Object.entries(EXPECTED)) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS "${table}"`));
      for (const c of cols) expect(sql).toMatch(new RegExp(`"${c}"`));
    }
  });

  it('is idempotent: tables and indexes guarded by IF NOT EXISTS', async () => {
    const sql = (await runUp()).join('\n');
    const creates = sql.match(/CREATE (?:TABLE|INDEX)[^\n(]*/g) ?? [];
    expect(creates.length).toBe(2 + EXPECTED_INDEXES.length);
    for (const c of creates) expect(c).toContain('IF NOT EXISTS');
  });

  it('creates all four entity-declared indexes', async () => {
    const sql = (await runUp()).join('\n');
    for (const i of EXPECTED_INDEXES) expect(sql).toContain(`"${i}"`);
  });

  it.each([
    ['both tables absent', {}],
    ['only policies exists', { platform_store_policies: EXPECTED.platform_store_policies }],
    ['only payment configs exists', { platform_store_payment_configs: EXPECTED.platform_store_payment_configs }],
    ['both already exist', EXPECTED],
  ])('applies safely when %s', async (_label, existingBefore) => {
    await expect(runUp({ existingBefore: existingBefore as Record<string, string[]> })).resolves.toBeDefined();
  });

  it('ABORTS instead of ALTERing when an existing table conflicts with the entity', async () => {
    await expect(
      runUp({
        existingBefore: {
          platform_store_policies: EXPECTED.platform_store_policies.filter((c) => c !== 'refund_policy'),
        },
      })
    ).rejects.toThrow(/refund_policy/);
  });

  it('ABORTS if a column is still missing after apply', async () => {
    await expect(
      runUp({
        columnsAfter: {
          ...EXPECTED,
          platform_store_payment_configs: EXPECTED.platform_store_payment_configs.filter((c) => c !== 'merchant_id'),
        },
      })
    ).rejects.toThrow(/merchant_id/);
  });

  it('ABORTS if an index is missing after apply', async () => {
    await expect(runUp({ indexesAfter: EXPECTED_INDEXES.slice(1) })).rejects.toThrow(/idx_platform_store_policies_store_service/);
  });

  it('performs no DML and nothing destructive, and touches no other table', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/i);
    expect(sql).not.toMatch(/DROP/i);
    expect(sql).not.toMatch(/CASCADE/i);
    expect(sql).not.toMatch(/ALTER TABLE/i);
    const targets = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS "(\w+)"|ON "(\w+)"/g)]
      .map((m) => m[1] ?? m[2]);
    for (const t of targets) expect(Object.keys(EXPECTED)).toContain(t);
  });

  it('creates no foreign key (store_id is a logical, cross-service reference)', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).not.toMatch(/REFERENCES/i);
  });

  it('down is a no-op (rollback would re-break the public API and destroy payment config)', async () => {
    const { CreatePlatformStorePolicyTables20270221000000 } = await import(MIGRATION);
    const qr: any = { query: jest.fn() };
    await new CreatePlatformStorePolicyTables20270221000000().down();
    expect(qr.query).not.toHaveBeenCalled();
  });
});

describe('entity ↔ migration column parity', () => {
  let ds: DataSource;
  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host: 'localhost', port: 5432, username: 'unused', password: 'unused', database: 'unused',
      entities: [PlatformStorePolicy, PlatformStorePaymentConfig],
    });
    await ds.buildMetadatas();
  });

  it.each([
    ['platform_store_policies', () => PlatformStorePolicy],
    ['platform_store_payment_configs', () => PlatformStorePaymentConfig],
  ])('%s: entity columns match the migration exactly', (table, getCls) => {
    const meta = ds.getMetadata(getCls());
    expect(meta.tableName).toBe(table);
    const entityCols = meta.columns.map((c) => c.databaseName).sort();
    expect(entityCols).toEqual([...EXPECTED[table]].sort());
  });

  it('entity indexes match the migration index names', () => {
    const names = [
      ...ds.getMetadata(PlatformStorePolicy).indices.map((i) => i.name),
      ...ds.getMetadata(PlatformStorePaymentConfig).indices.map((i) => i.name),
    ].filter(Boolean).sort();
    expect(names).toEqual([...EXPECTED_INDEXES].sort());
  });

  it('declares no relations (so no FK is expected)', () => {
    expect(ds.getMetadata(PlatformStorePolicy).relations).toHaveLength(0);
    expect(ds.getMetadata(PlatformStorePaymentConfig).relations).toHaveLength(0);
  });
});
