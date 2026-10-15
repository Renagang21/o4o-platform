import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSupplierOrders } from '../orders/useSupplierOrders';
import { useEventOfferLists } from '../event-offer/useEventOfferLists';
import { useSupplierProducts } from '../supplier-products/useSupplierProducts';

const api = vi.hoisted(() => ({
  summary: vi.fn(), unified: vi.fn(), events: vi.fn(), proposals: vi.fn(),
  products: vi.fn(), counts: vi.fn(),
}));
vi.mock('../../../lib/api', () => ({
  supplierApi: {
    getOrdersSummary: api.summary, getUnifiedOrders: api.unified,
    getProductsPaginated: api.products, getApprovalCounts: api.counts,
  },
  netureEventOfferApi: { getEnrichedOffers: api.events },
  supplierKpaEventOfferApi: { listMyProposals: api.proposals },
}));
vi.mock('../../../api/guideContent', () => ({ fetchGuidePageContent: async () => ({}) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const orders = (total: number) => ({ data: total ? [{ id: `order-${total}` }] : [], meta: { total } });
const events = (total: number, totalPages = 1) => ({ data: { data: total ? [{ id: `event-${total}` }] : [], pagination: { total, totalPages } } });
const products = (total: number) => ({ data: total ? [{ id: `offer-${total}` }] : [], pagination: { page: 1, limit: 50, total, totalPages: 1 } });
const counts = (total: number) => ({ total, unrequested: total, pending: 0, approved: 0, rejected: 0 });
beforeEach(() => {
  vi.resetAllMocks();
  api.summary.mockResolvedValue({ services: [], totalApprovedSellers: 0, totalPendingRequests: 0 });
  api.unified.mockResolvedValue(orders(0));
  api.products.mockResolvedValue(products(0));
  api.counts.mockResolvedValue(counts(0));
  api.proposals.mockResolvedValue([]);
  api.events.mockResolvedValue(events(0));
});
afterEach(cleanup);

describe('supplier query response ordering', () => {
  it.each(['resolve', 'reject'] as const)('keeps the selected order source after a late previous %s', async (outcome) => {
    const old = deferred<ReturnType<typeof orders>>();
    api.unified.mockReturnValueOnce(old.promise).mockResolvedValueOnce(orders(7));
    const { result } = renderHook(useSupplierOrders);
    act(() => result.current.setSourceFilter('checkout'));
    await waitFor(() => expect(result.current.unifiedTotal).toBe(7));
    await act(async () => { if (outcome === 'resolve') old.resolve(orders(99)); else old.reject(new Error('old request')); });
    expect(result.current.unifiedTotal).toBe(7);
    expect(result.current.unifiedOrders.map((o) => o.id)).toEqual(['order-7']);
    expect(result.current.unifiedError).toBe(false);
    expect(api.unified).toHaveBeenLastCalledWith({ page: 1, limit: 20, source: 'checkout' });
    expect(api.summary).toHaveBeenCalledTimes(1);
  });

  it('keeps order loading until the selected source request settles', async () => {
    const old = deferred<ReturnType<typeof orders>>();
    const latest = deferred<ReturnType<typeof orders>>();
    api.unified.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    const { result } = renderHook(useSupplierOrders);
    act(() => result.current.setSourceFilter('checkout'));
    await act(async () => old.resolve(orders(99)));
    expect(result.current.unifiedLoading).toBe(true);
    expect(result.current.unifiedTotal).toBe(0);
    await act(async () => latest.reject(new Error('latest failure')));
    expect(result.current.unifiedLoading).toBe(false);
    expect(result.current.unifiedError).toBe(true);
  });

  it.each(['resolve', 'reject'] as const)('keeps event status/page metadata after a late previous %s', async (outcome) => {
    const old = deferred<ReturnType<typeof events>>();
    api.events.mockReturnValueOnce(old.promise).mockResolvedValueOnce(events(8, 4));
    const { result } = renderHook(useEventOfferLists);
    let previous!: Promise<void>;
    act(() => { previous = result.current.fetchItems(2, 'active'); });
    await act(async () => result.current.fetchItems(3, 'ended'));
    await act(async () => {
      if (outcome === 'resolve') old.resolve(events(99, 5)); else old.reject(new Error('old request'));
      await previous;
    });
    expect(result.current.total).toBe(8);
    expect(result.current.items.map((o) => o.id)).toEqual(['event-8']);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.page).toBe(3);
    expect(result.current.itemsError).toBe(false);
    expect(api.events).toHaveBeenLastCalledWith({ page: 3, limit: 20, status: 'ended' });
  });

  it('does not end event loading when the previous page finishes first', async () => {
    const old = deferred<ReturnType<typeof events>>();
    const latest = deferred<ReturnType<typeof events>>();
    api.events.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    const { result } = renderHook(useEventOfferLists);
    let previous!: Promise<void>;
    let current!: Promise<void>;
    act(() => { previous = result.current.fetchItems(1, 'active'); current = result.current.fetchItems(1, 'ended'); });
    await act(async () => { old.resolve(events(99)); await previous; });
    expect(result.current.loading).toBe(true);
    expect(result.current.total).toBe(0);
    await act(async () => { latest.resolve(events(8)); await current; });
    expect(result.current.loading).toBe(false);
    expect(result.current.total).toBe(8);
  });

  it('retries the requested event page after a status change fails', async () => {
    api.events.mockResolvedValueOnce(events(60, 3)).mockRejectedValueOnce(new Error('new status failure'));
    const { result } = renderHook(useEventOfferLists);
    await act(async () => result.current.fetchItems(3, 'active'));
    await act(async () => result.current.fetchItems(1, 'ended'));
    expect(result.current.itemsError).toBe(true);
    expect(result.current.page).toBe(1);
    await act(async () => result.current.fetchItems(result.current.page, 'ended'));
    expect(api.events).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: 'ended' });
    expect(result.current.itemsError).toBe(false);
  });

  it.each(['resolve', 'reject'] as const)('keeps searched product rows and counts after a late previous %s', async (outcome) => {
    const oldRows = deferred<ReturnType<typeof products>>();
    const oldCounts = deferred<ReturnType<typeof counts>>();
    api.products.mockReturnValueOnce(oldRows.promise).mockResolvedValueOnce(products(7));
    api.counts.mockReturnValueOnce(oldCounts.promise).mockResolvedValueOnce(counts(7));
    const { result } = renderHook(useSupplierProducts, { wrapper: MemoryRouter });
    act(() => result.current.setKeyword('new query'));
    await waitFor(() => expect(result.current.pagination.total).toBe(7));
    await waitFor(() => expect(result.current.tabCounts?.total).toBe(7));
    await act(async () => {
      if (outcome === 'resolve') { oldRows.resolve(products(99)); oldCounts.resolve(counts(99)); }
      else { oldRows.reject(new Error('old rows')); oldCounts.reject(new Error('old counts')); }
    });
    expect(result.current.pagination.total).toBe(7);
    expect(result.current.products.map((o) => o.id)).toEqual(['offer-7']);
    expect(result.current.tabCounts?.total).toBe(7);
    expect(result.current.loadError).toBe(false);
    expect(result.current.countsError).toBe(false);
    expect(api.products.mock.lastCall?.[0].keyword).toBe('new query');
    expect(api.counts.mock.lastCall?.[0].keyword).toBe('new query');
  });

  it('restores a product list URL and resets page and all filters together', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter initialEntries={['/supplier/products?q=old&page=2&hasImage=false&completeness=INCOMPLETE&approval=pending']}>{children}</MemoryRouter>;
    const { result } = renderHook(useSupplierProducts, { wrapper });
    await waitFor(() => expect(api.products.mock.lastCall?.[0]).toMatchObject({ page: 2, keyword: 'old', hasImage: 'false', completenessStatus: 'INCOMPLETE' }));
    expect(result.current.activeTab).toBe('pending');
    act(() => result.current.setKeyword('new'));
    await waitFor(() => expect(api.products.mock.lastCall?.[0]).toMatchObject({ page: 1, keyword: 'new' }));
    act(() => result.current.resetAllFilters());
    await waitFor(() => expect(result.current.hasAnyFilter).toBe(false));
    expect(result.current.activeTab).toBe('all');
    expect(result.current.keyword).toBe('');
    expect(api.products.mock.lastCall?.[0].hasImage).toBeUndefined();
  });

  it('keeps product loading and selection while older results arrive', async () => {
    const old = deferred<ReturnType<typeof products>>();
    const latest = deferred<ReturnType<typeof products>>();
    api.products.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    const { result } = renderHook(useSupplierProducts, { wrapper: MemoryRouter });
    act(() => { result.current.setKeyword('new query'); result.current.toggleSelect('new-offer'); });
    await act(async () => old.resolve(products(99)));
    expect(result.current.loading).toBe(true);
    expect(result.current.selectedIds.has('new-offer')).toBe(true);
    await act(async () => latest.reject(new Error('latest failure')));
    expect(result.current.loading).toBe(false);
    expect(result.current.loadError).toBe(true);
    expect(result.current.selectedIds.size).toBe(0);
  });
});
