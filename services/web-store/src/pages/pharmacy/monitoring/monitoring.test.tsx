import { StrictMode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useConsultationRequests, validateRequests } from './useConsultationRequests';
import { useMarketingAnalytics, validateAnalytics } from './useMarketingAnalytics';

const api = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn(), analytics: vi.fn(), store: 'A' }));
vi.mock('../../../api/tabletStaff', () => ({ fetchStaffInterestRequests: api.list, updateInterestAction: api.update }));
vi.mock('../../../api/storeAnalytics', () => ({ getMarketingAnalytics: api.analytics }));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ status: 'ready', organizationId: api.store, effectiveServiceKey: 'kpa-society' }) }));
vi.mock('../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
const createdAt = '2026-10-15T00:00:00Z';
const row = (id: string, status: 'REQUESTED' | 'ACKNOWLEDGED' = 'REQUESTED') => ({ id, status, masterId: 'fixture', productName: `Fixture ${id}`, createdAt });
const analytics = () => ({ success: true, data: { totalScans: 0, todayScans: 0, weeklyScans: 0, activeQrCount: 0,
  deviceStats: { mobile: 0, tablet: 0, desktop: 0 }, topQrCodes: [], dailyScans: [] } });
function deferred<T>() {
  let resolve!: (data: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  api.store = 'A';
  api.list.mockReset().mockResolvedValue([row('one'), row('two')]);
  api.update.mockReset().mockImplementation(async (id, op) => ({ id, status: ({ acknowledge: 'ACKNOWLEDGED', complete: 'COMPLETED', cancel: 'CANCELLED' } as Record<string, string>)[op], updatedAt: createdAt }));
  api.analytics.mockReset().mockResolvedValue(analytics());
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function ready() {
  const hook = renderHook(() => useConsultationRequests('A'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

it('loads active rows, keeping polling separate from mutation state', async () => {
  const h = await ready();
  expect(h.result.current.rows.map(r => r.id)).toEqual(['one', 'two']);
  expect(h.result.current.error).toBeNull();
});
it('distinguishes an initial failure from a valid empty result and recovers', async () => {
  api.list.mockRejectedValueOnce(new Error('private diagnostic'));
  const h = await ready();
  expect(h.result.current.error).toContain('불러오지 못했습니다');
  expect(h.result.current.error).not.toContain('private');
  api.list.mockResolvedValue([]);
  await act(() => h.result.current.refresh());
  expect(h.result.current.error).toBeNull();
  expect(h.result.current.rows).toEqual([]);
});
it('retains clearly stale rows but blocks writes after a background read failure', async () => {
  const h = await ready();
  api.list.mockRejectedValueOnce(new Error('offline'));
  await act(() => h.result.current.refresh());
  await act(() => h.result.current.run(['one'], 'complete'));
  expect(h.result.current.rows).toHaveLength(2);
  expect(api.update).not.toHaveBeenCalled();
});
it('serializes polling so a slow read cannot create overlapping requests', async () => {
  vi.useFakeTimers();
  const pending = deferred<ReturnType<typeof row>[]>(); api.list.mockReturnValue(pending.promise);
  const h = renderHook(() => useConsultationRequests('A'));
  await act(async () => { vi.advanceTimersByTime(20_000); });
  expect(api.list).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve([]); });
  await act(async () => { vi.advanceTimersByTime(5000); });
  expect(api.list).toHaveBeenCalledTimes(2);
  h.unmount();
  await act(async () => { vi.advanceTimersByTime(20_000); });
  expect(api.list).toHaveBeenCalledTimes(2);
});
it('can initialize again after StrictMode effect cleanup', async () => {
  const h = renderHook(() => useConsultationRequests('A'), { wrapper: StrictMode });
  await waitFor(() => expect(h.result.current.loading).toBe(false));
  expect(h.result.current.rows).toHaveLength(2);
});
it('rejects malformed lists instead of claiming there are no requests', async () => {
  api.list.mockResolvedValue({ items: [] });
  const h = await ready();
  expect(h.result.current.error).toBeTruthy();
});
it.each([
  [row('one'), row('one')], [{ ...row('one'), status: 'COMPLETED' }],
  [{ ...row('one'), createdAt: 'invalid' }], [{ ...row('one'), acknowledgedAt: 'invalid' }],
  [{ ...row('one'), customerNote: {} }], [{ ...row('one'), productName: null }],
].map(value => ({ value })))('rejects unsafe consultation row shape %#', ({ value }) => {
  expect(() => validateRequests(value)).toThrow();
});
it('applies only confirmed successes and preserves failed selection', async () => {
  const h = await ready();
  act(() => h.result.current.setSelectedKeys(['one', 'two']));
  api.update.mockImplementation(async (id, op) => {
    if (id === 'two') throw new Error('private');
    return { id, status: op === 'complete' ? 'COMPLETED' : 'ACKNOWLEDGED', updatedAt: createdAt };
  });
  api.list.mockResolvedValue([row('two')]);
  await act(() => h.result.current.run(['one', 'two'], 'complete'));
  expect(h.result.current.selectedKeys).toEqual(['two']);
  expect(h.result.current.result).toMatchObject({ successCount: 1, failedCount: 1 });
  expect(h.result.current.rows.map(r => r.id)).toEqual(['two']);
  expect(JSON.stringify(h.result.current.result)).not.toContain('private');
});
it('retries only failed items and refreshes list and selection after retry', async () => {
  const h = await ready();
  act(() => h.result.current.setSelectedKeys(['one', 'two']));
  api.update.mockRejectedValueOnce(new Error('offline'));
  api.list.mockResolvedValue([row('one')]);
  await act(() => h.result.current.run(['one', 'two'], 'complete'));
  api.list.mockResolvedValue([]);
  act(() => h.result.current.retryFailed());
  await waitFor(() => expect(h.result.current.busy).toBe(false));
  expect(api.update.mock.calls.map(call => call[0])).toEqual(['one', 'two', 'one']);
  expect(h.result.current.rows).toEqual([]);
  expect(h.result.current.selectedKeys).toEqual([]);
  expect(h.result.current.result).toMatchObject({ successCount: 1, failedCount: 0 });
});
it('does not retry successful mutations when their follow-up read fails', async () => {
  const h = await ready(); api.list.mockRejectedValue(new Error('offline'));
  await act(() => h.result.current.run(['one'], 'complete'));
  expect(h.result.current.rows.map(r => r.id)).toEqual(['two']);
  expect(h.result.current.result?.successCount).toBe(1);
  act(() => h.result.current.retryFailed());
  expect(api.update).toHaveBeenCalledTimes(1);
  expect(h.result.current.error).toBeTruthy();
});
it('uses a synchronous lock for double clicks and the canonical refresh', async () => {
  const h = await ready(); const pending = deferred<unknown>();
  api.update.mockReturnValue(pending.promise);
  let mutation!: Promise<void>;
  act(() => { mutation = h.result.current.run(['one'], 'complete'); void h.result.current.run(['one'], 'complete'); });
  expect(api.update).toHaveBeenCalledTimes(1);
  const refresh = deferred<ReturnType<typeof row>[]>(); api.list.mockReturnValue(refresh.promise);
  await act(async () => { pending.resolve({ id: 'one', status: 'COMPLETED', updatedAt: createdAt }); });
  await act(() => h.result.current.run(['two'], 'complete'));
  expect(api.update).toHaveBeenCalledTimes(1);
  await act(async () => { refresh.resolve([row('two')]); await mutation; });
  expect(h.result.current.busy).toBe(false);
});
it('an old poll cannot restore a completed request', async () => {
  const h = await ready(); const poll = deferred<ReturnType<typeof row>[]>();
  api.list.mockReturnValueOnce(poll.promise).mockResolvedValueOnce([row('two')]);
  let oldRead!: Promise<void>;
  act(() => { oldRead = h.result.current.refresh(); });
  await act(() => h.result.current.run(['one'], 'complete'));
  await act(async () => { poll.resolve([row('one'), row('two')]); await oldRead; });
  expect(h.result.current.rows.map(r => r.id)).toEqual(['two']);
});
it.each([
  { id: 'other', status: 'COMPLETED', updatedAt: createdAt },
  { id: 'one', status: 'REQUESTED', updatedAt: createdAt },
  { id: 'one', status: 'COMPLETED', updatedAt: 'invalid' },
  undefined,
])('does not report an unconfirmed transition as success %#', async response => {
  const h = await ready(); api.update.mockResolvedValue(response);
  await act(() => h.result.current.run(['one'], 'complete'));
  expect(h.result.current.result).toMatchObject({ successCount: 0, failedCount: 1 });
});
it('skips missing or already acknowledged rows and deduplicates input', async () => {
  api.list.mockResolvedValue([row('one', 'ACKNOWLEDGED')]); const h = await ready();
  await act(() => h.result.current.run(['one', 'gone', 'one'], 'acknowledge'));
  expect(api.update).not.toHaveBeenCalled();
  expect(h.result.current.result?.skippedCount).toBe(2);
});
it('honors cancellation before a batch and leaves selection alone', async () => {
  const h = await ready(); vi.spyOn(window, 'confirm').mockReturnValue(false);
  act(() => h.result.current.setSelectedKeys(['one']));
  await act(() => h.result.current.run(['one'], 'cancel', 'Confirm fixture?'));
  expect(api.update).not.toHaveBeenCalled();
  expect(h.result.current.selectedKeys).toEqual(['one']);
});
it('prunes selection when polling removes a request', async () => {
  const h = await ready(); act(() => h.result.current.setSelectedKeys(['one', 'two']));
  api.list.mockResolvedValue([row('two')]); await act(() => h.result.current.refresh());
  expect(h.result.current.selectedKeys).toEqual(['two']);
});
it('does not send a stale action to another store', async () => {
  const h = await ready(); api.store = 'B';
  await act(() => h.result.current.run(['one'], 'complete'));
  expect(api.update).not.toHaveBeenCalled();
});
it('does not refresh another store after an in-flight mutation completes', async () => {
  const h = await ready(); const pending = deferred<unknown>(); api.update.mockReturnValue(pending.promise);
  let mutation!: Promise<void>; act(() => { mutation = h.result.current.run(['one'], 'complete'); });
  api.store = 'B'; h.unmount();
  await act(async () => { pending.resolve({ id: 'one', status: 'COMPLETED', updatedAt: createdAt }); await mutation; });
  expect(api.list).toHaveBeenCalledTimes(1);
});
it('does not apply an old store read after unmount', async () => {
  const pending = deferred<ReturnType<typeof row>[]>(); api.list.mockReturnValue(pending.promise);
  const h = renderHook(() => useConsultationRequests('A')); h.unmount(); api.store = 'B';
  await act(async () => { pending.resolve([row('one')]); });
  expect(h.result.current.rows).toEqual([]);
});
it('accepts genuine zero analytics without converting it into a failure', () => {
  expect(validateAnalytics(analytics()).data.totalScans).toBe(0);
});
it.each(['negative', 'nonfinite', 'missing-devices', 'bad-day', 'bad-qr', 'unsuccessful'])('rejects malformed analytics: %s', kind => {
  const value = analytics() as any;
  if (kind === 'negative') value.data.totalScans = -1;
  if (kind === 'nonfinite') value.data.todayScans = Infinity;
  if (kind === 'missing-devices') value.data.deviceStats = null;
  if (kind === 'bad-day') value.data.dailyScans = [{ date: 'invalid', count: 1 }];
  if (kind === 'bad-qr') value.data.topQrCodes = [{ id: 'q', title: {}, slug: 'q', scanCount: 1 }];
  if (kind === 'unsuccessful') value.success = false;
  expect(() => validateAnalytics(value)).toThrow();
});
it('exposes safe recovery after analytics refresh fails', async () => {
  const h = renderHook(() => useMarketingAnalytics('A'));
  await act(async () => { await h.result.current.fetchAnalytics(); });
  api.analytics.mockRejectedValueOnce(new Error('private diagnostic'));
  await act(async () => { await expect(h.result.current.fetchAnalytics()).rejects.toThrow(); });
  expect(h.result.current.error).toContain('불러오지 못했습니다');
  expect(h.result.current.error).not.toContain('private');
  await act(async () => { await h.result.current.fetchAnalytics(); });
  expect(h.result.current.error).toBeNull();
});
it('ignores an older analytics failure while a newer successful result is active', async () => {
  const old = deferred<ReturnType<typeof analytics>>(); api.analytics.mockReturnValueOnce(old.promise);
  const h = renderHook(() => useMarketingAnalytics('A'));
  let oldRead!: Promise<unknown>; act(() => { oldRead = h.result.current.fetchAnalytics().catch(() => null); });
  await act(async () => { await h.result.current.fetchAnalytics(); });
  await act(async () => { old.reject(new Error('offline')); await oldRead; });
  expect(h.result.current.error).toBeNull(); expect(h.result.current.loading).toBe(false);
});
it('rejects an analytics response after switching stores', async () => {
  const pending = deferred<ReturnType<typeof analytics>>(); api.analytics.mockReturnValue(pending.promise);
  const h = renderHook(() => useMarketingAnalytics('A'));
  let read!: Promise<unknown>; act(() => { read = h.result.current.fetchAnalytics().catch(() => null); });
  api.store = 'B'; h.unmount();
  await act(async () => { pending.resolve(analytics()); expect(await read).toBeNull(); });
});
