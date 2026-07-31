/**
 * WO-O4O-GLYCOPHARM-BILLING-INVOICES-RECOVERY-V1 — regression guard
 *
 * 배경: `glycopharm_billing_invoices` 테이블이 운영에 없었는데도 조회 API 가
 *   `200 { data: [] }` 를 반환했다. service/controller 가 예외를 삼키고 빈 배열을
 *   돌려준 탓에 "청구서 0건" 과 "조회 실패" 가 구분되지 않아 장애가 탐지되지 않았다.
 *
 * (1) migration 을 recording mock 으로 실행해 DDL·멱등성·중지조건을 검증하고
 * (2) entity metadata 와 대조하며
 * (3) 예외 위장 처리가 제거되고 5xx 가 내부 DB 정보를 노출하지 않는지 소스로 검증한다.
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

import { GlycopharmBillingInvoice } from '../routes/glycopharm/entities/billing-invoice.entity.js';

const MIGRATION = '../database/migrations/20270223000000-CreateGlycopharmBillingInvoicesTable.js';

const EXPECTED_COLUMNS = [
  'id', 'service_key', 'supplier_id', 'pharmacy_id', 'period_from', 'period_to',
  'unit', 'unit_price', 'count', 'amount', 'currency', 'status', 'snapshot_at',
  'created_by', 'confirmed_by', 'confirmed_at', 'line_snapshot', 'metadata',
  'dispatch_status', 'dispatched_at', 'dispatched_to', 'received_at', 'dispatch_log',
  'created_at', 'updated_at',
];
const EXPECTED_INDEXES = [
  'IDX_billing_invoice_unique_period',
  'IDX_billing_invoice_status',
  'IDX_billing_invoice_supplier',
  'IDX_billing_invoice_pharmacy',
];

async function runUp(opts: {
  existingBefore?: string[];
  columnsAfter?: string[];
  indexesAfter?: string[];
} = {}) {
  const { CreateGlycopharmBillingInvoicesTable20270223000000 } = await import(MIGRATION);
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
      ddl.push(sql);
      postApply = true;
      return [];
    },
  };
  await new CreateGlycopharmBillingInvoicesTable20270223000000().up(qr);
  return ddl;
}

describe('glycopharm_billing_invoices migration', () => {
  it('creates the table with all 25 entity columns, dispatch fields included', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "glycopharm_billing_invoices"/);
    for (const c of EXPECTED_COLUMNS) expect(sql).toMatch(new RegExp(`"${c}"`));
    // Phase 3-E 발송 필드는 별도 orphan 이 나눠 만들던 것 — 단일 CREATE 에 포함되어야 한다
    for (const c of ['dispatch_status', 'dispatched_at', 'dispatched_to', 'received_at', 'dispatch_log']) {
      expect(sql).toMatch(new RegExp(`"${c}"`));
    }
  });

  it('creates all four indexes with the unique period constraint', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "IDX_billing_invoice_unique_period"[\s\S]*?"supplier_id", "pharmacy_id", "period_from", "period_to", "unit"/);
    for (const i of EXPECTED_INDEXES) expect(sql).toContain(`"${i}"`);
  });

  it('is idempotent: table and indexes guarded by IF NOT EXISTS', async () => {
    const sql = (await runUp()).join('\n');
    const creates = sql.match(/CREATE (?:TABLE|(?:UNIQUE )?INDEX)[^\n(]*/g) ?? [];
    expect(creates).toHaveLength(1 + EXPECTED_INDEXES.length);
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
      runUp({ existingBefore: EXPECTED_COLUMNS.filter((c) => c !== 'dispatch_log') })
    ).rejects.toThrow(/dispatch_log/);
  });

  it('ABORTS if a column is missing after apply', async () => {
    await expect(
      runUp({ columnsAfter: EXPECTED_COLUMNS.filter((c) => c !== 'snapshot_at') })
    ).rejects.toThrow(/snapshot_at/);
  });

  it('ABORTS if an index is missing after apply', async () => {
    await expect(runUp({ indexesAfter: EXPECTED_INDEXES.slice(1) }))
      .rejects.toThrow(/IDX_billing_invoice_unique_period/);
  });

  it('performs no DML, nothing destructive, creates no FK, touches no other table', async () => {
    const sql = (await runUp()).join('\n');
    expect(sql).not.toMatch(/\b(INSERT INTO|UPDATE\s+"|DELETE FROM)\b/i);
    expect(sql).not.toMatch(/DROP/i);
    expect(sql).not.toMatch(/CASCADE/i);
    expect(sql).not.toMatch(/REFERENCES/i);
    const targets = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS "(\w+)"|ON "(\w+)"/g)].map((m) => m[1] ?? m[2]);
    for (const t of targets) expect(t).toBe('glycopharm_billing_invoices');
  });

  it('down is a no-op (rollback would destroy finalized billing snapshots)', async () => {
    const { CreateGlycopharmBillingInvoicesTable20270223000000 } = await import(MIGRATION);
    const qr: any = { query: jest.fn() };
    await new CreateGlycopharmBillingInvoicesTable20270223000000().down();
    expect(qr.query).not.toHaveBeenCalled();
  });
});

