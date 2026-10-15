import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import StoreLocalProductsPage from '../StoreLocalProductsPage';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AddO4oStandardProductModal } from '../AddO4oStandardProductModal';
import { useStandardProductSelection } from './useStandardProductSelection';
import { latestRead, createLocalProductAdapter } from './localProductAdapter';
import StoreContentImportModal from '../../../components/store/StoreContentImportModal';
import { useContentImport } from '../../../components/store/useContentImport';

const api = vi.hoisted(() => ({ store: 'A', serviceKey: 'kpa-society' as string | null, search: vi.fn(), register: vi.fn(), products: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), contents: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../../../api/o4oStandardProducts', () => ({ searchO4oStandardProducts: api.search, registerStandardProductToStore: api.register, buildProductVariantLabel: () => '' }));
vi.mock('../../../api/multilingualProductContentStore', () => ({ getMlcSummaryMap: async () => new Map() }));
vi.mock('../../../components/common/MediaPickerModal', () => ({ default: () => null }));
vi.mock('../../../api/localProducts', () => ({ fetchLocalProducts: api.products, createLocalProduct: api.create, updateLocalProduct: api.update, deleteLocalProduct: api.remove }));
vi.mock('../../../api/assetSnapshot', () => ({ storeLibraryApi: { listContents: api.contents } }));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ status: 'ready', organizationId: api.store, effectiveServiceKey: api.serviceKey }) }));
vi.mock('../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('@o4o/error-handling', () => ({ toast: { success: api.success, info: api.info } }));
const product = { id: 'master', name: 'Fixture product' };
const searchResult = (id = 'master', total = 1) => ({ items: [{ ...product, id }], meta: { total } });
const contentResult = (id = 'content', total = 1) => ({ success: true, data: { items: [{ id, title: 'Fixture content', contentJson: { html: '<p>Fixture body</p>' } }], total } });
const registered = vi.fn();
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(300); });
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); api.store = 'A'; api.serviceKey = 'kpa-society';
  api.search.mockReset().mockResolvedValue(searchResult()); api.register.mockReset().mockResolvedValue({ success: true });
  api.products.mockReset().mockResolvedValue({ items: [{ id: 'local', name: 'Fixture local' }], total: 1 });
  api.create.mockReset().mockResolvedValue({ id: 'local', name: 'Fixture local' }); api.update.mockReset().mockResolvedValue({ id: 'local', name: 'Fixture local' });
  api.remove.mockReset().mockResolvedValue(undefined); api.contents.mockReset().mockResolvedValue(contentResult());
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('debounces input and invalidates earlier results immediately', async () => {
  const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  expect(h.result.current.items).toHaveLength(1);
  act(() => h.result.current.setSearchInput('next'));
  expect(h.result.current.items).toEqual([]); expect(h.result.current.loading).toBe(true);
  await tick(); expect(api.search.mock.calls.slice(-1)[0]?.[0].q).toBe('next');
});
it('keeps results ready when the already active filter or query is selected', async () => {
  const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  act(() => { h.result.current.setClassification(''); h.result.current.setSearchInput(''); });
  expect(h.result.current.loading).toBe(false); expect(h.result.current.items).toHaveLength(1);
});
it('ignores an old search completion after input has changed', async () => {
  const old = deferred<ReturnType<typeof searchResult>>(); api.search.mockReturnValueOnce(old.promise);
  const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  act(() => h.result.current.setSearchInput('new')); await tick();
  await act(async () => { old.resolve(searchResult('old')); }); expect(h.result.current.items[0].id).toBe('master');
});
it('resets pagination with a classification change', async () => {
  api.search.mockResolvedValue(searchResult('master', 41)); const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  act(() => h.result.current.setPage(2)); await tick(); act(() => h.result.current.setClassification('cosmetic')); await tick();
  expect(api.search.mock.calls.slice(-1)[0]?.[0]).toMatchObject({ page: 1, classification: 'cosmetic' });
});
it('recovers from search failure without presenting a normal empty result', async () => {
  api.search.mockRejectedValueOnce(new Error('private diagnostic')); const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  expect(h.result.current.error).toContain('불러오지 못했습니다'); expect(h.result.current.error).not.toContain('private');
  act(() => h.result.current.retry()); await tick(); expect(h.result.current.error).toBeNull();
});
it.each([{ items: null, meta: { total: 1 } }, { items: [{ id: 'bad', name: {} }], meta: { total: 1 } }, { items: [], meta: { total: -1 } }])('rejects malformed search results %#', async reply => {
  api.search.mockResolvedValue(reply); const h = renderHook(() => useStandardProductSelection('A', registered)); await tick(); expect(h.result.current.error).toBeTruthy();
});
it('clamps pagination when a previous last page no longer exists', async () => {
  api.search.mockResolvedValue(searchResult('master', 21)); const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  api.search.mockResolvedValue(searchResult()); act(() => h.result.current.setPage(2)); await tick(); await tick();
  expect(h.result.current.page).toBe(1); expect(h.result.current.items).toHaveLength(1);
});
it('serializes registrations, blocks input changes and records only confirmed success', async () => {
  const pending = deferred<{ success: boolean }>(); api.register.mockReturnValue(pending.promise);
  const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  let write!: Promise<void>;
  act(() => { write = h.result.current.handleRegister(product as any); void h.result.current.handleRegister(product as any); h.result.current.setSearchInput('changed'); });
  expect(api.register).toHaveBeenCalledTimes(1); expect(h.result.current.searchInput).toBe('');
  await act(async () => { pending.resolve({ success: true }); await write; });
  expect(h.result.current.registeredIds.has('master')).toBe(true); expect(registered).toHaveBeenCalledTimes(1);
  await act(() => h.result.current.handleRegister(product as any)); expect(api.register).toHaveBeenCalledTimes(1);
});
it('keeps failed registration retryable and does not mark success false as registered', async () => {
  api.register.mockResolvedValueOnce({ success: false }); const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  await act(() => h.result.current.handleRegister(product as any)); expect(h.result.current.registeredIds.size).toBe(0); expect(registered).not.toHaveBeenCalled();
  expect(h.result.current.actionError).toBeTruthy(); await act(() => h.result.current.handleRegister(product as any)); expect(registered).toHaveBeenCalledTimes(1);
});
it('does not register a stale search row', async () => {
  const h = renderHook(() => useStandardProductSelection('A', registered)); await tick(); act(() => h.result.current.setSearchInput('next'));
  await act(() => h.result.current.handleRegister(product as any)); expect(api.register).not.toHaveBeenCalled();
});
it('ignores a closed store session registration completion and does not notify another store', async () => {
  const pending = deferred<{ success: boolean }>(); api.register.mockReturnValue(pending.promise);
  const h = renderHook(() => useStandardProductSelection('A', registered)); await tick();
  let write!: Promise<void>; act(() => { write = h.result.current.handleRegister(product as any); }); h.unmount(); api.store = 'B';
  await act(async () => { pending.resolve({ success: true }); await write; }); expect(registered).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
});
it('cancels debounce timers on unmount and works under StrictMode', async () => {
  const h = renderHook(() => useStandardProductSelection('A', registered), { wrapper: StrictMode }); await tick(); expect(api.search).toHaveBeenCalledTimes(1);
  act(() => h.result.current.setSearchInput('next')); h.unmount(); await tick(); expect(api.search).toHaveBeenCalledTimes(1);
});
it.each(['success', 'failure'])('a stale local list %s follows the newest result', async kind => {
  const old = deferred<string>(), fresh = deferred<string>(); const fetcher = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const read = latestRead(fetcher); const first = read(1), second = read(2); fresh.resolve('new');
  if (kind === 'success') old.resolve('old'); else old.reject(new Error('old error'));
  expect(await first).toBe('new'); expect(await second).toBe('new');
});
it('older local list callers also receive the newest error instead of stale success', async () => {
  const old = deferred<string>(), fresh = deferred<string>(); const fetcher = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const read = latestRead(fetcher); const first = read(1).catch(e => e.message), second = read(2).catch(e => e.message);
  fresh.reject(new Error('new error')); old.resolve('old'); expect(await first).toBe('new error'); expect(await second).toBe('new error');
});
it('serializes direct-product mutations and releases the lock after failure', async () => {
  const pending = deferred<any>(); api.create.mockReturnValueOnce(pending.promise); const busy = vi.fn(); const adapter = createLocalProductAdapter(() => true, busy);
  const first = adapter.createLocalProduct({ name: 'Fixture' }).catch(() => null);
  await expect(adapter.deleteLocalProduct('local')).rejects.toThrow('진행 중'); expect(api.remove).not.toHaveBeenCalled();
  pending.reject(new Error('private')); await first; expect(busy.mock.calls.map(c => c[0])).toEqual([true, false]);
  await adapter.createLocalProduct({ name: 'Fixture' }); expect(api.create).toHaveBeenCalledTimes(2);
});
it('validates the saved product identity without exposing raw exceptions', async () => {
  api.update.mockResolvedValue({ id: 'other', name: 'Fixture' }); const adapter = createLocalProductAdapter(() => true, vi.fn());
  await expect(adapter.updateLocalProduct('local', { name: 'Fixture' })).rejects.toThrow('확인하지 못했습니다');
  api.create.mockRejectedValue(new Error('private diagnostic')); await expect(adapter.createLocalProduct({ name: 'Fixture' })).rejects.not.toThrow('private');
});
it('does not send reads or writes from an inactive store', async () => {
  const adapter = createLocalProductAdapter(() => false, vi.fn());
  await expect(adapter.createLocalProduct({ name: 'Fixture' })).rejects.toThrow(); await expect(adapter.fetchLocalProducts({})).rejects.toThrow();
  expect(api.create).not.toHaveBeenCalled(); expect(api.products).not.toHaveBeenCalled();
});
it('refuses a mutation result after its store owner becomes inactive', async () => {
  let active = true; const pending = deferred<any>(); api.update.mockReturnValue(pending.promise); const adapter = createLocalProductAdapter(() => active, vi.fn());
  const write = adapter.updateLocalProduct('local', { name: 'Fixture' }).catch(() => null); active = false; pending.resolve({ id: 'local', name: 'Fixture' }); expect(await write).toBeNull();
});
it('distinguishes unsuccessful content feed replies from empty content and retries', async () => {
  api.contents.mockResolvedValueOnce({ success: false }); const h = renderHook(() => useContentImport('A')); await tick(); expect(h.result.current.error).toBeTruthy();
  act(() => h.result.current.reload()); await tick(); expect(h.result.current.error).toBeNull(); expect(h.result.current.items).toHaveLength(1);
});
it('clears the selected content immediately when searching and ignores old results', async () => {
  const h = renderHook(() => useContentImport('A')); await tick(); act(() => h.result.current.setSelectedId('content')); expect(h.result.current.selected?.id).toBe('content');
  const old = deferred<ReturnType<typeof contentResult>>(); api.contents.mockReturnValueOnce(old.promise);
  act(() => h.result.current.setSearch('old')); await tick(); act(() => h.result.current.setSearch('new')); await tick();
  expect(h.result.current.selected).toBeNull(); await act(async () => { old.resolve(contentResult('old')); }); expect(h.result.current.items[0].id).toBe('content');
});
it('always requests only own-store content and resets pagination on search', async () => {
  api.contents.mockResolvedValue(contentResult('content', 25)); const h = renderHook(() => useContentImport('A')); await tick();
  act(() => h.result.current.setPage(2)); await tick(); act(() => h.result.current.setSearch('fixture')); await tick();
  expect(api.contents.mock.calls.slice(-1)[0]?.[0]).toMatchObject({ source: 'mine', page: 1, search: 'fixture', limit: 12 });
});
it('does not apply old content after a store switch or close', async () => {
  const pending = deferred<ReturnType<typeof contentResult>>(); api.contents.mockReturnValue(pending.promise); const h = renderHook(() => useContentImport('A')); await tick();
  h.unmount(); api.store = 'B'; await act(async () => { pending.resolve(contentResult('old')); }); expect(h.result.current.items).toEqual([]);
});
it('rejects malformed content feed instead of rendering or selecting it', async () => {
  api.contents.mockResolvedValue({ success: true, data: { items: [{}], total: 1 } }); const h = renderHook(() => useContentImport('A')); await tick(); expect(h.result.current.error).toBeTruthy(); expect(h.result.current.selected).toBeNull();
});

