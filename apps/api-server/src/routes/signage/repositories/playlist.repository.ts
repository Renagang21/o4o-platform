import { DataSource, Repository } from 'typeorm';
import {
  SignagePlaylist,
  SignagePlaylistItem,
} from '@o4o-apps/digital-signage-core/entities';
import type { PlaylistQueryDto, ScopeFilter } from '../dto/index.js';

export class SignagePlaylistRepository {
  private playlistRepo: Repository<SignagePlaylist>;
  private playlistItemRepo: Repository<SignagePlaylistItem>;

  constructor(private dataSource: DataSource) {
    this.playlistRepo = dataSource.getRepository(SignagePlaylist);
    this.playlistItemRepo = dataSource.getRepository(SignagePlaylistItem);
  }

  async findPlaylistById(id: string, scope: ScopeFilter): Promise<SignagePlaylist | null> {
    return this.playlistRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      relations: ['items', 'items.media'],
    });
  }

  async findPlaylists(
    query: PlaylistQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignagePlaylist[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.playlistRepo.createQueryBuilder('playlist');

    qb.where('playlist.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('playlist.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('playlist.deletedAt IS NULL');

    if (query.status) {
      qb.andWhere('playlist.status = :status', { status: query.status });
    }
    if (query.isPublic !== undefined) {
      qb.andWhere('playlist.isPublic = :isPublic', { isPublic: query.isPublic });
    }
    if (query.search) {
      qb.andWhere('(playlist.name ILIKE :search OR playlist.description ILIKE :search OR playlist.tags::text ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.tags && query.tags.length > 0) {
      qb.andWhere('playlist.tags && :tags', { tags: query.tags });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`playlist.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createPlaylist(data: Partial<SignagePlaylist>): Promise<SignagePlaylist> {
    const playlist = this.playlistRepo.create(data);
    return this.playlistRepo.save(playlist);
  }

  async updatePlaylist(
    id: string,
    data: Partial<SignagePlaylist>,
    scope: ScopeFilter,
  ): Promise<SignagePlaylist | null> {
    const playlist = await this.findPlaylistById(id, scope);
    if (!playlist) return null;

    Object.assign(playlist, data);
    return this.playlistRepo.save(playlist);
  }

  async softDeletePlaylist(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.playlistRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  /**
   * Hard delete playlist — WO-KPA-SOCIETY-OPERATOR-SIGNAGE-CONTENT-HARD-DELETE-POLICY-V1
   *
   * Cascade (auto by FK):
   *   signage_playlist_items  (onDelete: CASCADE)
   *   signage_playlist_shares (onDelete: CASCADE)
   *   signage_schedules       (onDelete: CASCADE)
   *
   * Manual cleanup before delete:
   *   o4o_asset_snapshots.source_asset_id — no FK constraint, orphan-safe cleanup
   *
   * Not cleaned (acceptable orphans):
   *   signage_analytics.entityId — loose reference, historical data retention
   */
  async hardDeletePlaylist(
    id: string,
    scope: ScopeFilter,
  ): Promise<{ deleted: boolean; code?: string }> {
    const playlist = await this.playlistRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      withDeleted: true,
    });
    if (!playlist) return { deleted: false, code: 'PLAYLIST_NOT_FOUND' };

    // Clean up orphan asset snapshots (no FK — must be manual)
    await this.dataSource.query(
      `DELETE FROM o4o_asset_snapshots WHERE source_asset_id = $1`,
      [id],
    );

    // Physical delete — playlist_items, shares, schedules cascade automatically
    await this.playlistRepo.delete({ id });

    return { deleted: true };
  }

  // ========== Playlist Item Methods ==========

  async findPlaylistItems(playlistId: string): Promise<SignagePlaylistItem[]> {
    return this.playlistItemRepo.find({
      where: { playlistId },
      relations: ['media'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findPlaylistItemById(id: string): Promise<SignagePlaylistItem | null> {
    return this.playlistItemRepo.findOne({
      where: { id },
      relations: ['media'],
    });
  }

  async createPlaylistItem(data: Partial<SignagePlaylistItem>): Promise<SignagePlaylistItem> {
    const item = this.playlistItemRepo.create(data);
    return this.playlistItemRepo.save(item);
  }

  async createPlaylistItemsBulk(items: Partial<SignagePlaylistItem>[]): Promise<SignagePlaylistItem[]> {
    const entities = items.map(data => this.playlistItemRepo.create(data));
    return this.playlistItemRepo.save(entities);
  }

  async updatePlaylistItem(
    id: string,
    data: Partial<SignagePlaylistItem>,
  ): Promise<SignagePlaylistItem | null> {
    const item = await this.playlistItemRepo.findOne({ where: { id } });
    if (!item) return null;

    Object.assign(item, data);
    return this.playlistItemRepo.save(item);
  }

  async deletePlaylistItem(id: string): Promise<boolean> {
    const result = await this.playlistItemRepo.delete(id);
    return (result.affected || 0) > 0;
  }

  async reorderPlaylistItems(
    playlistId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    await this.dataSource.transaction(async manager => {
      for (const item of items) {
        await manager
          .createQueryBuilder()
          .update(SignagePlaylistItem)
          .set({ sortOrder: item.sortOrder })
          .where('id = :id AND playlistId = :playlistId', { id: item.id, playlistId })
          .execute();
      }
    });
  }

  async getMaxSortOrder(playlistId: string): Promise<number> {
    const result = await this.playlistItemRepo
      .createQueryBuilder('item')
      .select('MAX(item.sortOrder)', 'max')
      .where('item.playlistId = :playlistId', { playlistId })
      .getRawOne();
    return result?.max || 0;
  }

  async updatePlaylistStats(playlistId: string): Promise<void> {
    const items = await this.playlistItemRepo.find({
      where: { playlistId, isActive: true },
      relations: ['media'],
    });

    const itemCount = items.length;
    let totalDuration = 0;

    for (const item of items) {
      const duration = item.duration || item.media?.duration || 10;
      totalDuration += duration;
    }

    await this.playlistRepo.update(playlistId, { itemCount, totalDuration });
  }
}
