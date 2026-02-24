import { DataSource, Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import {
  SignagePlaylist,
  SignagePlaylistItem,
  SignageMedia,
  SignageSchedule,
  SignageTemplate,
  SignageTemplateZone,
  SignageContentBlock,
  SignageLayoutPreset,
  SignageAiGenerationLog,
} from '@o4o-apps/digital-signage-core/entities';
import type {
  PlaylistQueryDto,
  MediaQueryDto,
  ScheduleQueryDto,
  TemplateQueryDto,
  ContentBlockQueryDto,
  LayoutPresetQueryDto,
  ScopeFilter,
  GlobalContentQueryDto,
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
  private templateRepo: Repository<SignageTemplate>;
  private templateZoneRepo: Repository<SignageTemplateZone>;
  private contentBlockRepo: Repository<SignageContentBlock>;
  private layoutPresetRepo: Repository<SignageLayoutPreset>;
  private aiGenerationLogRepo: Repository<SignageAiGenerationLog>;

  constructor(private dataSource: DataSource) {
    this.playlistRepo = dataSource.getRepository(SignagePlaylist);
    this.playlistItemRepo = dataSource.getRepository(SignagePlaylistItem);
    this.mediaRepo = dataSource.getRepository(SignageMedia);
    this.scheduleRepo = dataSource.getRepository(SignageSchedule);
    this.templateRepo = dataSource.getRepository(SignageTemplate);
    this.templateZoneRepo = dataSource.getRepository(SignageTemplateZone);
    this.contentBlockRepo = dataSource.getRepository(SignageContentBlock);
    this.layoutPresetRepo = dataSource.getRepository(SignageLayoutPreset);
    this.aiGenerationLogRepo = dataSource.getRepository(SignageAiGenerationLog);
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
        // Only update items that belong to the verified playlist (defense-in-depth)
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

  /**
   * Find schedules for calendar view within date range
   */
  async findSchedulesForCalendar(
    scope: ScopeFilter,
    startDate: Date,
    endDate: Date,
    channelId?: string,
  ): Promise<SignageSchedule[]> {
    const qb = this.scheduleRepo.createQueryBuilder('schedule');

    qb.where('schedule.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('schedule.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('schedule.deletedAt IS NULL');
    qb.andWhere('schedule.isActive = true');

    if (channelId) {
      qb.andWhere('(schedule.channelId = :channelId OR schedule.channelId IS NULL)', {
        channelId,
      });
    }

    // Date range overlap
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);
    qb.andWhere('(schedule.validFrom IS NULL OR schedule.validFrom <= :endDate)', { endDate: endStr });
    qb.andWhere('(schedule.validUntil IS NULL OR schedule.validUntil >= :startDate)', { startDate: startStr });

    qb.orderBy('schedule.priority', 'DESC');
    qb.leftJoinAndSelect('schedule.playlist', 'playlist');

    return qb.getMany();
  }

  // ========== Template Methods ==========

  async findTemplateById(id: string, scope: ScopeFilter): Promise<SignageTemplate | null> {
    return this.templateRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      relations: ['zones'],
    });
  }

  async findTemplates(
    query: TemplateQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageTemplate[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.templateRepo.createQueryBuilder('template');

    qb.where('template.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('(template.organizationId = :organizationId OR template.isPublic = true)', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('template.deletedAt IS NULL');

    if (query.status) {
      qb.andWhere('template.status = :status', { status: query.status });
    }
    if (query.isPublic !== undefined) {
      qb.andWhere('template.isPublic = :isPublic', { isPublic: query.isPublic });
    }
    if (query.isSystem !== undefined) {
      qb.andWhere('template.isSystem = :isSystem', { isSystem: query.isSystem });
    }
    if (query.category) {
      qb.andWhere('template.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('(template.name ILIKE :search OR template.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`template.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createTemplate(data: Partial<SignageTemplate>): Promise<SignageTemplate> {
    const template = this.templateRepo.create(data);
    return this.templateRepo.save(template);
  }

  async updateTemplate(
    id: string,
    data: Partial<SignageTemplate>,
    scope: ScopeFilter,
  ): Promise<SignageTemplate | null> {
    const template = await this.findTemplateById(id, scope);
    if (!template) return null;

    Object.assign(template, data);
    return this.templateRepo.save(template);
  }

  async softDeleteTemplate(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.templateRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  // ========== Template Zone Methods ==========

  async findTemplateZones(templateId: string): Promise<SignageTemplateZone[]> {
    return this.templateZoneRepo.find({
      where: { templateId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findTemplateZoneById(id: string): Promise<SignageTemplateZone | null> {
    return this.templateZoneRepo.findOne({ where: { id } });
  }

  async createTemplateZone(data: Partial<SignageTemplateZone>): Promise<SignageTemplateZone> {
    const zone = this.templateZoneRepo.create(data);
    return this.templateZoneRepo.save(zone);
  }

  async updateTemplateZone(
    id: string,
    data: Partial<SignageTemplateZone>,
  ): Promise<SignageTemplateZone | null> {
    const zone = await this.templateZoneRepo.findOne({ where: { id } });
    if (!zone) return null;

    Object.assign(zone, data);
    return this.templateZoneRepo.save(zone);
  }

  async deleteTemplateZone(id: string): Promise<boolean> {
    const result = await this.templateZoneRepo.delete(id);
    return (result.affected || 0) > 0;
  }

  async getMaxZoneSortOrder(templateId: string): Promise<number> {
    const result = await this.templateZoneRepo
      .createQueryBuilder('zone')
      .select('MAX(zone.sortOrder)', 'max')
      .where('zone.templateId = :templateId', { templateId })
      .getRawOne();
    return result?.max || 0;
  }

  // ========== Content Block Methods ==========

  async findContentBlockById(id: string, scope: ScopeFilter): Promise<SignageContentBlock | null> {
    return this.contentBlockRepo.findOne({
      where: {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
    });
  }

  async findContentBlocks(
    query: ContentBlockQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageContentBlock[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.contentBlockRepo.createQueryBuilder('block');

    qb.where('block.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    if (scope.organizationId) {
      qb.andWhere('block.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
    }

    qb.andWhere('block.deletedAt IS NULL');

    if (query.blockType) {
      qb.andWhere('block.blockType = :blockType', { blockType: query.blockType });
    }
    if (query.status) {
      qb.andWhere('block.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('block.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('(block.name ILIKE :search OR block.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`block.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createContentBlock(data: Partial<SignageContentBlock>): Promise<SignageContentBlock> {
    const block = this.contentBlockRepo.create(data);
    return this.contentBlockRepo.save(block);
  }

  async updateContentBlock(
    id: string,
    data: Partial<SignageContentBlock>,
    scope: ScopeFilter,
  ): Promise<SignageContentBlock | null> {
    const block = await this.findContentBlockById(id, scope);
    if (!block) return null;

    Object.assign(block, data);
    return this.contentBlockRepo.save(block);
  }

  async softDeleteContentBlock(id: string, scope: ScopeFilter): Promise<boolean> {
    const result = await this.contentBlockRepo.update(
      {
        id,
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      { deletedAt: new Date() },
    );
    return (result.affected || 0) > 0;
  }

  // ========== Layout Preset Methods ==========

  async findLayoutPresetById(id: string, serviceKey?: string): Promise<SignageLayoutPreset | null> {
    return this.layoutPresetRepo.findOne({
      where: {
        id,
        ...(serviceKey && { serviceKey }),
      },
    });
  }

  async findLayoutPresets(
    query: LayoutPresetQueryDto,
    serviceKey?: string,
  ): Promise<{ data: SignageLayoutPreset[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.layoutPresetRepo.createQueryBuilder('preset');

    // Platform-wide or service-specific
    if (serviceKey) {
      qb.where('(preset.serviceKey = :serviceKey OR preset.serviceKey IS NULL)', { serviceKey });
    }

    qb.andWhere('preset.deletedAt IS NULL');

    if (query.isSystem !== undefined) {
      qb.andWhere('preset.isSystem = :isSystem', { isSystem: query.isSystem });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('preset.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.category) {
      qb.andWhere('preset.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('(preset.name ILIKE :search OR preset.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const sortBy = query.sortBy || 'sortOrder';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`preset.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createLayoutPreset(data: Partial<SignageLayoutPreset>): Promise<SignageLayoutPreset> {
    const preset = this.layoutPresetRepo.create(data);
    return this.layoutPresetRepo.save(preset);
  }

  async updateLayoutPreset(
    id: string,
    data: Partial<SignageLayoutPreset>,
  ): Promise<SignageLayoutPreset | null> {
    const preset = await this.layoutPresetRepo.findOne({ where: { id } });
    if (!preset) return null;

    Object.assign(preset, data);
    return this.layoutPresetRepo.save(preset);
  }

  async softDeleteLayoutPreset(id: string): Promise<boolean> {
    const result = await this.layoutPresetRepo.update(id, { deletedAt: new Date() });
    return (result.affected || 0) > 0;
  }

  // ========== AI Generation Log Methods ==========

  async createAiGenerationLog(data: Partial<SignageAiGenerationLog>): Promise<SignageAiGenerationLog> {
    const log = this.aiGenerationLogRepo.create(data);
    return this.aiGenerationLogRepo.save(log);
  }

  async findAiGenerationLogs(
    scope: ScopeFilter,
    limit: number = 20,
  ): Promise<SignageAiGenerationLog[]> {
    return this.aiGenerationLogRepo.find({
      where: {
        serviceKey: scope.serviceKey,
        ...(scope.organizationId && { organizationId: scope.organizationId }),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ========== Media Library Methods ==========

  async findMediaLibrary(
    scope: ScopeFilter,
    mediaType?: string,
    category?: string,
    search?: string,
    limit: number = 50,
  ): Promise<{
    platform: SignageMedia[];
    organization: SignageMedia[];
  }> {
    const baseQuery = (qb: any) => {
      qb.where('media.deletedAt IS NULL');
      qb.andWhere('media.status = :status', { status: 'active' });
      if (mediaType) {
        qb.andWhere('media.mediaType = :mediaType', { mediaType });
      }
      if (category) {
        qb.andWhere('media.category = :category', { category });
      }
      if (search) {
        qb.andWhere('(media.name ILIKE :search OR media.description ILIKE :search)', {
          search: `%${search}%`,
        });
      }
      qb.orderBy('media.createdAt', 'DESC');
      qb.take(limit);
    };

    // Platform media (public, no organization)
    const platformQb = this.mediaRepo.createQueryBuilder('media');
    platformQb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
    platformQb.andWhere('media.organizationId IS NULL');
    baseQuery(platformQb);
    const platform = await platformQb.getMany();

    // Organization media
    let organization: SignageMedia[] = [];
    if (scope.organizationId) {
      const orgQb = this.mediaRepo.createQueryBuilder('media');
      orgQb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });
      orgQb.andWhere('media.organizationId = :organizationId', {
        organizationId: scope.organizationId,
      });
      baseQuery(orgQb);
      organization = await orgQb.getMany();
    }

    return { platform, organization };
  }

  // ========== Sprint 2-6: Global Content Methods ==========

  /**
   * Find global playlists (scope: 'global')
   */
  async findGlobalPlaylists(
    query: GlobalContentQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignagePlaylist[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.playlistRepo.createQueryBuilder('playlist');

    // Filter by serviceKey
    qb.where('playlist.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });

    // Only global scope content
    qb.andWhere("playlist.scope = 'global'");

    // Soft delete filter
    qb.andWhere('playlist.deletedAt IS NULL');

    // Source filter (hq, supplier, community)
    if (query.source) {
      qb.andWhere('playlist.source = :source', { source: query.source });
    } else {
      // Default: exclude store content from global listing
      qb.andWhere("playlist.source IN ('hq', 'supplier', 'community')");
    }

    // Search
    if (query.search) {
      qb.andWhere('(playlist.name ILIKE :search OR playlist.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    // Category filter
    if (query.category) {
      qb.andWhere("playlist.metadata->>'category' = :category", { category: query.category });
    }

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (sortBy === 'likeCount' || sortBy === 'downloadCount') {
      qb.orderBy(`playlist.${sortBy}`, sortOrder);
    } else {
      qb.orderBy(`playlist.${sortBy}`, sortOrder);
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Find global media (scope: 'global')
   */
  async findGlobalMedia(
    query: GlobalContentQueryDto,
    scope: ScopeFilter,
  ): Promise<{ data: SignageMedia[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.mediaRepo.createQueryBuilder('media');

    // Filter by serviceKey
    qb.where('media.serviceKey = :serviceKey', { serviceKey: scope.serviceKey });

    // Only global scope content
    qb.andWhere("media.scope = 'global'");

    // Soft delete filter
    qb.andWhere('media.deletedAt IS NULL');

    // Active status only
    qb.andWhere('media.status = :status', { status: 'active' });

    // Source filter
    if (query.source) {
      qb.andWhere('media.source = :source', { source: query.source });
    } else {
      // Default: exclude store content from global listing
      qb.andWhere("media.source IN ('hq', 'supplier', 'community')");
    }

    // Media type filter
    if (query.mediaType) {
      qb.andWhere('media.mediaType = :mediaType', { mediaType: query.mediaType });
    }

    // Category filter
    if (query.category) {
      qb.andWhere('media.category = :category', { category: query.category });
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      qb.andWhere('media.tags && :tags', { tags: query.tags });
    }

    // Search
    if (query.search) {
      qb.andWhere('(media.name ILIKE :search OR media.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`media.${sortBy}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Find playlist by ID without organization scope (for global content)
   */
  async findPlaylistByIdGlobal(id: string, serviceKey: string): Promise<SignagePlaylist | null> {
    return this.playlistRepo.findOne({
      where: {
        id,
        serviceKey,
      },
      relations: ['items', 'items.media'],
    });
  }

  /**
   * Find media by ID without organization scope (for global content)
   */
  async findMediaByIdGlobal(id: string, serviceKey: string): Promise<SignageMedia | null> {
    return this.mediaRepo.findOne({
      where: {
        id,
        serviceKey,
      },
    });
  }

  /**
   * Increment download count for a playlist (scoped by serviceKey for boundary safety)
   */
  async incrementPlaylistDownloadCount(playlistId: string, serviceKey: string): Promise<void> {
    await this.playlistRepo
      .createQueryBuilder()
      .update(SignagePlaylist)
      .set({ downloadCount: () => '"downloadCount" + 1' })
      .where('id = :id AND "serviceKey" = :serviceKey', { id: playlistId, serviceKey })
      .execute();
  }

  /**
   * Increment like count for a playlist (scoped by serviceKey for boundary safety)
   */
  async incrementPlaylistLikeCount(playlistId: string, serviceKey: string): Promise<void> {
    await this.playlistRepo
      .createQueryBuilder()
      .update(SignagePlaylist)
      .set({ likeCount: () => '"likeCount" + 1' })
      .where('id = :id AND "serviceKey" = :serviceKey', { id: playlistId, serviceKey })
      .execute();
  }
}
