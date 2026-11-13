/**
 * 공급자 주문 처리 · 정산 목록 — LIMIT/OFFSET 은 문자열 삽입이 아니라 binding 한다(Boundary Guard Rule 2).
 * page=1e400(Infinity) · 소수 · 0 이하 값은 SQL 오류(500)가 되지 않게 정수로 맞춘다.
 */
import type { DataSource } from 'typeorm';
import { SupplierOrderService } from '../supplier-order.service.js';
import { SupplierSettlementReadService } from '../supplier-settlement-read.service.js';

function recordingDataSource() {
  const query = jest.fn(async (sql: string) => (sql.includes('COUNT(') ? [{ total: 0 }] : []));
  return { ds: { query } as unknown as DataSource, query };
}

function listCall(query: jest.Mock) {
  const call = query.mock.calls.find(([sql]) => /LIMIT \$\d+ OFFSET \$\d+/.test(sql as string));
  expect(call).toBeDefined();
  return call as [string, unknown[]];
}

describe.each([
  ['SupplierOrderService.listOrders', (ds: DataSource, page: number, limit: number) =>
    new SupplierOrderService(ds).listOrders('supplier-1', { page, limit })],
  ['SupplierSettlementReadService.getSupplierSettlements', (ds: DataSource, page: number, limit: number) =>
    new SupplierSettlementReadService(ds).getSupplierSettlements('supplier-1', { page, limit } as never)],
] as const)('%s', (_name, run) => {
  it('LIMIT/OFFSET 을 마지막 두 parameter 로 binding 한다', async () => {
    const { ds, query } = recordingDataSource();
    await run(ds, 3, 20);
    const [sql, params] = listCall(query);
    expect(sql).not.toMatch(/LIMIT \d|OFFSET \d/);
    const n = params.length;
    expect(sql).toContain(`LIMIT $${n - 1} OFFSET $${n}`);
    expect(params.slice(-2)).toEqual([20, 40]);
    expect(params[0]).toBe('supplier-1');
  });

  it.each([
    [Infinity, 20, 1, 20],
    [2.7, 10.9, 2, 10],
    [0, 0, 1, 20],
    [-5, 1000, 1, 100],
    [Number.NaN, Number.NaN, 1, 20],
  ])('page=%s limit=%s → page %s · limit %s (유한 정수)', async (page, limit, expectedPage, expectedLimit) => {
    const { ds, query } = recordingDataSource();
    const result = await run(ds, page, limit);
    const [, params] = listCall(query);
    expect(params.slice(-2)).toEqual([expectedLimit, (expectedPage - 1) * expectedLimit]);
    expect(result.meta).toMatchObject({ page: expectedPage, limit: expectedLimit });
  });
});
