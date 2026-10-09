import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setActiveStoreOrganizationId, captureStoreOrganizationHeaders } from '../../lib/storeOrganizationHeader';
import { fetchHandledProducts, removeHandledProducts, fetchHandledProductQrFile } from '../handledProducts';
import { createLocalProduct } from '../localProducts';

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ getAccessToken: () => 'synthetic-old' }));
vi.mock('../../lib/apiClient', () => ({ API_BASE_URL: '/api/v1', api: { interceptors: { request: { use: vi.fn() } } } }));
vi.mock('../token-refresh', () => ({ tryRefreshToken: mocks.refresh }));

beforeEach(() => {
  vi.restoreAllMocks();
  setActiveStoreOrganizationId('store-a');
  mocks.refresh.mockImplementation(async () => {
    setActiveStoreOrganizationId('store-b');
    return 'synthetic-refreshed';
  });
});

afterEach(() => { vi.unstubAllGlobals(); setActiveStoreOrganizationId(null); });

describe('제품 API의 선택 매장', () => {
  it.each([
    ['목록', () => fetchHandledProducts()],
    ['선택 제거', () => removeHandledProducts([{ sourceType: 'local', sourceId: 'local-a' }])],
    ['직접 등록', () => createLocalProduct({ name: '직접 제품' })],
    ['QR 파일', () => fetchHandledProductQrFile('listing', 'listing-a', 'png')],
  ])('%s: 인증 갱신 중 매장을 바꿔도 최초 매장을 유지한다', async (_, operation) => {
    const seen: Headers[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_input, init) => {
      seen.push(new Headers(init?.headers));
      return seen.length === 1
        ? new Response('{}', { status: 401 })
        : new Response(JSON.stringify({ success: true, data: { items: [], pagination: { total: 0 } } }));
    }));
    await operation();
    expect(seen.map(h => h.get('X-Store-Organization-Id'))).toEqual(['store-a', 'store-a']);
    expect(seen[1].get('Authorization')).toBe('Bearer synthetic-refreshed');
    expect(seen[0].get('Authorization')).toBe('Bearer synthetic-old');
  });
  it('명시한 매장 헤더를 유지하고 매장이 없으면 임의로 선택하지 않는다', () => {
    expect(captureStoreOrganizationHeaders({ 'X-Store-Organization-Id': 'explicit-store' }).get('X-Store-Organization-Id')).toBe('explicit-store');
    setActiveStoreOrganizationId(null);
    expect(captureStoreOrganizationHeaders({}).has('X-Store-Organization-Id')).toBe(false);
  });
});
