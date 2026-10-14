import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ overview: vi.fn(), assets: vi.fn(), slug: vi.fn(), pool: vi.fn(), displays: vi.fn(), idle: vi.fn(), direct: vi.fn(), snapshots: vi.fn() }));
vi.mock('../../../../api/storeHub', () => ({ fetchChannelOverviewWithCode: mocks.overview, fetchStoreSlugStatus: mocks.slug }));
vi.mock('../../../../api/assetSnapshot', () => ({ storeAssetControlApi: { list: mocks.assets }, assetSnapshotApi: { list: mocks.snapshots } }));
vi.mock('../../../../api/storeExecutionAssets', () => ({ getStoreExecutionAssets: mocks.direct }));
vi.mock('../../../../api/tabletDisplays', () => ({ fetchProductPool: mocks.pool, fetchTabletDisplays: mocks.displays, fetchTabletIdlePlaylist: mocks.idle }));
import { loadChannelWorkspace, loadIdleLibraryAssets, loadTabletWorkspace } from '../storeWorkspaceLoaders';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.overview.mockResolvedValue({ channels: [], organizationCode: null });
  mocks.assets.mockResolvedValue({ success: true, data: { items: [] } }); mocks.slug.mockResolvedValue({ canChange: false });
  mocks.pool.mockResolvedValue({ localProducts: [] }); mocks.displays.mockResolvedValue([]); mocks.idle.mockResolvedValue([]);
  mocks.direct.mockResolvedValue({ success: true, data: { items: [] } }); mocks.snapshots.mockResolvedValue({ success: true, data: { items: [] } });
});
it('channel source failure is propagated and retry returns a confirmed empty overview', async () => {
  mocks.assets.mockRejectedValueOnce(new Error('assets offline'));
  await expect(loadChannelWorkspace()).rejects.toThrow('assets offline');
  await expect(loadChannelWorkspace()).resolves.toMatchObject({ assets: [], overview: { channels: [] } });
});
it('an unavailable idle playlist never becomes an editable empty playlist', async () => {
  mocks.idle.mockRejectedValueOnce(new Error('idle offline'));
  await expect(loadTabletWorkspace('tablet')).rejects.toThrow('idle offline');
  await expect(loadTabletWorkspace('tablet')).resolves.toMatchObject({ idle: [] });
});
it('both media library sources must load before presenting an empty library', async () => {
  mocks.snapshots.mockRejectedValueOnce(new Error('snapshots offline'));
  await expect(loadIdleLibraryAssets()).rejects.toThrow('snapshots offline');
  mocks.direct.mockResolvedValueOnce({ success: false });
  await expect(loadIdleLibraryAssets()).rejects.toThrow('자료함');
  await expect(loadIdleLibraryAssets()).resolves.toEqual([]);
});

it('product management does not depend on unused settings or asset sources', async () => {
  mocks.assets.mockRejectedValue(new Error('settings-only assets offline'));
  mocks.slug.mockRejectedValue(new Error('slug offline'));
  await expect(loadChannelWorkspace(false)).resolves.toMatchObject({ overview: { channels: [] }, assets: null, slug: null });
  expect(mocks.assets).not.toHaveBeenCalled();
  expect(mocks.slug).not.toHaveBeenCalled();
});
