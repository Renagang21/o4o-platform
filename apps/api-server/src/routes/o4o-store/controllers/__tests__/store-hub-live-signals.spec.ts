import { loadStoreLiveSignals } from '../store-hub-live-signals.js';

const organizationId = 'store-fixture-a';
const fixture = () => ({ query: jest.fn() });

it('keeps legacy numeric fields and confirms actual zero counts separately from unsupported sources', async () => {
  const db = fixture(); db.query.mockResolvedValue([{ count: 0 }]);
  const result = await loadStoreLiveSignals(db, organizationId);
  expect(result).toEqual({
    newOrders: 0, pendingTabletRequests: 0, pendingSalesRequests: 0, surveyRequests: 0,
    availability: { newOrders: 'available', pendingTabletRequests: 'available', pendingSalesRequests: 'not_supported', surveyRequests: 'not_supported' },
  });
  expect(db.query.mock.calls).toHaveLength(2);
  expect(db.query.mock.calls.every(([, params]) => JSON.stringify(params) === JSON.stringify([organizationId]))).toBe(true);
  expect(db.query.mock.calls[0][0]).toContain('"sellerOrganizationId" = $1');
  expect(db.query.mock.calls[0][0]).toContain("status = 'paid'");
  expect(db.query.mock.calls[1][0]).toContain("status = 'REQUESTED'");
});

it.each(['checkout_orders', 'tablet_interest_requests'])('preserves the other count when %s fails', async failedSource => {
  const db = fixture();
  db.query.mockImplementation(async (sql: string) => {
    if (sql.includes(failedSource)) throw new Error('synthetic unavailable source');
    return [{ count: 3 }];
  });
  const result = await loadStoreLiveSignals(db, organizationId);
  const failed = failedSource === 'checkout_orders' ? 'newOrders' : 'pendingTabletRequests';
  const available = failedSource === 'checkout_orders' ? 'pendingTabletRequests' : 'newOrders';
  expect(result.availability[failed]).toBe('unavailable');
  expect(result.availability[available]).toBe('available');
  expect(result[available]).toBe(3);
});

it('never reports confirmed empty work when no authorized store context was resolved', async () => {
  const db = fixture();
  const result = await loadStoreLiveSignals(db);
  expect(db.query).not.toHaveBeenCalled();
  expect(result.availability.newOrders).toBe('unavailable');
  expect(result.availability.pendingTabletRequests).toBe('unavailable');
});

it.each([[], undefined, [{ count: -1 }], [{ count: 0.5 }], [{ count: '0' }], [{ count: Number.POSITIVE_INFINITY }]])(
  'rejects malformed counts without losing another confirmed source: %j', async rows => {
    const db = fixture(); db.query.mockResolvedValueOnce(rows).mockResolvedValueOnce([{ count: 2 }]);
    const result = await loadStoreLiveSignals(db, organizationId);
    expect(result.availability.newOrders).toBe('unavailable');
    expect(result.pendingTabletRequests).toBe(2);
    expect(result.availability.pendingTabletRequests).toBe('available');
  },
);

it('concurrent store reads keep their own count and availability objects', async () => {
  const db = fixture();
  db.query.mockImplementation(async (_sql: string, params: string[]) => [{ count: params[0] === organizationId ? 2 : 5 }]);
  const [a, b] = await Promise.all([loadStoreLiveSignals(db, organizationId), loadStoreLiveSignals(db, 'store-fixture-b')]);
  expect(a.newOrders).toBe(2); expect(a.pendingTabletRequests).toBe(2);
  expect(b.newOrders).toBe(5); expect(b.pendingTabletRequests).toBe(5);
  expect(a.availability).not.toBe(b.availability);
});
