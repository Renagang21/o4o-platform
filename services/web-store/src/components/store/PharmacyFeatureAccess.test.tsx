import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { filterPharmacyFeatureMenu, pharmacyFeatureForPath, pharmacyFeaturesForPath, usePharmacyFeatureAccess } from './PharmacyFeatureAccess';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../api/client', () => ({ coreApiClient: api }));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
const allowed = (organizationId: string) => ({ success: true, data: { organizationId, features: [{ key: 'tablet', allowed: true }, { key: 'multilingual-content', allowed: false }] } });
it('maps scoped/direct feature paths while preserving existing multilingual copies', () => {
  expect(pharmacyFeatureForPath('/work/kpa-society/store/commerce/tablet-displays')).toBe('tablet');
  expect(pharmacyFeatureForPath('/store/products/multilingual/local/id')).toBe('multilingual-content');
  expect(pharmacyFeatureForPath('/store/library/multilingual-product-contents/my')).toBeNull();
  const config = { serviceKey: 'store', serviceName: '내 매장', basePath: '/store', enabledMenus: [], menuSections: [{ label: '', items: [
    { key: 'tablet', label: '태블릿', subPath: '/commerce/tablet-displays' },
    { key: 'home', label: '홈', subPath: '' },
  ] }] };
  expect(filterPharmacyFeatureMenu(config, null).menuSections?.[0].items.map(i => i.key)).toEqual(['home']);
  expect(filterPharmacyFeatureMenu(config, allowed('a').data as any).menuSections?.[0].items).toHaveLength(2);
});
it('shows one consultation menu when any permitted mode is available', () => {
  const config = { serviceKey: 'store', serviceName: '내 매장', basePath: '/store', enabledMenus: [], menuSections: [{ label: '', items: [{ key: 'consultation', label: '다국어 상담', subPath: '/multilingual-consultation' }] }] };
  const modes = pharmacyFeaturesForPath('/work/kpa-society/store/multilingual-consultation');
  expect(modes).toHaveLength(3);
  for (const key of modes) {
    expect(filterPharmacyFeatureMenu(config, { organizationId: 'store', features: [{ key, allowed: true }] }).menuSections?.[0].items).toHaveLength(1);
  }
  expect(filterPharmacyFeatureMenu(config, { organizationId: 'store', features: modes.map(key => ({ key, allowed: false })) }).menuSections?.[0].items).toHaveLength(0);
});
it('discards old store responses and permits retry after an unavailable lookup', async () => {
  let oldResolve: (value: unknown) => void = () => {};
  api.get.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; })).mockRejectedValueOnce(new Error('offline'));
  const hook = renderHook(({ org }) => usePharmacyFeatureAccess(org, true, '/store/requests'), { initialProps: { org: 'a' } });
  hook.rerender({ org: 'b' });
  await waitFor(() => expect(hook.result.current.error).toBe(true));
  await act(async () => oldResolve(allowed('a')));
  expect(hook.result.current.data).toBeNull();
  api.get.mockResolvedValueOnce(allowed('b'));
  act(() => hook.result.current.reload());
  await waitFor(() => expect(hook.result.current.data?.organizationId).toBe('b'));
});
it('does not call pharmacy APIs for another store domain and refuses a mismatched organization', async () => {
  const hook = renderHook(({ enabled }) => usePharmacyFeatureAccess('a', enabled, '/store/requests'), { initialProps: { enabled: false } });
  expect(api.get).not.toHaveBeenCalled();
  api.get.mockResolvedValueOnce(allowed('foreign'));
  hook.rerender({ enabled: true });
  await waitFor(() => expect(hook.result.current.error).toBe(true));
  expect(hook.result.current.data).toBeNull();
});
it('discards the previous account permission even when the selected store and path are unchanged', async () => {
  api.get.mockResolvedValueOnce(allowed('a'));
  const hook = renderHook(({ account }) => usePharmacyFeatureAccess('a', true, '/store/requests', account), { initialProps: { account: 'owner' } });
  await waitFor(() => expect(hook.result.current.data?.features[0].allowed).toBe(true));
  let finish!: (value: unknown) => void;
  api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  hook.rerender({ account: 'staff' });
  expect(hook.result.current.data).toBeNull();
  await act(async () => finish({ success: true, data: { organizationId: 'a', features: [{ key: 'tablet', allowed: false }, { key: 'multilingual-content', allowed: false }] } }));
  await waitFor(() => expect(hook.result.current.data?.features[0].allowed).toBe(false));
});
