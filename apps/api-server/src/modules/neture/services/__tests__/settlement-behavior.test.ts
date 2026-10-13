import type { DataSource } from 'typeorm';
import { NetureSettlementService } from '../neture-settlement.service.js';
import { listSupplierOwnerUserIds } from '../../middleware/supplier-context.resolver.js';
import { notificationService } from '../../../../services/NotificationService.js';
import logger from '../../../../utils/logger.js';

jest.mock('../../middleware/supplier-context.resolver.js', () => ({ listSupplierOwnerUserIds: jest.fn() }));
jest.mock('../../../../services/NotificationService.js', () => ({ notificationService: { createNotification: jest.fn() } }));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const owners = listSupplierOwnerUserIds as jest.Mock;
const notify = notificationService.createNotification as jest.Mock;
const supplierId = 'fixture-supplier';
const settlementId = 'fixture-settlement';
const start = '2026-01-01';
const end = '2026-01-31';
const row = { id: settlementId, supplier_id: supplierId, status: 'calculated' };
let query: jest.Mock;
let transaction: jest.Mock;
let lockQuery: jest.Mock;
let createQueryRunner: jest.Mock;
let source: DataSource;
let service: NetureSettlementService;

beforeEach(() => {
  jest.clearAllMocks();
  owners.mockReset().mockResolvedValue(['fixture-owner-a', 'fixture-owner-b']);
  notify.mockReset().mockResolvedValue({});
  query = jest.fn();
  lockQuery = jest.fn().mockResolvedValue([]);
  transaction = jest.fn(async (callback) => callback({ query: (sql: string, params?: unknown[]) =>
    sql.includes('pg_advisory_xact_lock') ? lockQuery(sql, params) : query(sql, params) }));
  createQueryRunner = jest.fn();
  source = { query, transaction, createQueryRunner } as unknown as DataSource;
  service = new NetureSettlementService(source);
});

const list = (kind: 'supplier' | 'admin', status?: string) => kind === 'supplier'
  ? service.getSupplierSettlements(supplierId, { page: 2, limit: 3, status })
  : service.getAdminSettlements({ page: 2, limit: 3, status });
const detail = (kind: 'supplier' | 'admin') => kind === 'supplier'
  ? service.getSupplierSettlementDetail(settlementId, supplierId)
  : service.getAdminSettlementDetail(settlementId);
const kpi = (kind: 'supplier' | 'admin') => kind === 'supplier'
  ? service.getSupplierKpi(supplierId) : service.getAdminKpi();
const update = (kind: 'approve' | 'pay' | 'cancel', notes?: string) => kind === 'approve'
  ? service.approveSettlement(settlementId, notes)
  : kind === 'pay' ? service.paySettlement(settlementId, notes) : service.cancelSettlement(settlementId, notes);

