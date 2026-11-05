import express from 'express';
import request from 'supertest';
import { createStorePlaylistController } from '../store-playlist.controller';
import { resolveStoreAccess } from '../../../../utils/store-owner.utils';
import { StorePlaylistRepository } from '../../repositories/store-playlist.repository';
jest.mock('../../../../utils/store-owner.utils', () => ({ resolveStoreAccess: jest.fn() }));
jest.mock('../../repositories/store-playlist.repository', () => ({ StorePlaylistRepository: jest.fn() }));
const resolve = jest.mocked(resolveStoreAccess);
let repository: any;
beforeEach(() => {
  jest.clearAllMocks(); resolve.mockResolvedValue('owned-store');
  repository = { verifyOwnership: jest.fn().mockResolvedValue(true), addItemFromSignage: jest.fn().mockResolvedValue({ id: 'item' }), findPlaylistsByOrganization: jest.fn().mockResolvedValue([]) };
  jest.mocked(StorePlaylistRepository).mockImplementation(() => repository);
});
function app() { const a = express(); a.use(express.json()); a.use(createStorePlaylistController({} as any, ((req, _res, next) => { (req as any).user = { id: 'owner', roles: [] }; next(); }) as any, 'kpa-society', 'kpa')); return a; }
it('rejects a foreign media organization before reading/copying its media', async () => {
  const res = await request(app()).post('/playlist/items/from-signage').send({ mediaId: 'video', organizationId: 'foreign-store' });
  expect(res.status).toBe(403); expect(res.body.error.code).toBe('STORE_SELECTION_ACCESS_REQUIRED');
  expect(repository.addItemFromSignage).not.toHaveBeenCalled();
});
it('always passes the server-authorized store to media copy, with or without a matching body hint', async () => {
  for (const organizationId of [undefined, 'owned-store']) {
    expect((await request(app()).post('/playlist/items/from-signage').send({ mediaId: 'video', organizationId })).status).toBe(201);
    expect(repository.addItemFromSignage).toHaveBeenLastCalledWith('playlist', 'video', 'owned-store', 'owner');
  }
});
it('does not disguise denied list access as a successful empty catalog', async () => {
  resolve.mockResolvedValue(null);
  const res = await request(app()).get('/');
  expect(res.status).toBe(403); expect(res.body.success).toBe(false);
  expect(repository.findPlaylistsByOrganization).not.toHaveBeenCalled();
});

it.each(['', '   ', 'x'.repeat(256), 123, null])('rejects invalid playlist names before persistence: %s', async name => {
  repository.updatePlaylist = jest.fn(); repository.createPlaylist = jest.fn();
  const a = app();
  expect((await request(a).post('/').send({ name })).status).toBe(400);
  expect((await request(a).patch('/playlist').send({ name })).status).toBe(400);
  expect(repository.updatePlaylist).not.toHaveBeenCalled();
  expect(repository.createPlaylist).not.toHaveBeenCalled();
});
