import { MediaCatalogService } from './media-catalog.service.js';

describe('retired service media links', () => {
  it.each(['pharmacy-hub', ' pharmacy-hub ', 'pharmacy-hub-event-offer', 'pharmacy-hub:admin'])('rejects %s before starting a database transaction', async (entityId) => {
    const transaction = jest.fn();
    const service = new MediaCatalogService({ transaction } as any);
    await expect(service.saveLink('asset', { entityType: 'service', entityId, purpose: 'display' }))
      .rejects.toMatchObject({ code: 'SERVICE_RETIRED', status: 410 });
    expect(transaction).not.toHaveBeenCalled();
  });
});

it('rejects loaded PH assets before opaque-ID catalog mutations', async () => {
  const findOne = jest.fn().mockResolvedValue({ serviceKey: 'pharmacy-hub' });
  const manager = { getRepository: () => ({ findOne }) };
  const service = new MediaCatalogService({} as any);
  await expect(service.locked(manager as any, '11111111-2222-4333-8444-555555555555'))
    .rejects.toMatchObject({ code: 'SERVICE_RETIRED', status: 410 });
});
