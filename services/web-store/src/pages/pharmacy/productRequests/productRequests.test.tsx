import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useProductRequestForm } from './useProductRequestForm';
import { ProductRequestDialog } from './requestSession';
import { useProductRequestList, validateRequestList } from './useProductRequestList';
import { StoreNewProductRequestModal } from '../StoreNewProductRequestModal';
import { StoreProductRequestsListModal } from '../StoreProductRequestsListModal';
import type { StoreProductRequest } from '../../../api/storeProductRequests';

const api = vi.hoisted(() => ({ store: 'A', search: vi.fn(), register: vi.fn(), submit: vi.fn(), resubmit: vi.fn(), list: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../../../api/o4oStandardProducts', () => ({ searchO4oStandardProducts: api.search, registerStandardProductToStore: api.register }));
vi.mock('../../../api/storeProductRequests', () => ({ submitProductRequest: api.submit, resubmitProductRequest: api.resubmit, listProductRequests: api.list }));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ status: 'ready', organizationId: api.store, effectiveServiceKey: 'kpa-society' }) }));
vi.mock('../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('@o4o/error-handling', () => ({ toast: { success: api.success, info: api.info } }));
vi.mock('../../../components/common/MediaPickerModal', () => ({ default: () => null }));
const submitted = vi.fn(), closed = vi.fn();
const product = { id: 'master', name: 'Fixture product', manufacturerName: null, classification: null };
function request(id = 'request', status: StoreProductRequest['displayStatus'] = 'reviewing'): StoreProductRequest {
  return { id, productName: 'Fixture request', classification: { code: 'general', label: '일반·기타' }, barcode: null,
    noBarcode: true, manufacturer: null, spec: null, unit: null, imageUrl: null, displayStatus: status,
    displayStatusLabel: status, reviewNote: null, matchedProductMasterId: null, createdAt: '2026-10-15T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z', editable: status === 'revision_requested' };
}
const list = (page = 1, total = 1, items = [request()]) => ({ items, meta: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } });
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const useForm = (editRequest?: StoreProductRequest) => useProductRequestForm({ organizationId: api.store, editRequest, onSubmitted: submitted, onClose: closed });
function fill(h: ReturnType<typeof renderHook<ReturnType<typeof useForm>, unknown>>) {
  act(() => { h.result.current.goToForm(); h.result.current.patch({ productName: ' Fixture draft ', classification: 'general', noBarcode: true, manufacturer: ' Fixture maker ' }); });
}
beforeEach(() => {
  api.store = 'A'; vi.clearAllMocks();
  api.search.mockReset().mockResolvedValue({ items: [product] });
  api.register.mockReset().mockResolvedValue({ success: true });
  api.submit.mockReset().mockResolvedValue(request()); api.resubmit.mockReset().mockResolvedValue(request());
  api.list.mockReset().mockResolvedValue(list());
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('does not turn search failure into an empty successful result and can retry', async () => {
  const h = renderHook(() => useForm()); act(() => h.result.current.setSearchInput('fixture'));
  api.search.mockRejectedValueOnce(new Error('private diagnostic'));
  await act(() => h.result.current.runSearch());
  expect(h.result.current.searchError).toContain('검색에 실패');
  expect(h.result.current.searchError).not.toContain('private');
  api.search.mockResolvedValue({ items: [] }); await act(() => h.result.current.runSearch());
  expect(h.result.current.searchError).toBeNull(); expect(h.result.current.searched).toBe(true);
});
it('invalidates search results as soon as the query is edited', async () => {
  const old = deferred<{ items: typeof product[] }>(); api.search.mockReturnValueOnce(old.promise);
  const h = renderHook(() => useForm()); act(() => h.result.current.setSearchInput('old'));
  let read!: Promise<void>; act(() => { read = h.result.current.runSearch(); });
  act(() => h.result.current.setSearchInput('new'));
  await act(async () => { old.resolve({ items: [product] }); await read; });
  expect(h.result.current.searchResults).toEqual([]); expect(h.result.current.searched).toBe(false);
  expect(h.result.current.searchLoading).toBe(false);
});
it('lets the latest search win even when earlier results finish later', async () => {
  const old = deferred<{ items: typeof product[] }>(); api.search.mockReturnValueOnce(old.promise);
  const h = renderHook(() => useForm()); act(() => h.result.current.setSearchInput('old'));
  let read!: Promise<void>; act(() => { read = h.result.current.runSearch(); });
  act(() => h.result.current.setSearchInput('new'));
  api.search.mockResolvedValue({ items: [{ ...product, id: 'new' }] }); await act(() => h.result.current.runSearch());
  await act(async () => { old.resolve({ items: [product] }); await read; });
  expect(h.result.current.searchResults[0].id).toBe('new');
});
it('does not let search completion replace the form after moving to the next step', async () => {
  const pending = deferred<{ items: typeof product[] }>(); api.search.mockReturnValue(pending.promise);
  const h = renderHook(() => useForm()); act(() => h.result.current.setSearchInput('fixture'));
  let read!: Promise<void>; act(() => { read = h.result.current.runSearch(); h.result.current.goToForm(); });
  await act(async () => { pending.resolve({ items: [product] }); await read; });
  expect(h.result.current.step).toBe('form'); expect(h.result.current.searchResults).toEqual([]);
});
it('prefills a numeric query as barcode without replacing an existing product name', () => {
  const h = renderHook(() => useForm()); act(() => h.result.current.patch({ productName: 'draft' }));
  act(() => h.result.current.setSearchInput('12345678')); act(() => h.result.current.goToForm());
  expect(h.result.current.form).toMatchObject({ productName: 'draft', barcode: '12345678' });
});
it('rejects a malformed search response', async () => {
  api.search.mockResolvedValue({ items: [{ id: 'bad', name: {} }] });
  const h = renderHook(() => useForm()); act(() => h.result.current.setSearchInput('fixture'));
  await act(() => h.result.current.runSearch()); expect(h.result.current.searchError).toBeTruthy();
});
it('prevents duplicate submission synchronously and holds the submitted draft', async () => {
  const pending = deferred<StoreProductRequest>(); api.submit.mockReturnValue(pending.promise);
  const h = renderHook(() => useForm()); fill(h);
  let write!: Promise<void>;
  act(() => { write = h.result.current.handleSubmit(); void h.result.current.handleSubmit(); h.result.current.patch({ productName: 'changed' }); });
  expect(api.submit).toHaveBeenCalledTimes(1); expect(h.result.current.form.productName).toBe(' Fixture draft ');
  expect(api.submit.mock.calls[0][0]).toMatchObject({ productName: 'Fixture draft', manufacturer: 'Fixture maker', noBarcode: true });
  await act(async () => { pending.resolve(request()); await write; });
  expect(submitted).toHaveBeenCalledTimes(1); expect(closed).toHaveBeenCalledTimes(1);
});
it.each([undefined, { id: {}, displayStatus: 'reviewing' }, { id: 'request', displayStatus: 'registered' }])('does not report an invalid new-request response as success %#', async reply => {
  const h = renderHook(() => useForm()); fill(h); api.submit.mockResolvedValue(reply);
  await act(() => h.result.current.handleSubmit()); expect(submitted).not.toHaveBeenCalled(); expect(h.result.current.actionError).toBeTruthy();
});
it('preserves a failed draft and permits a corrected retry', async () => {
  const h = renderHook(() => useForm()); fill(h); api.submit.mockRejectedValueOnce(new Error('private diagnostic'));
  await act(() => h.result.current.handleSubmit());
  expect(h.result.current.form.productName).toBe(' Fixture draft '); expect(closed).not.toHaveBeenCalled();
  expect(h.result.current.actionError).not.toContain('private');
  act(() => h.result.current.patch({ productName: 'Revised fixture' })); await act(() => h.result.current.handleSubmit());
  expect(api.submit).toHaveBeenCalledTimes(2); expect(submitted).toHaveBeenCalledTimes(1);
});
it('preserves duplicate-barcode input for an explicit existing-product handoff', async () => {
  const h = renderHook(() => useForm()); fill(h);
  api.submit.mockRejectedValueOnce(Object.assign(new Error('private'), { code: 'EXISTING_PRODUCT_FOUND' }));
  await act(() => h.result.current.handleSubmit());
  expect(h.result.current.existingFound).toBe(true); expect(h.result.current.form.productName).toBe(' Fixture draft ');
  expect(closed).not.toHaveBeenCalled();
});
it('uses the original request ID for revision submission', async () => {
  const h = renderHook(() => useForm(request('revision', 'revision_requested'))); api.resubmit.mockResolvedValue(request('revision'));
  act(() => h.result.current.patch({ productName: 'Revised fixture' }));
  await act(() => h.result.current.handleSubmit());
  expect(api.submit).not.toHaveBeenCalled(); expect(api.resubmit.mock.calls[0][0]).toBe('revision');
  expect(submitted).toHaveBeenCalledTimes(1);
});
it('refuses revision of a request that is not editable', async () => {
  const h = renderHook(() => useForm(request())); await act(() => h.result.current.handleSubmit());
  expect(api.resubmit).not.toHaveBeenCalled(); expect(h.result.current.actionError).toContain('보완 요청');
});
it.each([undefined, { id: 'wrong', displayStatus: 'reviewing' }, { id: 'revision', displayStatus: 'registered' }])('does not claim an unconfirmed revision as success %#', async reply => {
  const h = renderHook(() => useForm(request('revision', 'revision_requested'))); api.resubmit.mockResolvedValue(reply);
  await act(() => h.result.current.handleSubmit()); expect(submitted).not.toHaveBeenCalled(); expect(h.result.current.actionError).toBeTruthy();
});
it('registers only a current search result and serializes existing-product actions', async () => {
  const h = renderHook(() => useForm()); act(() => h.result.current.setSearchInput('fixture')); await act(() => h.result.current.runSearch());
  const pending = deferred<{ success: boolean }>(); api.register.mockReturnValue(pending.promise);
  let write!: Promise<void>; act(() => { write = h.result.current.handleRegisterExisting(product as any); void h.result.current.handleRegisterExisting(product as any); });
  expect(api.register).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve({ success: true }); await write; }); expect(submitted).toHaveBeenCalledTimes(1);
});
it('does not register a result from an invalidated query or accept success false', async () => {
  const h = renderHook(() => useForm()); act(() => h.result.current.setSearchInput('fixture')); await act(() => h.result.current.runSearch());
  api.register.mockResolvedValue({ success: false }); await act(() => h.result.current.handleRegisterExisting(product as any));
  expect(submitted).not.toHaveBeenCalled(); expect(h.result.current.actionError).toBeTruthy();
  act(() => h.result.current.setSearchInput('changed')); await act(() => h.result.current.handleRegisterExisting(product as any));
  expect(api.register).toHaveBeenCalledTimes(1);
});
it.each(['submit', 'register'])('ignores an old %s completion after close or store switch', async kind => {
  const pending = deferred<any>(); const h = renderHook(() => useForm()); let write!: Promise<void>;
  if (kind === 'submit') { fill(h); api.submit.mockReturnValue(pending.promise); act(() => { write = h.result.current.handleSubmit(); }); }
  else { act(() => h.result.current.setSearchInput('fixture')); await act(() => h.result.current.runSearch()); api.register.mockReturnValue(pending.promise); act(() => { write = h.result.current.handleRegisterExisting(product as any); }); }
  h.unmount(); api.store = 'B';
  await act(async () => { pending.resolve(kind === 'submit' ? request() : { success: true }); await write; });
  expect(submitted).not.toHaveBeenCalled(); expect(closed).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
});
it('shows an actual empty request list without an error', async () => {
  api.list.mockResolvedValue(list(1, 0, [])); const h = renderHook(() => useProductRequestList('A'));
  await waitFor(() => expect(h.result.current.loading).toBe(false)); expect(h.result.current.items).toEqual([]); expect(h.result.current.error).toBeNull();
});
it('retries a request list failure with a safe error', async () => {
  api.list.mockRejectedValueOnce(new Error('private')); const h = renderHook(() => useProductRequestList('A'));
  await waitFor(() => expect(h.result.current.loading).toBe(false)); expect(h.result.current.error).not.toContain('private');
  act(() => h.result.current.refresh()); await waitFor(() => expect(h.result.current.items).toHaveLength(1)); expect(h.result.current.error).toBeNull();
});
it('does not apply delayed results from an earlier page', async () => {
  const old = deferred<ReturnType<typeof list>>(); api.list.mockReturnValueOnce(old.promise);
  const h = renderHook(() => useProductRequestList('A')); act(() => h.result.current.setPage(2));
  api.list.mockResolvedValue(list(2, 21, [request('second')]));
  act(() => h.result.current.refresh()); await waitFor(() => expect(h.result.current.items[0]?.id).toBe('second'));
  await act(async () => { old.resolve(list()); }); expect(h.result.current.items[0].id).toBe('second');
});
it('clamps an emptied last page and reloads the remaining page', async () => {
  api.list.mockImplementation(async ({ page }) => page === 2 ? list(2, 1, []) : list());
  const h = renderHook(() => useProductRequestList('A')); await waitFor(() => expect(h.result.current.loading).toBe(false));
  act(() => h.result.current.setPage(2)); await waitFor(() => expect(h.result.current.page).toBe(1));
  await waitFor(() => expect(h.result.current.loading).toBe(false)); expect(h.result.current.items).toHaveLength(1);
});
it('ignores request list completion after unmount and cancels old refreshes', async () => {
  const pending = deferred<ReturnType<typeof list>>(); api.list.mockReturnValueOnce(pending.promise);
  const h = renderHook(() => useProductRequestList('A')); h.unmount(); api.store = 'B';
  await act(async () => { pending.resolve(list()); }); expect(h.result.current.items).toEqual([]);
});
it.each(['bad-total', 'wrong-page', 'duplicate', 'bad-status', 'unsafe-edit', 'bad-text'])('rejects malformed request metadata or rows: %s', kind => {
  const reply = list() as any;
  if (kind === 'bad-total') reply.meta.total = -1;
  if (kind === 'wrong-page') reply.meta.page = 2;
  if (kind === 'duplicate') { reply.items = [request(), request()]; reply.meta.total = 2; }
  if (kind === 'bad-status') reply.items[0].displayStatus = 'unknown';
  if (kind === 'unsafe-edit') reply.items[0].editable = true;
  if (kind === 'bad-text') reply.items[0].productName = {};
  expect(() => validateRequestList(reply, 1)).toThrow();
});
it('starts a fresh draft on close and reopen, even with an old search in flight', async () => {
  const pending = deferred<{ items: typeof product[] }>(); api.search.mockReturnValue(pending.promise);
  const props = { open: true, onClose: closed, onSubmitted: submitted };
  const view = render(<StoreNewProductRequestModal {...props} />);
  expect(screen.getByRole('dialog', { name: '신규 상품 등록 요청' })).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'old fixture' } });
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
  view.rerender(<StoreNewProductRequestModal {...props} open={false} />);
  view.rerender(<StoreNewProductRequestModal {...props} />);
  await act(async () => { pending.resolve({ items: [product] }); });
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  expect(screen.queryByText('Fixture product')).toBeNull();
});
it('replaces an edit draft when the selected request changes and resets it after switching stores', () => {
  const props = { open: true, onClose: closed, onSubmitted: submitted, editRequest: request('one', 'revision_requested') };
  const view = render(<StoreNewProductRequestModal {...props} />);
  view.rerender(<StoreNewProductRequestModal {...props} editRequest={{ ...request('two', 'revision_requested'), productName: 'Other fixture' }} />);
  expect((screen.getByRole('textbox', { name: '포장 표시 상품명' }) as HTMLInputElement).value).toBe('Other fixture');
  api.store = 'B'; view.rerender(<StoreNewProductRequestModal {...props} editRequest={null} />);
  expect(screen.getByRole('searchbox')).toBeTruthy();
});
it('loads the request list under StrictMode and unmounts when closed', async () => {
  const props = { open: true, onClose: closed, onEdit: vi.fn() };
  const view = render(<StrictMode><StoreProductRequestsListModal {...props} /></StrictMode>);
  await screen.findByText('Fixture request');
  view.rerender(<StrictMode><StoreProductRequestsListModal {...props} open={false} /></StrictMode>);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('focuses the new form step without losing the trigger used for focus restoration', () => {
  const props = { onClose: closed, onSubmitted: submitted };
  const content = (open: boolean) => <><button>Fixture trigger</button><StoreNewProductRequestModal {...props} open={open} /></>;
  const view = render(content(false)); const trigger = screen.getByRole('button', { name: 'Fixture trigger' }); trigger.focus();
  view.rerender(content(true)); expect(document.activeElement).toBe(screen.getByRole('searchbox'));
  fireEvent.click(screen.getByRole('button', { name: '신규 등록 요청 작성' }));
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '포장 표시 상품명' }));
  view.rerender(content(false)); expect(document.activeElement).toBe(trigger);
});
it('does not fetch or render when a store is unavailable', () => {
  api.store = '';
  render(<><StoreNewProductRequestModal open onClose={closed} onSubmitted={submitted} /><StoreProductRequestsListModal open onClose={closed} onEdit={vi.fn()} /></>);
  expect(screen.queryByRole('dialog')).toBeNull(); expect(api.list).not.toHaveBeenCalled(); expect(api.search).not.toHaveBeenCalled();
});

it('native request dialog closes from its backdrop or Escape but preserves an active retry session', () => {
  const onClose = vi.fn();
  const content = (preventBackdropClose: boolean) => <ProductRequestDialog label="Fixture request dialog" style={{}} onClose={onClose} preventBackdropClose={preventBackdropClose}><button>Inside action</button></ProductRequestDialog>;
  const { rerender } = render(content(false));
  const dialog = screen.getByRole('dialog', { name: 'Fixture request dialog' });
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Inside action' }));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.pointerDown(dialog);
  expect(onClose).toHaveBeenCalledOnce();
  onClose.mockClear(); rerender(content(true));
  fireEvent.pointerDown(dialog);
  expect(onClose).not.toHaveBeenCalled();
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(onClose).toHaveBeenCalledOnce();
});