it('keeps the content list available after selecting an empty body so another item can be imported', async () => {
  const onImport = vi.fn();
  api.contents.mockResolvedValue({ success: true, data: { total: 2, items: [
    { id: 'empty', title: 'Fixture empty', contentJson: { html: '' } },
    { id: 'usable', title: 'Fixture usable', contentJson: { html: '<p>Fixture body</p>' } },
  ] } });
  render(<StoreContentImportModal open onClose={vi.fn()} onImport={onImport} />);
  await tick();
  fireEvent.click(screen.getByRole('button', { name: 'Fixture empty' }));
  fireEvent.click(screen.getByRole('button', { name: '본문 가져오기' }));
  expect(screen.getByRole('alert').textContent).toContain('다른 콘텐츠를 선택');
  expect(onImport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Fixture usable' }));
  fireEvent.click(screen.getByRole('button', { name: '본문 가져오기' }));
  expect(onImport).toHaveBeenCalledWith('<p>Fixture body</p>', 'Fixture usable');
  expect(api.contents).toHaveBeenCalledOnce();
});

it('opens standard selection and content import for a ready store with no service enrollment', async () => {
  api.serviceKey = null;
  const view = render(<AddO4oStandardProductModal open onClose={vi.fn()} onRegistered={registered} />);
  await tick();
  expect(screen.getByText('Fixture product')).toBeTruthy();
  view.unmount();
  render(<StoreContentImportModal open onClose={vi.fn()} onImport={vi.fn()} />);
  await tick();
  expect(screen.getByRole('button', { name: 'Fixture content' })).toBeTruthy();
});

it('loads the direct product manager for a ready store without service enrollment', async () => {
  api.serviceKey = null;
  render(<MemoryRouter><StoreLocalProductsPage /></MemoryRouter>);
  await tick();
  expect(screen.getByText('Fixture local')).toBeTruthy();
  expect(api.products).toHaveBeenCalledOnce();
});