describe('settlement reads: ownership, filters, response and DB failures', () => {
  it.each([
    ['supplier', undefined], ['supplier', 'paid'], ['supplier', 'not-a-status'],
    ['admin', undefined], ['admin', 'paid'], ['admin', 'not-a-status'],
  ] as const)('%s listing preserves optional status %s and page metadata', async (kind, status) => {
    query.mockResolvedValueOnce([row]).mockResolvedValueOnce([{ total: '7' }]);
    expect(await list(kind, status)).toEqual({
      success: true, data: [row], meta: { page: 2, limit: 3, total: 7, totalPages: 3 },
    });
    const params = [...(kind === 'supplier' ? [supplierId] : []), ...(status === 'paid' ? ['paid'] : [])];
    expect(query.mock.calls.map((call) => call[1])).toEqual([params, params]);
    expect(query.mock.calls[0][0]).toContain('LIMIT 3 OFFSET 3');
    if (kind === 'supplier') {
      for (const [sql] of query.mock.calls) expect(sql).toContain('s.supplier_id = $1');
    } else {
      expect(query.mock.calls[0][0]).toContain('organizations supplier_org');
    }
    expect(query.mock.calls[0][0].includes('s.status =')).toBe(status === 'paid');
  });

  it.each([
    ['supplier', 0], ['supplier', 1], ['admin', 0], ['admin', 1],
  ] as const)('%s list query %i failure is propagated', async (kind, failing) => {
    const error = new Error('Fixture list failure');
    query.mockImplementation(async () => {
      if (query.mock.calls.length - 1 === failing) throw error;
      return [];
    });
    await expect(list(kind)).rejects.toBe(error);
  });

  it.each(['supplier', 'admin'] as const)('%s list empty count defaults to zero', async (kind) => {
    query.mockResolvedValue([]);
    expect(await list(kind)).toEqual({
      success: true, data: [], meta: { page: 2, limit: 3, total: 0, totalPages: 0 },
    });
  });

  it.each(['supplier', 'admin'] as const)('%s KPI converts string amounts/counts', async (kind) => {
    const expected = kind === 'supplier'
      ? { pending_amount: 15, paid_amount: 20, total_amount: 35, pending_count: 2, paid_count: 1 }
      : { calculated_count: 2, calculated_amount: 15, approved_count: 1, approved_amount: 5, paid_count: 3, paid_amount: 20 };
    query.mockResolvedValue([Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, String(value)]))]);
    expect(await kpi(kind)).toEqual({ success: true, data: expected });
    if (kind === 'supplier') expect(query.mock.calls[0][1]).toEqual([supplierId]);
    expect(query.mock.calls[0][0]).toContain("status != 'cancelled'");
  });

  it.each(['supplier', 'admin'] as const)('%s empty KPI returns zero fields', async (kind) => {
    query.mockResolvedValue([]);
    const result = await kpi(kind);
    expect(Object.values(result.data)).toEqual(kind === 'supplier' ? [0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0]);
  });

  it.each(['supplier', 'admin'] as const)('%s KPI failure remains a rejection', async (kind) => {
    const error = new Error('Fixture KPI failure');
    query.mockRejectedValue(error);
    await expect(kpi(kind)).rejects.toBe(error);
  });

  it.each(['supplier', 'admin'] as const)('%s missing detail returns null without querying orders', async (kind) => {
    query.mockResolvedValue([]);
    expect(await detail(kind)).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(kind === 'supplier' ? [settlementId, supplierId] : [settlementId]);
    if (kind === 'supplier') expect(query.mock.calls[0][0]).toContain('AND supplier_id = $2');
  });

  it.each(['supplier', 'admin'] as const)('%s detail preserves linked order response', async (kind) => {
    const orders = [{ order_id: 'fixture-order', supplier_sales_amount: 15 }];
    query.mockResolvedValueOnce([row]).mockResolvedValueOnce(orders);
    expect(await detail(kind)).toEqual({ success: true, data: { ...row, orders } });
    expect(query.mock.calls[1][1]).toEqual([settlementId]);
    expect(query.mock.calls[1][0]).toContain('JOIN neture_orders o ON o.id = so.order_id');
  });

  it.each([
    ['supplier', 0], ['supplier', 1], ['admin', 0], ['admin', 1],
  ] as const)('%s detail query %i failure remains a rejection', async (kind, stage) => {
    const error = new Error('Fixture detail failure');
    if (stage) query.mockResolvedValueOnce([row]);
    query.mockRejectedValueOnce(error);
    await expect(detail(kind)).rejects.toBe(error);
    expect(query).toHaveBeenCalledTimes(stage + 1);
  });
});

