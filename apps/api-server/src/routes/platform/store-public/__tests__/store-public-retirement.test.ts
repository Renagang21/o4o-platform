const mockFindBySlug = jest.fn();
jest.mock('@o4o/platform-core/store-identity', () => ({ StoreSlugService: jest.fn().mockImplementation(() => ({ findBySlug: mockFindBySlug })) }));
import { resolvePublicStore } from '../store-public-utils.js';
it.each(['pharmacy-hub', ' pharmacy-hub ', 'pharmacy-hub-event-offer'])('blocks opaque slug scope %s before reading store data', async serviceKey => {
 mockFindBySlug.mockResolvedValue({ serviceKey, storeId: 'store', isActive: true });
 const getRepository = jest.fn();
 const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
 expect(await resolvePublicStore({ getRepository } as any, 'opaque', {} as any, res)).toBeNull();
 expect(res.status).toHaveBeenCalledWith(410);
 expect(getRepository).not.toHaveBeenCalled();
});
