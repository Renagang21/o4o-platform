import type { DataSource } from 'typeorm';
import { SupplierUnifiedOrderService } from '../supplier-unified-order.service.js';

describe('supplier unified order failure contract', () => {
  const query = jest.fn();
  const service = new SupplierUnifiedOrderService({ query } as unknown as DataSource);
  beforeEach(() => query.mockReset());

  it.each(['neture', 'checkout', 'all'] as const)('propagates %s query failures instead of reporting no orders', async (source) => {
    const failure = new Error('fixture query unavailable');
    query.mockRejectedValueOnce(failure);
    await expect(service.listUnifiedOrders('fixture', { page: 1, limit: 20, source })).rejects.toBe(failure);
  });

  it.each([
    { page: 0, limit: 20 }, { page: 1.5, limit: 20 }, { page: 1, limit: 0 },
    { page: 1, limit: 101 }, { page: Infinity, limit: 20 },
    { page: Number.MAX_SAFE_INTEGER, limit: 100 },
  ])('rejects invalid internal pagination %j before querying', async (params) => {
    await expect(service.listUnifiedOrders('fixture', params)).rejects.toThrow('INVALID_UNIFIED_ORDER_PAGINATION');
    expect(query).not.toHaveBeenCalled();
  });

  it('does not turn a missing page detail into a successful partial response', async () => {
    query.mockResolvedValueOnce([{ total: '1', source: 'neture_order', detail: null }]);
    await expect(service.listUnifiedOrders('fixture', { page: 1, limit: 20 })).rejects.toThrow('UNIFIED_ORDER_DETAIL_MISSING');
  });
});