describe('entity ↔ migration parity', () => {
  let ds: DataSource;
  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host: 'localhost', port: 5432, username: 'unused', password: 'unused', database: 'unused',
      entities: [GlycopharmBillingInvoice],
    });
    await ds.buildMetadatas();
  });

  it('entity columns match the migration exactly', () => {
    const meta = ds.getMetadata(GlycopharmBillingInvoice);
    expect(meta.tableName).toBe('glycopharm_billing_invoices');
    expect(meta.columns.map((c) => c.databaseName).sort()).toEqual([...EXPECTED_COLUMNS].sort());
  });

  it('declares the unique billing-period index the migration creates', () => {
    const meta = ds.getMetadata(GlycopharmBillingInvoice);
    const unique = meta.indices.filter((i) => i.isUnique);
    expect(unique).toHaveLength(1);
    expect(unique[0].columns.map((c) => c.databaseName))
      .toEqual(['supplier_id', 'pharmacy_id', 'period_from', 'period_to', 'unit']);
  });

  it('declares no relation (so the migration creates no FK)', () => {
    expect(ds.getMetadata(GlycopharmBillingInvoice).relations).toHaveLength(0);
  });
});

describe('invoice API no longer disguises DB failure as an empty list', () => {
  const service = () =>
    readFileSync(join(__dirname, '..', 'routes', 'glycopharm', 'services', 'invoice.service.ts'), 'utf8');
  const controller = () =>
    readFileSync(join(__dirname, '..', 'routes', 'glycopharm', 'controllers', 'invoice.controller.ts'), 'utf8');

  it('service no longer swallows list errors into an empty array', () => {
    const src = service();
    expect(src).not.toMatch(/table may not exist/i);
    // listInvoices 본문에 "catch → return []" 패턴이 없어야 한다
    expect(src).not.toMatch(/catch\s*\([^)]*\)\s*\{[^}]*return\s*\[\]\s*;?[^}]*\}/);
  });

  it('controller no longer swallows the list query into an empty result', () => {
    const src = controller();
    expect(src).not.toMatch(/returning empty/i);
    expect(src).not.toMatch(/Table may not exist/i);
    expect(src).not.toMatch(/let invoices: any\[\] = \[\];/);
  });

  it('every 5xx response uses the generic message, never error.message', () => {
    const src = controller();
    // status 500 경로에서 error.message 를 직접 싣는 곳이 없어야 한다
    expect(src).not.toMatch(/res\.status\(500\)\.json\(\{[^}]*error: error\.message/);
    const generic = src.match(/INVOICE_INTERNAL_ERROR_MESSAGE/g) ?? [];
    // 상수 선언 1 + 사용처 4 (create / confirm / get / list)
    expect(generic.length).toBe(5);
  });

  it('the generic message exposes no relation / schema / SQL detail', () => {
    const m = controller().match(/const INVOICE_INTERNAL_ERROR_MESSAGE = '([^']+)'/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/relation|schema|select|table|glycopharm_billing_invoices|does not exist/i);
  });

  it('keeps deliberate domain responses (409 duplicate / 404 not found / 409 invalid status)', () => {
    const src = controller();
    expect(src).toMatch(/status === 409 \? error\.message/);
    expect(src).toMatch(/status === 500 \? INVOICE_INTERNAL_ERROR_MESSAGE : error\.message/);
    expect(src).toMatch(/'DUPLICATE_INVOICE'/);
    expect(src).toMatch(/'NOT_FOUND'/);
    expect(src).toMatch(/'INVALID_STATUS'/);
  });

  it('keeps auth/permission contract untouched', () => {
    const src = controller();
    expect(src).toMatch(/code: 'UNAUTHORIZED'/);
    expect(src).toMatch(/code: 'FORBIDDEN'/);
  });

  it('still logs the real error server-side for diagnosis', () => {
    const src = controller();
    expect((src.match(/console\.error\([^)]*error\)/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('preserves the list filters and ordering contract', () => {
    const src = service();
    for (const f of ['i.status', 'i.pharmacy_id', 'i.supplier_id', 'i.period_from', 'i.period_to']) {
      expect(src).toContain(f);
    }
    expect(src).toMatch(/ORDER BY i\.created_at DESC/);
  });
});
