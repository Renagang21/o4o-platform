import { expect, it, vi } from 'vitest';
import { mediaApi } from '../media';
const fetcher = vi.hoisted(() => vi.fn());
vi.mock('../storeScopedFetch', () => ({ storeScopedFetch: fetcher }));
it('sends the existing internal-storage filter through the actual Store media adapter', async () => {
  fetcher.mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] })));
  await mediaApi.list({ assetType: 'video', storageType: 'internal', page: 2 });
  const query = new URL(fetcher.mock.calls[0][0], 'https://fixture.test').searchParams;
  expect(query.get('storageType')).toBe('internal'); expect(query.get('assetType')).toBe('video'); expect(query.get('page')).toBe('2');
});
