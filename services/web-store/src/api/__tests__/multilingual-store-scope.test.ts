import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActiveStoreOrganizationId } from '../../lib/storeOrganizationHeader';
import { listMyMlcGroups, updateStoreMlcGroup, upsertStoreMlcPage, ensureMlcPublicKey } from '../multilingualProductContentStore';
const state = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ getAccessToken: () => 'synthetic' }));
vi.mock('../../lib/apiClient', () => ({ API_BASE_URL: '/api/v1', api: { interceptors: { request: { use: vi.fn() } } } }));
vi.mock('../token-refresh', () => ({ tryRefreshToken: state.refresh }));
beforeEach(() => { setActiveStoreOrganizationId('A'); state.refresh.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); setActiveStoreOrganizationId(null); });
it.each([
  () => listMyMlcGroups(),
  () => updateStoreMlcGroup('group', { title: 'Title', defaultLocale: 'ko' }),
  () => upsertStoreMlcPage('group', 'en', { title: 'Title', summary: '' }),
  () => ensureMlcPublicKey('group'),
])('retains the original store, method and body through token refresh %#', async operation => {
  state.refresh.mockImplementation(async () => { setActiveStoreOrganizationId('B'); return 'refreshed'; });
  const requests: RequestInit[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    requests.push({ ...options, headers: new Headers(options.headers) });
    return requests.length === 1 ? new Response('{}', { status: 401 }) : new Response(JSON.stringify({ success: true, data: [] }));
  }));
  await operation();
  expect(requests.map(r => new Headers(r.headers).get('X-Store-Organization-Id'))).toEqual(['A', 'A']);
  expect(requests[0].method).toBe(requests[1].method); expect(requests[0].body).toBe(requests[1].body);
  expect(new Headers(requests[1].headers).get('Authorization')).toBe('Bearer refreshed');
});
it('uses PATCH for existing group metadata without rewriting source or status', async () => {
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { id: 'copy' } })));
  vi.stubGlobal('fetch', request);
  await updateStoreMlcGroup('copy', { title: 'Changed', defaultLocale: 'zh' });
  expect(request.mock.calls[0][1].method).toBe('PATCH');
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ title: 'Changed', defaultLocale: 'zh' });
});
it.each([
  [500, { success: true, data: [] }], [200, { success: false, error: { message: 'private diagnostic' } }],
  [200, { success: true, data: null }], [200, { success: true, data: {} }],
])('rejects failed or malformed list responses instead of showing empty data %#', async (status, body) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
  await expect(listMyMlcGroups()).rejects.toThrow(/목록|요청/);
});
it('preserves the unavailable-published-page code without exposing a diagnostic', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'PUBLISHED_PAGE_NOT_FOUND', message: 'private diagnostic' } }), { status: 404 })));
  await expect(ensureMlcPublicKey('group')).rejects.toMatchObject({ code: 'PUBLISHED_PAGE_NOT_FOUND', status: 404 });
});
