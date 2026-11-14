/**
 * neture 목록 질의의 LIMIT/OFFSET binding — Raw SQL 문자열 삽입 금지(CLAUDE.md §7 Guard Rule 2).
 * 요청 page/limit 이 Infinity · NaN · 소수 · 0 이하여도 SQL 오류(500)가 되지 않게 유한 정수로 맞춘다.
 */
import type { DataSource } from 'typeorm';
import { pageWindow, toPositiveInt } from '../../utils/pagination-sql.util.js';
import { AdminSettlementReadService } from '../admin-settlement-read.service.js';
import { ProductContentBrowseService } from '../product-content-browse.service.js';
import { ProductImageQualityService } from '../product-image-quality.service.js';
import { ProductUsageLinksService } from '../product-usage-links.service.js';
import { SharedProductDescriptionService } from '../shared-product-description.service.js';

jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('pagination-sql.util', () => {
  it.each([
    [undefined, 20], [null, 20], ['', 20], [Number.NaN, 20], [Infinity, 20], [-Infinity, 20],
    [0, 20], [-3, 20], [2.9, 2], ['7', 7], [1000, 100], ['1e400', 20],
  ])('toPositiveInt(%s) → %s', (value, expected) => {
    expect(toPositiveInt(value, 20, 100)).toBe(expected);
  });

  it('pageWindow 는 page/limit 을 정규화하고 offset 을 계산한다', () => {
    expect(pageWindow(3, 10, { defaultLimit: 20, maxLimit: 100 })).toEqual({ page: 3, limit: 10, offset: 20 });
    expect(pageWindow(Infinity, 1e9, { defaultLimit: 20, maxLimit: 100 })).toEqual({ page: 1, limit: 100, offset: 0 });
    expect(pageWindow(5e6, 20, { defaultLimit: 20, maxLimit: 100 }).page).toBe(1_000_000);
  });
});

function recordingDataSource() {
  const query = jest.fn(async (sql: string) => {
    if (/COUNT\(/i.test(sql)) return [{ count: '0', c: '0', total: 0 }];
    if (sql.includes('FROM product_masters WHERE id = $1')) return [{ barcode: '8800000000000' }];
    return [];
  });
  const ds = { query, getRepository: jest.fn(() => ({})) } as unknown as DataSource;
  return { ds, query };
}

function boundListCalls(query: jest.Mock) {
  return query.mock.calls.filter(([sql]) => /LIMIT \$\d+/.test(sql as string)) as [string, unknown[]][];
}

describe.each([
  ['AdminSettlementReadService.getAdminSettlements', (ds: DataSource, page: unknown, limit: unknown) =>
    new AdminSettlementReadService(ds).getAdminSettlements({ page, limit } as never)],
  ['ProductContentBrowseService.list', (ds: DataSource, page: unknown, limit: unknown) =>
    new ProductContentBrowseService(ds).list({ page, limit } as never)],
  ['ProductImageQualityService.list', (ds: DataSource, page: unknown, limit: unknown) =>
    new ProductImageQualityService(ds).list({ page, limit } as never)],
  ['SharedProductDescriptionService.listSupplierStoreReview', (ds: DataSource, page: unknown, limit: unknown) =>
    new SharedProductDescriptionService(ds).listSupplierStoreReview({ page, limit } as never)],
  ['SharedProductDescriptionService.listForReview', (ds: DataSource, page: unknown, limit: unknown) =>
    new SharedProductDescriptionService(ds).listForReview({ page, limit } as never)],
] as const)('%s', (_name, run) => {
  it.each([
    [3, 10, 10, 20],
    [Infinity, Number.NaN, 20, 0],
    [2.5, 1000, 100, 100],
    [-1, 0, 20, 0],
  ])('page=%s limit=%s → LIMIT %s OFFSET %s 를 binding', async (page, limit, expectedLimit, expectedOffset) => {
    const { ds, query } = recordingDataSource();
    await run(ds, page, limit);
    const calls = boundListCalls(query);
    expect(calls).toHaveLength(1);
    const [sql, params] = calls[0];
    expect(sql).not.toMatch(/LIMIT \d|OFFSET \d/);
    const n = params.length;
    expect(sql).toContain(`LIMIT $${n - 1} OFFSET $${n}`);
    expect(params.slice(-2)).toEqual([expectedLimit, expectedOffset]);
  });
});

describe('LIMIT only', () => {
  it('ProductUsageLinksService.getUsageLinks 는 세 질의 모두 LIMIT 을 binding 한다', async () => {
    const { ds, query } = recordingDataSource();
    await new ProductUsageLinksService(ds).getUsageLinks('master-1', Number.NaN);
    const calls = boundListCalls(query);
    expect(calls.length).toBe(3);
    for (const [sql, params] of calls) {
      expect(sql).not.toMatch(/LIMIT \d/);
      expect(sql).toContain('LIMIT $2');
      expect(typeof params[1]).toBe('number');
      expect(Number.isInteger(params[1])).toBe(true);
    }
  });

  it('SharedProductDescriptionService.listCanonicalReplaceAuditLogs 는 LIMIT 을 4번째 parameter 로 binding 한다', async () => {
    const { ds, query } = recordingDataSource();
    await new SharedProductDescriptionService(ds).listCanonicalReplaceAuditLogs('master-1', 'STORE', null, Infinity);
    const [sql, params] = boundListCalls(query)[0];
    expect(sql).toContain('LIMIT $4');
    expect(params).toEqual(['master-1', 'STORE', null, 5]);
  });
});
