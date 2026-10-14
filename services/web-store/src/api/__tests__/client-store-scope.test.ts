import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../client';
import { setActiveStoreOrganizationId } from '../../lib/storeOrganizationHeader';
import { storeScopedFetch } from '../storeScopedFetch';
import { registerStandardProductToStore } from '../o4oStandardProducts';
import { submitProductRequest } from '../storeProductRequests';
import { importOperatorTemplate } from '../storeScreenSetHub';
import { saveTabletDisplaySettings } from '../tabletDisplays';
import { mediaApi } from '../media';

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('@o4o/auth-client', () => ({ getAccessToken: () => 'synthetic-old' }));
vi.mock('../../contexts/AuthContext', () => ({ getAccessToken: () => 'synthetic-old' }));
vi.mock('../../lib/apiClient', () => ({ API_BASE_URL: '/api/v1', api: { interceptors: { request: { use: vi.fn() } } } }));
vi.mock('../../lib/serviceContext', () => ({ apiV1Base: () => 'https://api.example/api/v1', apiV1Service: () => 'https://api.example/api/v1/kpa' }));
vi.mock('../token-refresh', () => ({ tryRefreshToken: mocks.refresh }));

beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'https://store.example' } });
  setActiveStoreOrganizationId('store-a');
  mocks.refresh.mockImplementation(async () => {
    setActiveStoreOrganizationId('store-b');
    return 'synthetic-refreshed';
  });
});
afterEach(() => { vi.unstubAllGlobals(); setActiveStoreOrganizationId(null); });

describe('shared request store scope', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'GET'])('%s keeps its original store across refresh', async (method) => {
    const seen: RequestInit[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      seen.push({ ...options, headers: new Headers(options.headers) });
      return seen.length === 1 ? new Response('{}', { status: 401 }) : new Response('{}');
    }));
    const client = new ApiClient(() => 'https://api.example/api/v1');
    const body = { title: 'synthetic' };
    if (method === 'GET') await client.get('/test');
    else if (method === 'DELETE') await client.delete('/test');
    else await client[method.toLowerCase() as 'post' | 'put' | 'patch']('/test', body);
    expect(seen.map(o => new Headers(o.headers).get('X-Store-Organization-Id'))).toEqual(['store-a', 'store-a']);
    expect(seen.map(o => o.method)).toEqual([method, method]);
    expect(seen[1].body).toBe(seen[0].body);
    expect(new Headers(seen[1].headers).get('Authorization')).toBe('Bearer synthetic-refreshed');
  });
  it('query filters retain false and zero, omit undefined, and preserve endpoint parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await new ApiClient(() => 'https://api.example').get('/test?existing=kept', { zero: 0, enabled: false, absent: undefined });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('existing')).toBe('kept');
    expect(url.searchParams.get('zero')).toBe('0');
    expect(url.searchParams.get('enabled')).toBe('false');
    expect(url.searchParams.has('absent')).toBe(false);
  });
  it('the common client retains its original 401 error when a replay also fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{"error":{"message":"original denial","code":"ORIGINAL"}}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"message":"replay conflict"}', { status: 409 })));
    await expect(new ApiClient(() => 'https://api.example').post('/test', {})).rejects.toMatchObject({
      message: 'original denial', status: 401, code: 'ORIGINAL',
    });
  });
  it('the common client keeps its timeout error contract', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('synthetic abort', 'AbortError')), { once: true });
    })));
    try {
      const denied = expect(new ApiClient(() => 'https://api.example').post('/test', {})).rejects.toMatchObject({ status: 408, code: 'REQUEST_TIMEOUT' });
      await vi.advanceTimersByTimeAsync(30_000);
      await denied;
    } finally { vi.useRealTimers(); }
  });
  it('failed refresh does not replay a write', async () => {
    mocks.refresh.mockResolvedValueOnce(null);
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"error":{"message":"denied"}}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new ApiClient(() => 'https://api.example').post('/test', {})).rejects.toThrow('denied');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('scoped transport retains multipart body and explicit headers without forcing JSON', async () => {
    const body = new FormData(); body.append('file', new Blob(['synthetic']), 'file.txt');
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 })).mockResolvedValueOnce(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await storeScopedFetch('/media', { method: 'POST', body, headers: new Headers({ 'X-Store-Organization-Id': 'explicit-store' }) });
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.body).toBe(body);
      expect(options.headers.get('Content-Type')).toBeNull();
      expect(options.headers.get('X-Store-Organization-Id')).toBe('explicit-store');
    }
  });
  it.each([
    ['standard product', () => registerStandardProductToStore('synthetic-master')],
    ['product request', () => submitProductRequest({ productName: 'synthetic', classification: 'synthetic' })],
    ['template copy', () => importOperatorTemplate('synthetic-template')],
    ['tablet settings', () => saveTabletDisplaySettings({ showPrice: true, showQr: true, showConsultationButton: false, autoSlideSeconds: 0, idleSlideSeconds: 0 })],
    ['media upload', () => mediaApi.upload(new File(['synthetic'], 'test.txt'), true)],
  ])('%s caller keeps its original store and payload across refresh', async (_name, invoke) => {
    const seen: RequestInit[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      seen.push({ ...options, headers: new Headers(options.headers) });
      return seen.length === 1 ? new Response('{}', { status: 401 }) : new Response('{"success":true,"data":{"id":"synthetic"}}');
    }));
    expect(await invoke()).toBeTruthy();
    expect(seen.map(o => new Headers(o.headers).get('X-Store-Organization-Id'))).toEqual(['store-a', 'store-a']);
    expect(seen[1].body).toBe(seen[0].body);
    expect(seen[1].method).toBe(seen[0].method);
  });
  it('product request retains structured errors after a retried response', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"error":{"message":"synthetic conflict","code":"EXISTING_PRODUCT_FOUND"},"data":{"id":"synthetic"}}', { status: 409 })));
    await expect(submitProductRequest({ productName: 'synthetic', classification: 'synthetic' })).rejects.toMatchObject({
      message: 'synthetic conflict', status: 409, code: 'EXISTING_PRODUCT_FOUND', data: { id: 'synthetic' },
    });
  });
  it('GET 404 retry also keeps the original store', async () => {
    const seen: Headers[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      seen.push(new Headers(options.headers)); setActiveStoreOrganizationId('store-b');
      return seen.length === 1 ? new Response('{}', { status: 404 }) : new Response('{}');
    }));
    await new ApiClient(() => 'https://api.example').get('/test');
    expect(seen.map(h => h.get('X-Store-Organization-Id'))).toEqual(['store-a', 'store-a']);
  });
});