describe('settlement calculation: existing eligible scope, money and sequential queries', () => {
  it('rejects cross-supplier junction overlap before creating any settlement', async () => {
    query.mockResolvedValueOnce(['fixture-a', 'fixture-b'].map(id => ({ supplier_id: id, total_sales: 10, order_count: 1, order_ids: ['fixture-shared-order'] })));
    await expect(service.calculateSettlements(start, end)).rejects.toMatchObject({ code: 'SETTLEMENT_ORDER_SUPPLIER_CONFLICT', conflictingOrderCount: 1 });
    expect(query).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });
  it('empty eligible aggregate returns zero with no mutations or notification', async () => {
    query.mockResolvedValue([]);
    expect(await service.calculateSettlements(start, end)).toEqual({
      success: true, data: { created: 0, settlements: [] },
      message: 'No unsettled, payment-ready delivered orders found in the given period.',
    });
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual([start, end, 'neture']);
    expect(sql).toContain("o.status = 'delivered'");
    expect(sql).toContain('o.paid_at IS NOT NULL');
    expect(sql).toContain("o.metadata->>'paymentStatus' = 'paid'");
    expect(sql).toContain("o.metadata->>'paymentReady' = 'true'");
    expect(sql).toContain("COALESCE(o.service_key, 'neture') = $3");
    expect(sql).toContain("o.updated_at < ($2::date + INTERVAL '1 day')");
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('HAVING SUM(oi.total_price) > 0');
    expect(notify).not.toHaveBeenCalled();
  });

  it.each([[4, 0, 4], [5, 1, 4], [15, 2, 13], [101, 10, 91], [105, 11, 94]])(
    'sales %i preserve rounded fee %i and supplier amount %i',
    async (sales, fee, amount) => {
      const orderId = 'fixture-order';
      query.mockResolvedValueOnce([{ supplier_id: supplierId, total_sales: String(sales), order_ids: [orderId], order_count: 1 }])
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([{ order_id: orderId, supplier_sales_amount: String(sales) }])
        .mockResolvedValueOnce([]);
      expect(await service.calculateSettlements(start, end)).toEqual({ success: true, data: { created: 1, settlements: [row] } });
      expect(query.mock.calls[1][1]).toEqual([supplierId, start, end, sales, fee, amount, 0.10, 1]);
      expect(query.mock.calls[1][0]).toContain("VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'calculated')");
      expect(query.mock.calls[2][1]).toEqual([[orderId], supplierId]);
      expect(query.mock.calls[3][1]).toEqual([settlementId, orderId, String(sales)]);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(lockQuery).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(7410, 1)', undefined);
      expect(createQueryRunner).not.toHaveBeenCalled();
    },
  );

  it('multiple supplier groups and their junction rows remain sequential', async () => {
    const aggregate = ['fixture-a', 'fixture-b'].map((id) => ({
      supplier_id: id, total_sales: '15', order_ids: [id + '-order'], order_count: 1,
    }));
    query.mockResolvedValueOnce(aggregate);
    for (const agg of aggregate) {
      query.mockResolvedValueOnce([{ id: agg.supplier_id + '-settlement' }])
        .mockResolvedValueOnce([{ order_id: agg.order_ids[0], supplier_sales_amount: '15' }]).mockResolvedValueOnce([]);
    }
    const result = await service.calculateSettlements(start, end);
    expect(result.data.created).toBe(2);
    expect(query.mock.calls.slice(1).map((call) => call[1])).toEqual([
      ['fixture-a', start, end, 15, 2, 13, 0.10, 1], [['fixture-a-order'], 'fixture-a'], ['fixture-a-settlement', 'fixture-a-order', '15'],
      ['fixture-b', start, end, 15, 2, 13, 0.10, 1], [['fixture-b-order'], 'fixture-b'], ['fixture-b-settlement', 'fixture-b-order', '15'],
    ]);
  });

  it.each([0, 1, 2, 3])('calculation query failure at stage %i stops and propagates', async (stage) => {
    const error = new Error('Fixture calculation failure');
    const responses = [
      [{ supplier_id: supplierId, total_sales: '15', order_ids: ['fixture-order'], order_count: 1 }],
      [row], [{ order_id: 'fixture-order', supplier_sales_amount: '15' }],
    ];
    for (let i = 0; i < stage; i++) query.mockResolvedValueOnce(responses[i]);
    query.mockRejectedValueOnce(error);
    await expect(service.calculateSettlements(start, end)).rejects.toBe(error);
    expect(query).toHaveBeenCalledTimes(stage + 1);
    expect(transaction).toHaveBeenCalledTimes(1);
      expect(lockQuery).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(7410, 1)', undefined);
    expect(createQueryRunner).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('settlement commands: transition gates, generated bind markers and failures', () => {
  it.each([
    ['approve', undefined], ['approve', ''], ['approve', "Fixture note '$2'"], ['approve', null],
    ['pay', undefined], ['pay', ''], ['pay', "Fixture note '$2'"], ['pay', null],
    ['cancel', undefined], ['cancel', ''], ['cancel', "Fixture note '$2'"], ['cancel', null],
  ] as const)('%s binds notes %s without changing transition SQL', async (kind, notes) => {
    query.mockResolvedValueOnce([row]).mockResolvedValue([]);
    expect(await update(kind, notes as string | undefined)).toEqual({ success: true, data: row });
    const [sql, params] = query.mock.calls[0];
    const hasNotes = notes !== undefined;
    expect(params).toEqual([...(kind === 'cancel' ? ['cancelled'] : []), ...(hasNotes ? [notes] : []), settlementId]);
    expect(sql).toContain('WHERE id = $' + params.length);
    if (hasNotes) expect(sql).toContain('notes = $' + (kind === 'cancel' ? 2 : 1));
    else expect(sql).not.toContain('notes =');
    if (notes) expect(sql).not.toContain(notes);
    if (kind === 'approve') expect(sql).toContain("status = 'calculated'");
    if (kind === 'pay') expect(sql).toContain("status = 'approved'");
    if (kind === 'cancel') {
      expect(sql).toContain("status IN ('calculated', 'approved')");
      expect(query.mock.calls[1]).toEqual(['DELETE FROM neture_settlement_orders WHERE settlement_id = $1', [settlementId]]);
    }
  });

  it.each([
    ['approve', []], ['approve', null], ['approve', undefined],
    ['pay', []], ['pay', null], ['pay', undefined],
    ['cancel', []], ['cancel', null], ['cancel', undefined],
  ] as const)('%s no changed row returns null (%s) with no further effects', async (kind, response) => {
    query.mockResolvedValue(response);
    expect(await update(kind)).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
    expect(owners).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it.each(['approve', 'pay', 'cancel'] as const)('%s UPDATE error propagates with no further effects', async (kind) => {
    const error = new Error('Fixture update failure');
    query.mockRejectedValue(error);
    await expect(update(kind)).rejects.toBe(error);
    expect(query).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it('cancellation junction deletion failure propagates through the transaction', async () => {
    const error = new Error('Fixture junction deletion failure');
    query.mockResolvedValueOnce([row]).mockRejectedValueOnce(error);
    await expect(service.cancelSettlement(settlementId)).rejects.toBe(error);
    expect(query).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenCalledTimes(1);
      expect(lockQuery).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(7410, 1)', undefined);
  });
});

describe('settlement-paid notification: owners, privacy, sequencing and failure policy', () => {
  it('successful payment resolves canonical owners using the same DataSource and minimal metadata', async () => {
    query.mockResolvedValue([row]);
    await service.paySettlement(settlementId);
    expect(owners).toHaveBeenCalledWith(source, supplierId);
    expect(notify.mock.calls.map((call) => call[0])).toEqual(['fixture-owner-a', 'fixture-owner-b'].map((userId) => ({
      userId, type: 'settlement.paid', title: '정산이 완료되었습니다',
      message: '정산 지급이 완료되었습니다. 정산 내역에서 확인해 주세요.', serviceKey: 'neture',
      metadata: { settlementId, status: 'paid', targetUrl: '/supplier/settlements' },
    })));
  });

  it('a repeat payment without a changed approved row does not notify twice', async () => {
    query.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);
    expect(await service.paySettlement(settlementId)).toEqual({ success: true, data: row });
    expect(await service.paySettlement(settlementId)).toBeNull();
    expect(owners).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('missing supplier skips owner resolution without failing the changed payment', async () => {
    const missing = { id: settlementId };
    query.mockResolvedValue([missing]);
    expect(await service.paySettlement(settlementId)).toEqual({ success: true, data: missing });
    expect(owners).not.toHaveBeenCalled();
  });

  it('no owner produces no notification and still returns payment success', async () => {
    query.mockResolvedValue([row]);
    owners.mockResolvedValue([]);
    expect(await service.paySettlement(settlementId)).toEqual({ success: true, data: row });
    expect(notify).not.toHaveBeenCalled();
  });

  it('owner resolution failure is swallowed after the payment write', async () => {
    const error = new Error('Fixture owner failure');
    query.mockResolvedValue([row]);
    owners.mockRejectedValue(error);
    expect(await service.paySettlement(settlementId)).toEqual({ success: true, data: row });
    expect(logger.warn).toHaveBeenCalledWith('[Neture Settlement] Failed to send settlement-paid notification', error);
    expect(notify).not.toHaveBeenCalled();
  });

  it('notification failure is swallowed and preserves existing stop-on-first-failure order', async () => {
    const error = new Error('Fixture notification failure');
    query.mockResolvedValue([row]);
    notify.mockRejectedValueOnce(error);
    expect(await service.paySettlement(settlementId)).toEqual({ success: true, data: row });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].userId).toBe('fixture-owner-a');
    expect(logger.warn).toHaveBeenCalledWith('[Neture Settlement] Failed to send settlement-paid notification', error);
  });

  it('payment waits for its existing notification helper before resolving', async () => {
    let begin!: () => void;
    let finish!: () => void;
    const started = new Promise<void>((resolve) => { begin = resolve; });
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    query.mockResolvedValue([row]);
    owners.mockResolvedValue(['fixture-owner-a']);
    notify.mockImplementation(() => { begin(); return pending; });
    let resolved = false;
    const paying = service.paySettlement(settlementId).then((result) => { resolved = true; return result; });
    await started;
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    finish();
    expect(await paying).toEqual({ success: true, data: row });
  });
});
