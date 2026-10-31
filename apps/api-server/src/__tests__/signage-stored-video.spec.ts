import 'reflect-metadata';
import { SignageMediaService } from '../routes/signage/services/media.service.js';
import { MediaAsset } from '../modules/media/entities/MediaAsset.entity.js';
jest.mock('@o4o-apps/digital-signage-core/entities', () => ({ SignageMedia: class {} }), { virtual: true });
const source = { createMedia: jest.fn(), findMediaById: jest.fn(), updateMedia: jest.fn() };
jest.mock('../routes/signage/repositories/media.repository.js', () => ({ SignageMediaRepository: jest.fn().mockImplementation(() => source) }));
const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const scope = { serviceKey: 'neture', organizationId: 'store-one' };
function fixture() {
  const file = { id, url: 'https://storage.test/kept.mp4', gcsPath: 'media/kept.mp4', assetType: 'video', mimeType: 'video/mp4', originalName: 'Video', fileSize: 2048, uploadedBy: 'owner', isLibraryPublic: false, consentedAt: new Date(), status: 'active' };
  const qb: any = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) };
  const repo = { createQueryBuilder: jest.fn().mockReturnValue(qb), create: jest.fn(x => x), save: jest.fn(x => Promise.resolve({ ...x, id: 'registered' })) };
  const assetRepo = { findOne: jest.fn().mockResolvedValue(file) };
  const manager = { getRepository: (entity: unknown) => entity === MediaAsset ? assetRepo : repo };
  const ds = { transaction: jest.fn(fn => fn(manager)) } as any;
  return { service: new SignageMediaService(ds), file, qb, repo, assetRepo };
}
beforeEach(() => jest.clearAllMocks());
it('derives the stored URL from the asset, prevents spoofing and reuses the same registration on retry', async () => {
  const { service, file, repo, qb } = fixture();
  const dto = { mediaType: 'video', sourceType: 'url', mediaLibraryAssetId: id, sourceUrl: 'https://evil.test/spoof', name: 'Pharmacy' } as any;
  const result = await service.createMedia(dto, scope, 'owner');
  expect(result).toMatchObject({ sourceUrl: file.url, sourceType: 'url', mediaType: 'video' });
  expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: { mediaLibraryAssetId: id } }));
  expect(qb.where).toHaveBeenCalledWith(expect.any(String), scope);
  qb.getOne.mockResolvedValue({ ...repo.create.mock.results[0].value, id: 'registered' });
  await expect(service.createMedia(dto, scope, 'owner')).resolves.toMatchObject({ id: 'registered' }); expect(repo.save).toHaveBeenCalledTimes(1);
});
it.each([undefined, 'not-uuid'])('requires a selected library asset and a store actor: %s', async assetId => {
  const { service, assetRepo } = fixture();
  await expect(service.createMedia({ mediaType: 'video', sourceType: 'url', mediaLibraryAssetId: assetId } as any, scope, 'owner')).rejects.toMatchObject({ statusCode: 400 }); expect(assetRepo.findOne).not.toHaveBeenCalled();
});
it.each(['https://youtube.com/channel/abc', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'https://youtu.be/short'])('rejects a channel or spoofed video URL: %s', async url => {
  await expect(fixture().service.createMedia({ mediaType: 'video', sourceType: 'youtube', sourceUrl: url, tags: ['video'] } as any, scope, 'owner')).rejects.toMatchObject({ code: 'UNSUPPORTED_VIDEO_SOURCE' }); expect(source.createMedia).not.toHaveBeenCalled();
});
it('canonicalizes a hosted video and strips forged library provenance', async () => {
  source.createMedia.mockImplementation(async value => value);
  await fixture().service.createMedia({ mediaType: 'video', sourceType: 'youtube', sourceUrl: 'https://youtu.be/abcdefghijk', tags: ['video'], metadata: { mediaLibraryAssetId: id } } as any, scope, 'owner');
  expect(source.createMedia).toHaveBeenCalledWith(expect.objectContaining({ sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk', embedId: 'abcdefghijk', metadata: { mediaLibraryAssetId: null } }));
});
it('preserves library provenance and prevents file URL or kind replacement in the normal editor', async () => {
  const { service, file } = fixture(); source.findMediaById.mockResolvedValue({ mediaType: 'video', sourceType: 'url', sourceUrl: file.url, metadata: { mediaLibraryAssetId: id } });
  await expect(service.updateMedia('registered', { sourceUrl: 'https://evil.test/change' }, scope)).rejects.toMatchObject({ statusCode: 400 });
  await expect(service.updateMedia('registered', { mediaType: 'image' } as any, scope)).rejects.toMatchObject({ statusCode: 400 });
  source.updateMedia.mockImplementation(async (_id, value) => value);
  await service.updateMedia('registered', { name: 'Changed title', metadata: { mediaLibraryAssetId: null } } as any, scope);
  expect(source.updateMedia).toHaveBeenCalledWith('registered', expect.objectContaining({ metadata: { mediaLibraryAssetId: id } }), scope);
});
it('keeps image editing supported', async () => {
  source.findMediaById.mockResolvedValue({ mediaType: 'image', sourceType: 'url', sourceUrl: '/old.png' }); source.updateMedia.mockImplementation(async (_id, value) => value);
  await expect(fixture().service.updateMedia('image', { sourceUrl: '/new.png' }, scope)).resolves.toMatchObject({ sourceUrl: '/new.png' });
});
