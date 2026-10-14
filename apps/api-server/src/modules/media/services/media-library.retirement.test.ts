import { MediaLibraryService } from './media-library.service.js';
const repo = { findOne: jest.fn(), save: jest.fn() };
const service = new MediaLibraryService({ getRepository: () => repo } as any);
beforeEach(() => { jest.clearAllMocks(); repo.findOne.mockResolvedValue({ serviceKey: 'pharmacy-hub' }); });
it('does not expose a PH asset through UUID lookup', async () => {
  expect(await service.getById('asset')).toBeNull();
});
it.each(['getUsage', 'moveToFolder', 'updateMetadata'] as const)('%s rejects PH assets before writes', async method => {
  const args = method === 'moveToFolder' ? 'folder' : {};
  await expect((service[method] as any)('asset', args)).rejects.toMatchObject({ code: 'SERVICE_RETIRED' });
  expect(repo.save).not.toHaveBeenCalled();
});
it('preserves current service assets', async () => {
  const asset = { serviceKey: 'neture' }; repo.findOne.mockResolvedValue(asset);
  expect(await service.getById('asset')).toBe(asset);
});
