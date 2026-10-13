import { beforeEach, describe, it, expect, vi } from 'vitest';
import { adminSettlementApi } from '../admin';
import { supplierApi } from '../supplier';

const transport = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));
vi.mock('../client', () => ({ api: transport }));
vi.mock('../../apiClient', () => ({ api: transport }));
beforeEach(() => { transport.post.mockReset(); transport.patch.mockReset(); });
describe('supplier write conflict transport', () => {
  it.each(['SETTLEMENT_ORDER_SUPPLIER_CONFLICT', 'DUPLICATE_SETTLEMENT'])('preserves recognized settlement conflict %s and its actionable message', async (error) => {
    transport.post.mockRejectedValue({ response: { status: 409, data: { error, message: 'Fixture review required' } } });
    expect(await adminSettlementApi.calculate('2026-01-01','2026-01-31')).toEqual({ success: false, error, message: 'Fixture review required' });
  });
  it('keeps successful calculation and unknown network failures distinct', async () => {
    transport.post.mockResolvedValueOnce({ data: { success: true, data: { created: 0 } } }).mockRejectedValueOnce(new Error('Fixture network failure'));
    expect(await adminSettlementApi.calculate('2026-01-01','2026-01-31')).toEqual({ success: true, data: { created: 0 } });
    expect(await adminSettlementApi.calculate('2026-01-01','2026-01-31')).toEqual({ success: false, error: 'NETWORK_ERROR' });
  });
  it('sends the inventory version and exposes the conflict code for reload handling', async () => {
    const data = { stock_quantity: 20, expected_version: 'a'.repeat(32) };
    transport.patch.mockRejectedValue({ response: { status: 409, data: { error: 'INVENTORY_CONFLICT' } } });
    expect(await supplierApi.updateInventory('fixture-offer',data)).toEqual({ success: false, error: 'INVENTORY_CONFLICT' });
    expect(transport.patch).toHaveBeenCalledWith('/neture/supplier/inventory/fixture-offer', data);
  });
});
