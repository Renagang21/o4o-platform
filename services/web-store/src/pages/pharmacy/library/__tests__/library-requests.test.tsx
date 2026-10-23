import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLibraryResources } from '../useLibraryResources';
import { useContentUsage } from '../useContentUsage';

const api = vi.hoisted(() => ({ store: 'A', assets: vi.fn(), snapshots: vi.fn(), removeAsset: vi.fn(), removeSnapshot: vi.fn(), usage: vi.fn() }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: api.store }) }));
vi.mock('../../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../../../lib/serviceContext', () => ({ getActiveServiceKey: () => 'kpa-society' }));
vi.mock('../../../../api/storeExecutionAssets', () => ({ getStoreExecutionAssets: api.assets, deleteStoreExecutionAsset: api.removeAsset }));
vi.mock('../../../../api/assetSnapshot', () => ({ assetSnapshotApi: { list: api.snapshots, remove: api.removeSnapshot }, storeLibraryApi: { getContentUsage: api.usage } }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const asset = (id = 'asset', organizationId = 'A') => ({ id, organizationId, title: `Fixture ${id}`, assetType: 'file', updatedAt: '2026-10-15T00:00:00Z' });
const snapshot = (id = 'snapshot') => ({ id, organizationId: 'A', title: `Fixture ${id}`, createdAt: '2026-10-15T00:00:00Z', contentJson: { body: '<p>Copied body</p>' } });
const page = (items: unknown[], total = items.length, limit = 50) => ({ success: true, data: { items, total, limit } });
beforeEach(() => {
  vi.resetAllMocks(); api.store = 'A';
  api.assets.mockResolvedValue(page([asset()])); api.snapshots.mockResolvedValue(page([snapshot()]));
  api.removeAsset.mockResolvedValue({ success: true });
  api.removeSnapshot.mockResolvedValue({ success: true, data: { id: 'snapshot', deleted: true } });
  api.usage.mockResolvedValue({ success: true, data: { usage: { qr: 2 } } });
});
afterEach(cleanup);
async function resources() {
  const hook = renderHook(() => useLibraryResources());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}
it('keeps two source identities distinct, including equal raw ids', async () => {
  api.snapshots.mockResolvedValue(page([snapshot('asset')]));
  const { result } = await resources();
  expect(result.current.items.map(row => row.id)).toEqual(['lib:asset', 'snap:asset']);
  expect(result.current.items[1].bodyText).toBe('Copied body');
  expect(result.current.errors).toEqual([]);
});
it('shows partial failure and retries only the failed source at its original page', async () => {
  api.snapshots.mockRejectedValueOnce(new Error('synthetic')).mockResolvedValueOnce(page([snapshot()]));
  const { result } = await resources();
  expect(result.current.items).toHaveLength(1); expect(result.current.errors).toHaveLength(1);
  await act(() => result.current.retryFailed());
  expect(result.current.items).toHaveLength(2); expect(result.current.errors).toEqual([]);
  expect(api.assets).toHaveBeenCalledOnce();
  expect(api.snapshots.mock.calls.map(call => call[0].page)).toEqual([1, 1]);
});
it('success=false and foreign-store results are failures rather than empty success', async () => {
  api.assets.mockResolvedValue(page([asset('foreign', 'B')]));
  api.snapshots.mockResolvedValue({ success: false, data: { items: [] } });
  const { result } = await resources();
  expect(result.current.items).toEqual([]); expect(result.current.errors).toHaveLength(2);
});
it('loads later batches without dropping earlier rows or duplicating repeated ids', async () => {
  api.assets.mockResolvedValueOnce(page([asset()], 100)).mockResolvedValueOnce(page([asset(), asset('second')], 100));
  const { result } = await resources();
  expect(result.current.hasMore).toBe(true);
  await act(() => result.current.loadMore());
  expect(api.assets.mock.calls.map(call => call[0].page)).toEqual([1, 2]);
  expect(api.snapshots).toHaveBeenCalledOnce();
  expect(result.current.items.map(row => row.id)).toEqual(['lib:asset', 'lib:second', 'snap:snapshot']);
  expect(result.current.hasMore).toBe(false);
});
it('latest reload wins against an earlier pending load', async () => {
  const old = deferred<ReturnType<typeof page>>(); api.assets.mockReturnValueOnce(old.promise).mockResolvedValueOnce(page([asset('new')]));
  const { result } = renderHook(() => useLibraryResources());
  await act(() => result.current.reload());
  await act(async () => { old.resolve(page([asset('old')])); await old.promise; });
  expect(result.current.items.some(row => row.rawId === 'new')).toBe(true);
  expect(result.current.items.some(row => row.rawId === 'old')).toBe(false);
});
it('revisits shifted offset pages after deleting from a source with unseen rows', async () => {
  api.assets.mockResolvedValueOnce(page([asset()], 100)).mockResolvedValueOnce(page([asset('shifted')], 99));
  const { result } = await resources();
  await act(() => result.current.remove(result.current.items.filter(row => row.kind === 'library')));
  await act(() => result.current.loadMore());
  expect(api.assets.mock.calls.map(call => call[0].page)).toEqual([1, 1]);
  expect(result.current.items.some(row => row.rawId === 'shifted')).toBe(true);
});
it('partial deletion removes only confirmed ids and leaves failed rows available for retry', async () => {
  api.removeAsset.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
  const { result } = await resources();
  let first: Awaited<ReturnType<typeof result.current.remove>>;
  await act(async () => { first = await result.current.remove(result.current.items); });
  expect(first!.removed).toEqual(new Set(['snap:snapshot'])); expect(first!.failed).toBe(1);
  expect(result.current.items.map(row => row.id)).toEqual(['lib:asset']);
  await act(() => result.current.remove(result.current.items));
  expect(result.current.items).toEqual([]);
});
it('an unconfirmed snapshot deletion retains the row', async () => {
  api.removeSnapshot.mockResolvedValue({ success: true, data: { id: 'other', deleted: true } });
  const { result } = await resources();
  await act(() => result.current.remove(result.current.items));
  expect(result.current.items.map(row => row.id)).toEqual(['snap:snapshot']);
});
it('synchronous duplicate delete and reload cannot race the pending write', async () => {
  const pending = deferred<{ success: boolean }>(); api.removeAsset.mockReturnValueOnce(pending.promise);
  const { result } = await resources();
  const rows = result.current.items.filter(row => row.kind === 'library');
  let operation!: Promise<unknown>;
  act(() => { operation = result.current.remove(rows); void result.current.remove(rows); void result.current.reload(); });
  expect(api.removeAsset).toHaveBeenCalledOnce(); expect(api.assets).toHaveBeenCalledOnce();
  await act(async () => { pending.resolve({ success: true }); await operation; });
  expect(result.current.deleting).toBe(false);
});
it('rejects stale action callbacks as soon as the active store changes, before rerender', async () => {
  const { result } = await resources(); api.store = 'B';
  await act(() => result.current.remove(result.current.items));
  await act(() => result.current.reload());
  expect(api.removeAsset).not.toHaveBeenCalled(); expect(api.assets).toHaveBeenCalledOnce();
});
it('late write completion does not publish into a changed store', async () => {
  const pending = deferred<{ success: boolean }>(); api.removeAsset.mockReturnValueOnce(pending.promise);
  const { result } = await resources(); let operation!: Promise<unknown>;
  act(() => { operation = result.current.remove(result.current.items); }); api.store = 'B';
  let value: unknown;
  await act(async () => { pending.resolve({ success: true }); value = await operation; });
  expect(value).toBeNull(); expect(result.current.items).toHaveLength(2);
});
it('never loads or mutates without an active store', async () => {
  api.store = ''; const { result } = renderHook(() => useLibraryResources());
  await act(() => result.current.reload());
  expect(api.assets).not.toHaveBeenCalled(); expect(api.snapshots).not.toHaveBeenCalled();
});
it('usage summary completes instead of cancelling itself on its pending state update', async () => {
  const { result, rerender } = renderHook(() => useContentUsage(['direct', 'direct']));
  await waitFor(() => expect(result.current.values.direct?.usage.qr).toBe(2));
  rerender(); expect(api.usage).toHaveBeenCalledOnce();
});
it('usage summary ignores old document responses after changing the target', async () => {
  const pending = deferred<{ success: boolean; data: { usage: { qr: number } } }>(); api.usage.mockReturnValueOnce(pending.promise);
  const { result, rerender } = renderHook(({ ids }) => useContentUsage(ids), { initialProps: { ids: ['old'] } });
  rerender({ ids: ['new'] }); await waitFor(() => expect(result.current.values.new?.usage.qr).toBe(2));
  await act(async () => { pending.resolve({ success: true, data: { usage: { qr: 99 } } }); await pending.promise; });
  expect(result.current.values.old).toBeUndefined();
});
it('failed usage remains optional and never blocks the library', async () => {
  api.usage.mockResolvedValue({ success: false, data: { usage: { qr: 99 } } });
  const { result } = renderHook(() => useContentUsage(['direct']));
  await waitFor(() => expect(result.current.values.direct).toBeNull());
});

it('snapshot display metadata rejects objects and unknown resource kinds without losing its copied body', async () => {
  api.snapshots.mockResolvedValue(page([{ ...snapshot(), contentJson: {
    body: '<p>Copied body</p>', summary: { unexpected: true }, description: 'Safe description',
    sourceUrl: { url: 'unexpected' }, sourceType: 'toString', category: ['unexpected'],
  } }]));
  const { result } = await resources();
  expect(result.current.items.find(row => row.kind === 'snapshot')).toMatchObject({
    id: 'snap:snapshot', rawId: 'snapshot', assetType: 'content', bodyText: 'Copied body',
    description: 'Safe description', href: null, category: null,
  });
});
