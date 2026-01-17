import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import {
  SignagePlaylist,
  SignagePlaylistItem,
  SignageMedia,
  SignageSchedule,
} from '@o4o-apps/digital-signage-core/entities';
import type {
  PlaylistQueryDto,
  MediaQueryDto,
  ScheduleQueryDto,
  ScopeFilter,
} from '../dto/index.js';

/**
 * Signage Repository
 *
 * Data access layer for Signage Core entities.
 * Handles multi-tenant filtering and complex queries.
 */
export class SignageRepository {
  private playlistRepo: Repository<SignagePlaylist>;
  private playlistItemRepo: Repository<SignagePlaylistItem>;
  private mediaRepo: Repository<SignageMedia>;
  private scheduleRepo: Repository<SignageSchedule>;

  constructor(private dataSource: DataSource) {
    this.playlistRepo = dataSource.getRepository(SignagePlaylist);
    this.playlistItemRepo = dataSource.getRepository(SignagePlaylistItem);
    this.mediaRepo = dataSource.getRepository(SignageMedia);
    this.scheduleRepo = dataSource.getRepository(SignageSchedule);
  }

  // ========== Playlist Methods ==========

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

    // Scope filtering
    qb.where('playlist.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('playlist.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    // Soft delete filter
    qb.andWhere('playlist.deletedAt IS NULL');

    // Query filters
    if (query.status) {
      qb.andWhere('playlist.status = :status', { status: query.status });
    }
    if (query.isPublic !== undefined) {
      qb.andWhere('playlist.isPublic = :isPublic', { isPublic: query.isPublic });
    }
    if (query.search) {
      qb.andWhere('(playlist.name ILIKE :search OR playlist.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`playlist.${sortBy}`, sortOrder);

    // Pagination
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
        await manager.update(SignagePlaylistItem, item.id, { sortOrder: item.sortOrder });
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

  // ========== Media Methods ==========

  async findMediaById(id: string, scope: ScopeFilter): Promise<SignageMedia | null> {
    return this.mediaRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
    });
  }

  async findMedia(
    query: MediaQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageMedia[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.mediaRepo.createQueryBuilder('media');

    // Scope filtering
    qb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('media.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    // Soft delete filter
    qb.andWhere('media.deletedAt IS NULL');

    // Query filters
    if (query.mediaType) {
      qb.andWhere('media.mediaType = :mediaType', { mediaType: query.mediaType });
    }
    if (query.sourceType) {
      qb.andWhere('media.sourceType = :sourceType', { sourceType: query.sourceType });
    }
    if (query.status) {
      qb.andWhere('media.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('media.category = :category', { category: query.category });
    }
    if (query.tags && query.tags.length > 0) {
      qb.andWhere('media.tags && :tags', { tags: query.tags });
    }
    if (query.search) {
      qb.andWhere('(media.name ILIKE :search OR media.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`media.${sortBy}`, sortOrder);

    // Pagination
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createMedia(data: Partial<SignageMedia>): Promise<SignageMedia> {
    const media = this.mediaRepo.create(data);
    return this.mediaRepo.save(media);
  }

  async updateMedia(
    id: string,
    data: Partial<SignageMedia>,
    scope: ScopeFilter,
  ): Promise<SignageMedia | null> {
    const media = await this.findMediaById(id, scope);
    if (!media) return null;

    Object.assign(media, data);
    return this.mediaRepo.save(media);
  }

  async softDeleteMedia(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.mediaRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  // ========== Schedule Methods ==========

  async findScheduleById(id: string, scope: ScopeFilter): Promise<SignageSchedule | null> {
    return this.scheduleRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      relations: ['playlist'],
    });
  }

  async findSchedules(
    query: ScheduleQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageSchedule[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.scheduleRepo.createQueryBuilder('schedule');

    // Scope filtering
    qb.where('schedule.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('schedule.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    // Soft delete filter
    qb.andWhere('schedule.deletedAt IS NULL');

    // Query filters
    if (query.channelId) {
      qb.andWhere('schedule.channelId = :channelId', { channelId: query.channelId });
    }
    if (query.playlistId) {
      qb.andWhere('schedule.playlistId = :playlistId', { playlistId: query.playlistId });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('schedule.isActive = :isActive', { isActive: query.isActive });
    }

    // Sorting
    const sortBy = query.sortBy || 'priority';
    const sortOrder = sortBy === 'priority' ? 'DESC' : (query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
    qb.orderBy(`schedule.${sortBy}`, sortOrder);

    // Pagination
    qb.skip(skip).take(limit);

    // Join playlist
    qb.leftJoinAndSelect('schedule.playlist', 'playlist');

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createSchedule(data: Partial<SignageSchedule>): Promise<SignageSchedule> {
    const schedule = this.scheduleRepo.create(data);
    return this.scheduleRepo.save(schedule);
  }

  async updateSchedule(
    id: string,
    data: Partial<SignageSchedule>,
    scope: ScopeFilter,
  ): Promise<SignageSchedule | null> {
    const schedule = await this.findScheduleById(id, scope);
    if (!schedule) return null;

    Object.assign(schedule, data);
    return this.scheduleRepo.save(schedule);
  }

  async softDeleteSchedule(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.scheduleRepo.update(
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
   * Find active schedule for a given channel at a specific time
   */
  async findActiveSchedule(
    channelId: string | null,
    scope: ScopeFilter,
    currentTime: Date = new Date(),
  ): Promise<SignageSchedule | null> {
    const dayOfWeek = currentTime.getDay();
    const timeString = currentTime.toTimeString().slice(0, 8); // HH:MM:SS

    const qb = this.scheduleRepo.createQueryBuilder('schedule');

    qb.where('schedule.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('schedule.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('schedule.deletedAt IS NULL');
    qb.andWhere('schedule.isActive = true');

    // Channel filter (null matches all channels)
    if (channelId) {
      qb.andWhere('(schedule.channelId = :channelId OR schedule.channelId IS NULL)', {
        channelId,
      });
    }

    // Day of week filter
    qb.andWhere(':dayOfWeek = ANY(schedule.daysOfWeek)', { dayOfWeek });

    // Time range filter
    qb.andWhere('schedule.startTime <= :time', { time: timeString });
    qb.andWhere('schedule.endTime > :time', { time: timeString });

    // Date range filter
    const dateString = currentTime.toISOString().slice(0, 10);
    qb.andWhere('(schedule.validFrom IS NULL OR schedule.validFrom <= :date)', { date: dateString });
    qb.andWhere('(schedule.validUntil IS NULL OR schedule.validUntil >= :date)', { date: dateString });

    // Order by priority (highest first), then by specificity (channel-specific before global)
    qb.orderBy('schedule.priority', 'DESC');
    qb.addOrderBy('schedule.channelId', 'DESC', 'NULLS LAST');

    qb.leftJoinAndSelect('schedule.playlist', 'playlist');

    return qb.getOne();
  }
}
