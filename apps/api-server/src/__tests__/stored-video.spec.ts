import 'reflect-metadata';
import { lockScreenSetVideos, lockStoredVideo } from '../modules/media/services/stored-video.js';
const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const asset = { id, url: 'https://storage.test/video.mp4', gcsPath: 'media/video.mp4', assetType: 'video', mimeType: 'video/mp4', status: 'active', uploadedBy: 'owner', isLibraryPublic: false, consentedAt: new Date(), serviceKey: 'neture' };
function fixture(value: unknown = asset) {
  const findOne = jest.fn().mockResolvedValue(value);
  return { manager: { getRepository: jest.fn().mockReturnValue({ findOne }) } as any, findOne };
}
it('locks a managed video with the existing deletion row lock', async () => {
  const { manager, findOne } = fixture(); await expect(lockStoredVideo(manager, id, 'owner')).resolves.toEqual(asset);
  expect(findOne).toHaveBeenCalledWith({ where: { id }, lock: { mode: 'pessimistic_write' } });
});
it.each([null, { ...asset, gcsPath: null }, { ...asset, assetType: 'image' }, { ...asset, mimeType: 'text/html' }, { ...asset, status: 'archived' }, { ...asset, uploadedBy: 'other' }, { ...asset, uploadedBy: 'other', isLibraryPublic: true, consentedAt: null }])('rejects missing, invalid or inaccessible files: %j', async value => {
  await expect(lockStoredVideo(fixture(value).manager, id, 'owner')).rejects.toMatchObject({ code: 'MEDIA_LIBRARY_VIDEO_UNAVAILABLE', statusCode: 400 });
});
it('allows a consented public video and rejects arbitrary IDs before DB access', async () => {
  const { manager, findOne } = fixture({ ...asset, uploadedBy: 'other', isLibraryPublic: true });
  await expect(lockStoredVideo(manager, id, 'owner')).resolves.toMatchObject({ id });
  findOne.mockClear(); await expect(lockStoredVideo(manager, 'bad', 'owner')).rejects.toThrow(); expect(findOne).not.toHaveBeenCalled();
});
it('checks exact server asset URL for tablet references and deduplicates row locks', async () => {
  const { manager, findOne } = fixture();
  await lockScreenSetVideos(manager, [{ blockType: 'idle_media', config: { items: [{ mediaAssetId: id, url: asset.url }, { mediaAssetId: id, url: asset.url }] } }], 'owner');
  expect(findOne).toHaveBeenCalledTimes(1);
  await expect(lockScreenSetVideos(manager, [{ blockType: 'idle_media', config: { items: [{ mediaAssetId: id, url: 'https://evil.test/changed.mp4' }] } }], 'owner')).rejects.toMatchObject({ code: 'MEDIA_LIBRARY_VIDEO_UNAVAILABLE' });
});
it('does not reinterpret legacy hosted video URLs as managed files', async () => {
  const { manager, findOne } = fixture();
  await lockScreenSetVideos(manager, [{ blockType: 'idle_media', config: { items: [{ type: 'youtube', url: 'https://youtu.be/abcdefghijk' }] } }], 'owner'); expect(findOne).not.toHaveBeenCalled();
});
