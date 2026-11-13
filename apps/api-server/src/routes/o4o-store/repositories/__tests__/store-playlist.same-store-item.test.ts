jest.mock('@o4o/asset-copy-core', () => ({ AssetCopyService: jest.fn() }), { virtual: true });
import { StorePlaylistRepository } from '../store-playlist.repository.js';

const PLAYLIST = '11111111-1111-4111-8111-111111111111';
const SNAPSHOT = '22222222-2222-4222-8222-222222222222';

function repository(sameStore: boolean) {
  const manager = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM store_playlists WHERE id = $1 FOR UPDATE')) return [{ id: PLAYLIST, playlist_type: 'MULTI', client_request_id: null }];
      if (sql.includes('FROM o4o_asset_snapshots s JOIN store_playlists p')) return sameStore ? [{ '?column?': 1 }] : [];
      if (sql.includes('MAX(display_order)')) return [{ next_order: 0 }];
      if (sql.includes('INSERT INTO store_playlist_items')) return [{ id: 'item', snapshotId: SNAPSHOT, displayOrder: 0 }];
      return [];
    }),
  };
  const dataSource = {
    getRepository: () => ({}),
    transaction: (fn: (m: typeof manager) => unknown) => fn(manager),
    query: jest.fn().mockResolvedValue([]),
  };
  return { repo: new StorePlaylistRepository(dataSource as never), manager, dataSource };
}

describe('store playlist items stay within the playlist store', () => {
  it('adds a snapshot owned by the same store', async () => {
    const { repo, manager } = repository(true);
    await expect(repo.addItem(PLAYLIST, SNAPSHOT)).resolves.toMatchObject({ id: 'item' });
    expect(manager.query.mock.calls.some(([sql]) => String(sql).startsWith('INSERT INTO store_playlist_items'))).toBe(true);
  });

  it('refuses a snapshot from another store before inserting anything', async () => {
    const { repo, manager } = repository(false);
    await expect(repo.addItem(PLAYLIST, SNAPSHOT)).rejects.toMatchObject({ statusCode: 404, code: 'SNAPSHOT_NOT_FOUND' });
    expect(manager.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO store_playlist_items'))).toBe(false);
  });

  it('joins public playlist items only to snapshots of the playlist store', async () => {
    const { repo, dataSource } = repository(true);
    await repo.findPublicPlaylistItems(PLAYLIST);
    await repo.findPublicPlaylistItems(PLAYLIST, 'kpa');
    for (const [sql] of dataSource.query.mock.calls) {
      expect(sql).toContain('JOIN store_playlists pl ON pl.id = i.playlist_id');
      expect(sql).toContain('s.organization_id = pl.organization_id');
    }
  });
});
