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
