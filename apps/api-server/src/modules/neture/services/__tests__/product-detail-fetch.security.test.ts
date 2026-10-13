import logger from '../../../../utils/logger.js';
import type { DataSource } from 'typeorm';
import dns from 'node:dns';
const mockUpload = jest.fn();
jest.mock('../../../media/services/media-library.service.js', () => ({
  MediaLibraryService: jest.fn().mockImplementation(() => ({ upload: mockUpload })),
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
import { copyImages, proxyImage } from '../product-detail-fetch.service.js';
const previousFetch = global.fetch;
const fakeFetch = jest.fn();
beforeEach(() => {
  global.fetch = fakeFetch as typeof fetch;
  fakeFetch
    .mockReset()
    .mockImplementation(
      async () => new Response('fixture image', { headers: { 'content-type': 'image/png' } }),
    );
  mockUpload.mockReset().mockResolvedValue({ url: 'https://fixture.invalid/copied.png' });
  jest
    .spyOn(dns.promises, 'lookup')
    .mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as never);
});
afterEach(() => {
  global.fetch = previousFetch;
  jest.restoreAllMocks();
});
describe('supplier image fetching security and copy contracts (network/storage fixtures)', () => {
  it.each([
    'http://localhost/image',
    'http://127.0.0.1/image',
    'http://10.0.0.1/image',
    'http://169.254.169.254/image',
    'file:///fixture',
    'http://user:pass@fixture.invalid/image',
  ])('rejects unsafe URL before fetch: %s', async (url) => {
    await expect(proxyImage(url)).rejects.toThrow();
    expect(fakeFetch).not.toHaveBeenCalled();
  });
  it('rejects DNS private answers and cross-origin before fetch', async () => {
    (dns.promises.lookup as jest.Mock).mockResolvedValue([{ address: '192.168.1.1', family: 4 }]);
    await expect(proxyImage('https://fixture.invalid/image')).rejects.toThrow();
    expect(fakeFetch).not.toHaveBeenCalled();
    await expect(
      proxyImage('https://other.invalid/image', 'https://fixture.invalid'),
    ).rejects.toThrow();
  });
  it('rejects invalid MIME and size while preserving original bytes in proxy mode', async () => {
    fakeFetch
      .mockResolvedValueOnce(new Response('fixture', { headers: { 'content-type': 'text/html' } }))
      .mockResolvedValueOnce(
        new Response('fixture', {
          headers: { 'content-type': 'image/png', 'content-length': String(9 * 1024 * 1024) },
        }),
      );
    await expect(proxyImage('https://fixture.invalid/image')).rejects.toThrow();
    await expect(proxyImage('https://fixture.invalid/image')).rejects.toThrow();
    const result = await proxyImage('https://fixture.invalid/image');
    expect(result.buffer.toString()).toBe('fixture image');
    expect(result.mime).toBe('image/png');
    expect(mockUpload).not.toHaveBeenCalled();
  });
  it('copy deduplicates in source order and exposes each failure', async () => {
    const result = await copyImages(
      [
        ' https://fixture.invalid/a.png ',
        'https://fixture.invalid/a.png',
        'http://localhost/b.png',
        'https://fixture.invalid/c.png',
      ],
      { dataSource: {} as DataSource, userId: 'fixture-user', imageMode: 'preserve-original' },
    );
    expect(result.map((r) => r.ok)).toEqual([true, false, true]);
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload.mock.calls[0].slice(1)).toEqual([
      'fixture-user',
      'neture',
      'description',
      { imageMode: 'preserve-original' },
    ]);
  });
  it('same-origin redirects retain proxy bytes', async () => {
    fakeFetch.mockImplementation(async (_url, options) =>
      options?.redirect === 'manual'
        ? fakeFetch.mock.calls.length === 1
          ? new Response(null, { status: 302, headers: { location: '/resolved.png' } })
          : new Response('fixture redirected', { headers: { 'content-type': 'image/png' } })
        : new Response('fixture redirected', { headers: { 'content-type': 'image/png' } }),
    );
    const result = await proxyImage('https://fixture.invalid/image');
    expect(result.buffer.toString()).toBe('fixture redirected');
  });
  it.each(['http://localhost/internal.png', 'https://other.invalid/image.png'])(
    'rejects unsafe redirects without following: %s',
    async (target) => {
      let unsafeFollowed = false;
      fakeFetch.mockImplementation(async (_url, options) => {
        if (options?.redirect === 'follow') {
          unsafeFollowed = true;
          return new Response('unsafe redirected bytes', {
            headers: { 'content-type': 'image/png' },
          });
        }
        return new Response(null, { status: 302, headers: { location: target } });
      });
      await expect(
        proxyImage('https://fixture.invalid/image', 'https://fixture.invalid'),
      ).rejects.toThrow();
      expect(unsafeFollowed).toBe(false);
      expect(fakeFetch).toHaveBeenCalledTimes(1);
    },
  );
  it('bounds redirects using one timeout and never uploads proxy data', async () => {
    fakeFetch.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: '/again.png' } }),
    );
    await expect(proxyImage('https://fixture.invalid/image')).rejects.toThrow();
    expect(fakeFetch.mock.calls.length).toBeLessThanOrEqual(6);
    expect(mockUpload).not.toHaveBeenCalled();
  });
  it('does not put supplied credential URLs into failure logs', async () => {
    const supplied = 'https://fixture-user:fixture-value@fixture.invalid/image.png?token=fixture';
    const result = await copyImages([supplied], {
      dataSource: {} as DataSource,
      userId: 'fixture-user',
    });
    expect(result[0]).toMatchObject({ ok: false, reason: 'INVALID_URL' });
    expect(fakeFetch).not.toHaveBeenCalled();
    expect((logger.warn as jest.Mock).mock.calls.flat().join(' ')).not.toContain(supplied);
    expect((logger.warn as jest.Mock).mock.calls.flat().join(' ')).not.toContain('fixture-value');
  });
});
