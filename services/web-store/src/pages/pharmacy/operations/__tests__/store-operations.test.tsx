import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { StoreAssetItem } from '@o4o/store-asset-policy-core';
import { loadHomeOverview } from '../homeOverview';
import { useStoreHomeOverview } from '../useStoreHomeOverview';
import { useStorePublishing } from '../useStorePublishing';

const api = vi.hoisted(() => ({ store: 'A', analytics: vi.fn(), scans: vi.fn(), assets: vi.fn(), products: vi.fn(), signals: vi.fn(), list: vi.fn(), update: vi.fn() }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: api.store }) }));
vi.mock('../../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../../../lib/serviceContext', () => ({ getActiveServiceKey: () => 'kpa-society' }));
vi.mock('../../../../api/storeAnalytics', () => ({ getMarketingAnalytics: api.analytics, getRecentScans: api.scans }));
vi.mock('../../../../api/storeExecutionAssets', () => ({ getStoreExecutionAssets: api.assets }));
vi.mock('../../../../api/pharmacyProducts', () => ({ getListings: api.products }));
vi.mock('../../../../api/client', () => ({ apiClient: { get: api.signals } }));
vi.mock('../../../../api/assetSnapshot', () => ({ storeAssetControlApi: { list: api.list, updatePublishStatus: api.update } }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const ok = <T,>(data: T) => ({ success: true, data });
const analytics = { activeQrCount: 0, weeklyScans: 0, topQrCodes: [] };
const signals = { newOrders: 0, pendingTabletRequests: 0, pendingSalesRequests: 0, surveyRequests: 0 };
function asset(id = 'one', patch: Partial<StoreAssetItem> = {}): StoreAssetItem {
  return { id, organizationId: 'A', title: `Fixture ${id}`, assetType: 'cms', sourceService: 'kpa-society', sourceAssetId: 'source',
    createdBy: 'fixture', createdAt: '2026-10-15T00:00:00Z', publishStatus: 'draft', controlId: null, controlUpdatedAt: null,
    channelMap: { home: true }, isForced: false, forcedByAdminId: null, forcedStartAt: null, forcedEndAt: null,
    isLocked: false, snapshotType: 'user_copy', lifecycleStatus: 'active', ...patch };
}
beforeEach(() => {
  vi.resetAllMocks(); api.store = 'A';
  api.analytics.mockResolvedValue(ok(analytics)); api.scans.mockResolvedValue(ok([]));
  api.assets.mockResolvedValue(ok({ total: 0, items: [] })); api.products.mockResolvedValue(ok([])); api.signals.mockResolvedValue(ok(signals));
  api.list.mockResolvedValue(ok({ items: [asset()], total: 1 }));
  api.update.mockImplementation(async (id: string, status: string) => ok({ snapshotId: id, publishStatus: status }));
});
afterEach(cleanup);
async function publishing() {
  const hook = renderHook(() => useStorePublishing());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}
it('confirmed zero overview values remain zeros and do not require a public slug', async () => {
  const result = await loadHomeOverview('A');
  expect(result.libraryCount).toBe(0); expect(result.productCount).toBe(0); expect(result.signals).toEqual(signals);
  expect(result.unavailable).toEqual([]); expect(api.signals).toHaveBeenCalledWith('/store-hub/live-signals');
});
it('independent failures retain available sources without inventing empty activity or zeros', async () => {
  api.scans.mockRejectedValue(Error('synthetic')); api.analytics.mockResolvedValue({ success: false, data: analytics });
  api.signals.mockResolvedValue({ success: false, data: signals });
  const result = await loadHomeOverview('A');
  expect(result.analytics).toBeNull(); expect(result.scans).toBeNull(); expect(result.signals).toBeNull();
  expect(result.libraryCount).toBe(0); expect(result.unavailable).toEqual(['홍보 성과', '최근 활동', '처리할 업무']);
});
it('foreign-store assets and malformed overview metrics fail closed', async () => {
  api.assets.mockResolvedValue(ok({ total: 1, items: [asset('foreign', { organizationId: 'B' })] }));
  api.analytics.mockResolvedValue(ok({ ...analytics, weeklyScans: -1 }));
  const result = await loadHomeOverview('A'); expect(result.libraryCount).toBeNull(); expect(result.analytics).toBeNull();
});
it('retry replaces prior successful overview data when that source now fails', async () => {
  const { result } = renderHook(() => useStoreHomeOverview());
  await waitFor(() => expect(result.current.loading).toBe(false));
  api.analytics.mockRejectedValue(Error('synthetic'));
  await act(() => result.current.reload());
  expect(result.current.analytics).toBeNull(); expect(result.current.unavailable).toContain('홍보 성과');
});
it('an earlier overview request cannot overwrite the latest refresh', async () => {
  const pending = deferred<ReturnType<typeof ok<typeof analytics>>>();
  api.analytics.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(ok({ ...analytics, activeQrCount: 7 }));
  const { result } = renderHook(() => useStoreHomeOverview());
  await act(() => result.current.reload());
  await act(async () => { pending.resolve(ok(analytics)); await pending.promise; });
  expect(result.current.analytics?.activeQrCount).toBe(7);
});
it('overview A → B → A never applies the initial A response', async () => {
  const pending = deferred<ReturnType<typeof ok<typeof analytics>>>();
  api.analytics.mockReturnValueOnce(pending.promise).mockResolvedValue(ok({ ...analytics, activeQrCount: 8 }));
  const { result, rerender } = renderHook(() => useStoreHomeOverview());
  api.store = 'B'; rerender(); api.store = 'A'; rerender();
  await waitFor(() => expect(result.current.analytics?.activeQrCount).toBe(8));
  await act(async () => { pending.resolve(ok(analytics)); await pending.promise; });
  expect(result.current.analytics?.activeQrCount).toBe(8);
});
it('no selected store never triggers overview or publishing API calls', async () => {
  api.store = ''; const home = renderHook(() => useStoreHomeOverview()), publish = renderHook(() => useStorePublishing());
  await act(async () => { await home.result.current.reload(); await publish.result.current.reload(); });
  expect(home.result.current.noStore).toBe(true); expect(api.analytics).not.toHaveBeenCalled(); expect(api.list).not.toHaveBeenCalled();
});
it('publishing failure cannot become an editable empty list and retry can recover', async () => {
  api.list.mockResolvedValueOnce({ success: false, data: { items: [asset()] } });
  const { result } = await publishing(); expect(result.current.error).toBeTruthy();
  await act(() => result.current.toggle('one')); expect(api.update).not.toHaveBeenCalled();
  await act(() => result.current.reload()); expect(result.current.items).toHaveLength(1); expect(result.current.error).toBeNull();
});
it('foreign-store publishing responses are rejected', async () => {
  api.list.mockResolvedValue(ok({ items: [asset('foreign', { organizationId: 'B' })], total: 1 }));
  const { result } = await publishing(); expect(result.current.error).toBeTruthy(); expect(result.current.items).toEqual([]);
});
it('refresh failure removes previously loaded editable state', async () => {
  const { result } = await publishing(); api.list.mockRejectedValueOnce(Error('synthetic'));
  await act(() => result.current.reload()); await act(() => result.current.changeStatus(['one'], 'published'));
  expect(result.current.items).toEqual([]); expect(api.update).not.toHaveBeenCalled();
});
it('publishing latest read wins over an older pending read', async () => {
  const pending = deferred<ReturnType<typeof ok<{ items: StoreAssetItem[]; total: number }>>>();
  api.list.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(ok({ items: [asset('new')], total: 1 }));
  const { result } = renderHook(() => useStorePublishing()); await act(() => result.current.reload());
  await act(async () => { pending.resolve(ok({ items: [asset('old')], total: 1 })); await pending.promise; });
  expect(result.current.items[0].id).toBe('new');
});
it('single and bulk writes share a synchronous lock, also blocking refresh during a write', async () => {
  const pending = deferred<ReturnType<typeof ok<{ snapshotId: string; publishStatus: string }>>>(); api.update.mockReturnValueOnce(pending.promise);
  const { result } = await publishing(); let operation!: Promise<void>;
  act(() => { operation = result.current.toggle('one'); void result.current.toggle('one'); void result.current.changeStatus(['one'], 'hidden'); void result.current.reload(); });
  expect(api.update).toHaveBeenCalledOnce(); expect(api.list).toHaveBeenCalledOnce();
  await act(async () => { pending.resolve(ok({ snapshotId: 'one', publishStatus: 'published' })); await operation; });
  expect(result.current.items[0].publishStatus).toBe('published'); expect(result.current.busy).toBe(false);
});
it('status cycling uses the latest confirmed record rather than an old row object', async () => {
  const { result } = await publishing();
  await act(() => result.current.toggle('one')); await act(() => result.current.toggle('one'));
  expect(api.update.mock.calls).toEqual([['one', 'published'], ['one', 'hidden']]);
});
it('bulk operations preserve forced/template policy and never accept unknown ids', async () => {
  api.list.mockResolvedValue(ok({ items: [asset(), asset('campaign', { snapshotType: 'campaign_push' }), asset('template', { snapshotType: 'template_seed' }), asset('forced', { isForced: true })], total: 4 }));
  const { result } = await publishing();
  await act(() => result.current.changeStatus(['one', 'campaign', 'template', 'forced', 'unknown'], 'published'));
  expect(api.update.mock.calls).toEqual([['one', 'published'], ['campaign', 'published']]);
  expect(result.current.items.find(row => row.id === 'template')?.publishStatus).toBe('draft');
  expect(result.current.actionError).toContain('정책 제한 3건');
});
it('partial failure updates only confirmed ids and retry uses failed ids with the captured target', async () => {
  api.list.mockResolvedValue(ok({ items: [asset(), asset('two')], total: 2 }));
  api.update.mockImplementationOnce(async () => ok({ snapshotId: 'one', publishStatus: 'published' })).mockRejectedValueOnce(Error('synthetic'));
  const { result } = await publishing(); await act(() => result.current.changeStatus(['one', 'two', 'one'], 'published'));
  expect(result.current.items.map(row => row.publishStatus)).toEqual(['published', 'draft']); expect(result.current.retryCount).toBe(1);
  await act(() => result.current.retryFailed());
  expect(api.update.mock.calls).toEqual([['one', 'published'], ['two', 'published'], ['two', 'published']]);
  expect(result.current.items.map(row => row.publishStatus)).toEqual(['published', 'published']); expect(result.current.retryCount).toBe(0);
});
it.each([
  { success: false, data: { snapshotId: 'one', publishStatus: 'published' } },
  ok({ snapshotId: 'other', publishStatus: 'published' }),
  ok({ snapshotId: 'one', publishStatus: 'hidden' }),
])('unconfirmed update result cannot claim a new status: %j', async response => {
  api.update.mockResolvedValue(response); const { result } = await publishing(); await act(() => result.current.toggle('one'));
  expect(result.current.items[0].publishStatus).toBe('draft'); expect(result.current.retryCount).toBe(1);
});
it('already-target rows cause no duplicate transport write', async () => {
  const { result } = await publishing(); await act(() => result.current.changeStatus(['one'], 'draft')); expect(api.update).not.toHaveBeenCalled();
});
it('active store change blocks stale callbacks before React rerenders', async () => {
  const { result } = await publishing(); api.store = 'B';
  await act(() => result.current.toggle('one')); await act(() => result.current.reload());
  expect(api.update).not.toHaveBeenCalled(); expect(api.list).toHaveBeenCalledOnce();
});
it('late write completion cannot publish into a changed store', async () => {
  const pending = deferred<ReturnType<typeof ok<{ snapshotId: string; publishStatus: string }>>>(); api.update.mockReturnValueOnce(pending.promise);
  const { result } = await publishing(); let operation!: Promise<void>;
  act(() => { operation = result.current.toggle('one'); }); api.store = 'B';
  await act(async () => { pending.resolve(ok({ snapshotId: 'one', publishStatus: 'published' })); await operation; });
  expect(result.current.items[0].publishStatus).toBe('draft'); expect(result.current.notice).toBeNull();
});
