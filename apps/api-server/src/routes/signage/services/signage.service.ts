import type { DataSource } from 'typeorm';
import type {
  SignagePlaylist,
  SignagePlaylistItem,
  SignageMedia,
  SignageSchedule,
  SignageTemplate,
  SignageTemplateZone,
  SignageContentBlock,
  SignageLayoutPreset,
} from '@o4o-apps/digital-signage-core/entities';
import { SignageRepository } from '../repositories/signage.repository.js';
import type {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  PlaylistQueryDto,
  PlaylistResponseDto,
  PlaylistDetailResponseDto,
  PlaylistItemResponseDto,
  CreatePlaylistItemDto,
  UpdatePlaylistItemDto,
  ReorderPlaylistItemsDto,
  BulkCreatePlaylistItemsDto,
  CreateMediaDto,
  UpdateMediaDto,
  MediaQueryDto,
  MediaResponseDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleQueryDto,
  ScheduleResponseDto,
  ScopeFilter,
  PaginatedResponse,
  ActiveContentResponseDto,
  // Sprint 2-3 DTOs
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  TemplateResponseDto,
  TemplateDetailResponseDto,
  CreateTemplateZoneDto,
  UpdateTemplateZoneDto,
  TemplateZoneResponseDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
  ContentBlockQueryDto,
  ContentBlockResponseDto,
  CreateLayoutPresetDto,
  UpdateLayoutPresetDto,
  LayoutPresetQueryDto,
  LayoutPresetResponseDto,
  MediaLibraryResponseDto,
  ScheduleCalendarQueryDto,
  ScheduleCalendarResponseDto,
  ScheduleCalendarEventDto,
  AiGenerateRequestDto,
  AiGenerateResponseDto,
  TemplatePreviewDto,
  TemplatePreviewResponseDto,
  PresignedUploadRequestDto,
  PresignedUploadResponseDto,
  // Sprint 2-6 DTOs
  GlobalContentQueryDto,
  GlobalPlaylistResponseDto,
  GlobalMediaResponseDto,
  CreateGlobalPlaylistDto,
  CreateGlobalMediaDto,
  UpdateGlobalPlaylistDto,
  UpdateGlobalMediaDto,
  ContentSource,
  ContentScope,
} from '../dto/index.js';

/**
 * Signage Service
 *
 * Business logic layer for Signage Core APIs.
 * Handles validation, transformation, and orchestration.
 */
export class SignageService {
  private repository: SignageRepository;

  constructor(dataSource: DataSource) {
    this.repository = new SignageRepository(dataSource);
  }

  // ========== Playlist Methods ==========

  async getPlaylist(id: string, scope: ScopeFilter): Promise<PlaylistDetailResponseDto | null> {
    const playlist = await this.repository.findPlaylistById(id, scope);
    if (!playlist) return null;
    return this.toPlaylistDetailResponse(playlist);
  }

  async getPlaylists(
    query: PlaylistQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<PlaylistResponseDto>> {
    const { data, total } = await this.repository.findPlaylists(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(p => this.toPlaylistResponse(p)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createPlaylist(
    dto: CreatePlaylistDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<PlaylistResponseDto> {
    const playlist = await this.repository.createPlaylist({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
      itemCount: 0,
      totalDuration: 0,
      likeCount: 0,
      downloadCount: 0,
    });
    return this.toPlaylistResponse(playlist);
  }

  async updatePlaylist(
    id: string,
    dto: UpdatePlaylistDto,
    scope: ScopeFilter,
  ): Promise<PlaylistResponseDto | null> {
    const playlist = await this.repository.updatePlaylist(id, dto, scope);
    if (!playlist) return null;
    return this.toPlaylistResponse(playlist);
  }

  async deletePlaylist(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeletePlaylist(id, scope);
  }

  // ========== Playlist Item Methods ==========

  async getPlaylistItems(
    playlistId: string,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto[]> {
    // Verify playlist exists and belongs to scope
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }
    const items = await this.repository.findPlaylistItems(playlistId);
    return items.map(item => this.toPlaylistItemResponse(item));
  }

  async addPlaylistItem(
    playlistId: string,
    dto: CreatePlaylistItemDto,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto> {
    // Verify playlist exists
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Verify media exists
    const media = await this.repository.findMediaById(dto.mediaId, scope);
    if (!media) {
      throw new Error('Media not found');
    }

    // Auto-assign sort order if not provided
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await this.repository.getMaxSortOrder(playlistId);
      sortOrder = maxOrder + 1;
    }

    const item = await this.repository.createPlaylistItem({
      playlistId,
      mediaId: dto.mediaId,
      sortOrder,
      duration: dto.duration,
      transitionType: dto.transitionType,
      isActive: dto.isActive ?? true,
      isForced: dto.isForced ?? false,
      sourceType: dto.sourceType ?? 'platform',
      metadata: dto.metadata,
    });

    // Update playlist stats
    await this.repository.updatePlaylistStats(playlistId);

    return this.toPlaylistItemResponse(item);
  }

  async addPlaylistItemsBulk(
    playlistId: string,
    dto: BulkCreatePlaylistItemsDto,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto[]> {
    // Verify playlist exists
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Get current max sort order
    let currentOrder = await this.repository.getMaxSortOrder(playlistId);

    // Prepare items with auto-incremented sort order
    const itemsToCreate = dto.items.map(item => ({
      playlistId,
      mediaId: item.mediaId,
      sortOrder: item.sortOrder ?? ++currentOrder,
      duration: item.duration,
      transitionType: item.transitionType,
      isActive: item.isActive ?? true,
      isForced: item.isForced ?? false,
      sourceType: item.sourceType ?? 'platform',
      metadata: item.metadata,
    }));

    const items = await this.repository.createPlaylistItemsBulk(itemsToCreate);

    // Update playlist stats
    await this.repository.updatePlaylistStats(playlistId);

    return items.map(item => this.toPlaylistItemResponse(item));
  }

  async updatePlaylistItem(
    playlistId: string,
    itemId: string,
    dto: UpdatePlaylistItemDto,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto | null> {
    // Verify playlist exists
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Verify item belongs to playlist
    const existingItem = await this.repository.findPlaylistItemById(itemId);
    if (!existingItem || existingItem.playlistId !== playlistId) {
      return null;
    }

    const item = await this.repository.updatePlaylistItem(itemId, dto);
    if (!item) return null;

    // Update playlist stats if duration or active status changed
    if (dto.duration !== undefined || dto.isActive !== undefined) {
      await this.repository.updatePlaylistStats(playlistId);
    }

    return this.toPlaylistItemResponse(item);
  }

  async deletePlaylistItem(
    playlistId: string,
    itemId: string,
    scope: ScopeFilter,
  ): Promise<boolean> {
    // Verify playlist exists
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const success = await this.repository.deletePlaylistItem(itemId);
    if (success) {
      await this.repository.updatePlaylistStats(playlistId);
    }
    return success;
  }

  async reorderPlaylistItems(
    playlistId: string,
    dto: ReorderPlaylistItemsDto,
    scope: ScopeFilter,
  ): Promise<PlaylistItemResponseDto[]> {
    // Verify playlist exists
    const playlist = await this.repository.findPlaylistById(playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    await this.repository.reorderPlaylistItems(playlistId, dto.items);
    const items = await this.repository.findPlaylistItems(playlistId);
    return items.map(item => this.toPlaylistItemResponse(item));
  }

  // ========== Media Methods ==========

  async getMedia(id: string, scope: ScopeFilter): Promise<MediaResponseDto | null> {
    const media = await this.repository.findMediaById(id, scope);
    if (!media) return null;
    return this.toMediaResponse(media);
  }

  async getMediaList(
    query: MediaQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<MediaResponseDto>> {
    const { data, total } = await this.repository.findMedia(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(m => this.toMediaResponse(m)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createMedia(
    dto: CreateMediaDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<MediaResponseDto> {
    const media = await this.repository.createMedia({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
      status: 'active',
    });
    return this.toMediaResponse(media);
  }

  async updateMedia(
    id: string,
    dto: UpdateMediaDto,
    scope: ScopeFilter,
  ): Promise<MediaResponseDto | null> {
    const media = await this.repository.updateMedia(id, dto, scope);
    if (!media) return null;
    return this.toMediaResponse(media);
  }

  async deleteMedia(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteMedia(id, scope);
  }

  // ========== Schedule Methods ==========

  async getSchedule(id: string, scope: ScopeFilter): Promise<ScheduleResponseDto | null> {
    const schedule = await this.repository.findScheduleById(id, scope);
    if (!schedule) return null;
    return this.toScheduleResponse(schedule);
  }

  async getSchedules(
    query: ScheduleQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<ScheduleResponseDto>> {
    const { data, total } = await this.repository.findSchedules(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(s => this.toScheduleResponse(s)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createSchedule(
    dto: CreateScheduleDto,
    scope: ScopeFilter,
  ): Promise<ScheduleResponseDto> {
    // Verify playlist exists
    const playlist = await this.repository.findPlaylistById(dto.playlistId, scope);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const schedule = await this.repository.createSchedule({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      channelId: dto.channelId || null,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      isActive: dto.isActive ?? true,
      priority: dto.priority ?? 0,
    });
    return this.toScheduleResponse(schedule);
  }

  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
    scope: ScopeFilter,
  ): Promise<ScheduleResponseDto | null> {
    // If playlistId is being updated, verify it exists
    if (dto.playlistId) {
      const playlist = await this.repository.findPlaylistById(dto.playlistId, scope);
      if (!playlist) {
        throw new Error('Playlist not found');
      }
    }

    // Build update data with proper Date conversions
    const { validFrom, validUntil, ...restDto } = dto;
    const updateData: Partial<SignageSchedule> = {
      ...restDto,
    };
    if (validFrom !== undefined) {
      updateData.validFrom = validFrom ? new Date(validFrom) : null;
    }
    if (validUntil !== undefined) {
      updateData.validUntil = validUntil ? new Date(validUntil) : null;
    }

    const schedule = await this.repository.updateSchedule(id, updateData, scope);
    if (!schedule) return null;
    return this.toScheduleResponse(schedule);
  }

  async deleteSchedule(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteSchedule(id, scope);
  }

  // ========== Active Content Resolution ==========

  async resolveActiveContent(
    channelId: string | null,
    scope: ScopeFilter,
    currentTime?: Date,
  ): Promise<ActiveContentResponseDto> {
    const resolveTime = currentTime || new Date();
    const schedule = await this.repository.findActiveSchedule(channelId, scope, resolveTime);

    if (!schedule || !schedule.playlist) {
      return {
        playlist: null,
        schedule: null,
        items: [],
        resolvedAt: resolveTime.toISOString(),
        nextScheduleChange: null,
      };
    }

    const items = await this.repository.findPlaylistItems(schedule.playlistId);

    return {
      playlist: this.toPlaylistResponse(schedule.playlist),
      schedule: this.toScheduleResponse(schedule),
      items: items.map(item => this.toPlaylistItemResponse(item)),
      resolvedAt: resolveTime.toISOString(),
      nextScheduleChange: schedule.endTime, // Simplified; could be enhanced
    };
  }

  // ========== Response Transformers ==========

  private toPlaylistResponse(playlist: SignagePlaylist): PlaylistResponseDto {
    return {
      id: playlist.id,
      serviceKey: playlist.serviceKey,
      organizationId: playlist.organizationId,
      name: playlist.name,
      description: playlist.description || null,
      status: playlist.status,
      loopEnabled: playlist.loopEnabled,
      defaultItemDuration: playlist.defaultItemDuration,
      transitionType: playlist.transitionType,
      transitionDuration: playlist.transitionDuration,
      totalDuration: playlist.totalDuration,
      itemCount: playlist.itemCount,
      isPublic: playlist.isPublic,
      likeCount: playlist.likeCount,
      downloadCount: playlist.downloadCount,
      createdByUserId: playlist.createdByUserId,
      createdAt: playlist.createdAt?.toISOString(),
      updatedAt: playlist.updatedAt?.toISOString(),
    };
  }

  private toPlaylistDetailResponse(playlist: SignagePlaylist): PlaylistDetailResponseDto {
    return {
      ...this.toPlaylistResponse(playlist),
      items: (playlist.items || []).map(item => this.toPlaylistItemResponse(item)),
    };
  }

  private toPlaylistItemResponse(item: SignagePlaylistItem): PlaylistItemResponseDto {
    return {
      id: item.id,
      playlistId: item.playlistId,
      mediaId: item.mediaId,
      sortOrder: item.sortOrder,
      duration: item.duration,
      transitionType: item.transitionType,
      isActive: item.isActive,
      isForced: item.isForced,
      sourceType: item.sourceType,
      createdAt: item.createdAt?.toISOString(),
      media: item.media ? this.toMediaResponse(item.media) : undefined,
    };
  }

  private toMediaResponse(media: SignageMedia): MediaResponseDto {
    return {
      id: media.id,
      serviceKey: media.serviceKey,
      organizationId: media.organizationId,
      name: media.name,
      description: media.description || null,
      mediaType: media.mediaType,
      sourceType: media.sourceType,
      sourceUrl: media.sourceUrl,
      embedId: media.embedId || null,
      thumbnailUrl: media.thumbnailUrl || null,
      duration: media.duration,
      resolution: media.resolution || null,
      fileSize: media.fileSize,
      mimeType: media.mimeType || null,
      content: media.content || null,
      tags: media.tags || [],
      category: media.category || null,
      status: media.status,
      createdAt: media.createdAt?.toISOString(),
      updatedAt: media.updatedAt?.toISOString(),
    };
  }

  private toScheduleResponse(schedule: SignageSchedule): ScheduleResponseDto {
    return {
      id: schedule.id,
      serviceKey: schedule.serviceKey,
      organizationId: schedule.organizationId,
      name: schedule.name,
      channelId: schedule.channelId,
      playlistId: schedule.playlistId,
      daysOfWeek: schedule.daysOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      validFrom: schedule.validFrom?.toISOString()?.slice(0, 10) || null,
      validUntil: schedule.validUntil?.toISOString()?.slice(0, 10) || null,
      priority: schedule.priority,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt?.toISOString(),
      updatedAt: schedule.updatedAt?.toISOString(),
      playlist: schedule.playlist ? this.toPlaylistResponse(schedule.playlist) : undefined,
    };
  }

  // ========== Sprint 2-3: Template Methods ==========

  async getTemplate(id: string, scope: ScopeFilter): Promise<TemplateDetailResponseDto | null> {
    const template = await this.repository.findTemplateById(id, scope);
    if (!template) return null;
    return this.toTemplateDetailResponse(template);
  }

  async getTemplates(
    query: TemplateQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<TemplateResponseDto>> {
    const { data, total } = await this.repository.findTemplates(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(t => this.toTemplateResponse(t)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createTemplate(
    dto: CreateTemplateDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<TemplateResponseDto> {
    const template = await this.repository.createTemplate({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
    });
    return this.toTemplateResponse(template);
  }

  async updateTemplate(
    id: string,
    dto: UpdateTemplateDto,
    scope: ScopeFilter,
  ): Promise<TemplateResponseDto | null> {
    const template = await this.repository.updateTemplate(id, dto, scope);
    if (!template) return null;
    return this.toTemplateResponse(template);
  }

  async deleteTemplate(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteTemplate(id, scope);
  }

  // ========== Template Zone Methods ==========

  async getTemplateZones(
    templateId: string,
    scope: ScopeFilter,
  ): Promise<TemplateZoneResponseDto[]> {
    const template = await this.repository.findTemplateById(templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }
    const zones = await this.repository.findTemplateZones(templateId);
    return zones.map(z => this.toTemplateZoneResponse(z));
  }

  async addTemplateZone(
    templateId: string,
    dto: CreateTemplateZoneDto,
    scope: ScopeFilter,
  ): Promise<TemplateZoneResponseDto> {
    const template = await this.repository.findTemplateById(templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxOrder = await this.repository.getMaxZoneSortOrder(templateId);
      sortOrder = maxOrder + 1;
    }

    const zone = await this.repository.createTemplateZone({
      templateId,
      ...dto,
      sortOrder,
      zIndex: dto.zIndex ?? 0,
      isActive: dto.isActive ?? true,
    });
    return this.toTemplateZoneResponse(zone);
  }

  async updateTemplateZone(
    templateId: string,
    zoneId: string,
    dto: UpdateTemplateZoneDto,
    scope: ScopeFilter,
  ): Promise<TemplateZoneResponseDto | null> {
    const template = await this.repository.findTemplateById(templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }

    const existingZone = await this.repository.findTemplateZoneById(zoneId);
    if (!existingZone || existingZone.templateId !== templateId) {
      return null;
    }

    const zone = await this.repository.updateTemplateZone(zoneId, dto);
    if (!zone) return null;
    return this.toTemplateZoneResponse(zone);
  }

  async deleteTemplateZone(
    templateId: string,
    zoneId: string,
    scope: ScopeFilter,
  ): Promise<boolean> {
    const template = await this.repository.findTemplateById(templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }
    return this.repository.deleteTemplateZone(zoneId);
  }

  // ========== Content Block Methods ==========

  async getContentBlock(id: string, scope: ScopeFilter): Promise<ContentBlockResponseDto | null> {
    const block = await this.repository.findContentBlockById(id, scope);
    if (!block) return null;
    return this.toContentBlockResponse(block);
  }

  async getContentBlocks(
    query: ContentBlockQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<ContentBlockResponseDto>> {
    const { data, total } = await this.repository.findContentBlocks(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(b => this.toContentBlockResponse(b)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createContentBlock(
    dto: CreateContentBlockDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<ContentBlockResponseDto> {
    const block = await this.repository.createContentBlock({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
    });
    return this.toContentBlockResponse(block);
  }

  async updateContentBlock(
    id: string,
    dto: UpdateContentBlockDto,
    scope: ScopeFilter,
  ): Promise<ContentBlockResponseDto | null> {
    const block = await this.repository.updateContentBlock(id, dto, scope);
    if (!block) return null;
    return this.toContentBlockResponse(block);
  }

  async deleteContentBlock(id: string, scope: ScopeFilter): Promise<boolean> {
    return this.repository.softDeleteContentBlock(id, scope);
  }

  // ========== Layout Preset Methods ==========

  async getLayoutPreset(id: string, serviceKey?: string): Promise<LayoutPresetResponseDto | null> {
    const preset = await this.repository.findLayoutPresetById(id, serviceKey);
    if (!preset) return null;
    return this.toLayoutPresetResponse(preset);
  }

  async getLayoutPresets(
    query: LayoutPresetQueryDto,
    serviceKey?: string,
  ): Promise<PaginatedResponse<LayoutPresetResponseDto>> {
    const { data, total } = await this.repository.findLayoutPresets(query, serviceKey);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(p => this.toLayoutPresetResponse(p)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async createLayoutPreset(
    dto: CreateLayoutPresetDto,
    serviceKey?: string,
  ): Promise<LayoutPresetResponseDto> {
    const preset = await this.repository.createLayoutPreset({
      ...dto,
      serviceKey: serviceKey || null,
    });
    return this.toLayoutPresetResponse(preset);
  }

  async updateLayoutPreset(
    id: string,
    dto: UpdateLayoutPresetDto,
  ): Promise<LayoutPresetResponseDto | null> {
    const preset = await this.repository.updateLayoutPreset(id, dto);
    if (!preset) return null;
    return this.toLayoutPresetResponse(preset);
  }

  async deleteLayoutPreset(id: string): Promise<boolean> {
    return this.repository.softDeleteLayoutPreset(id);
  }

  // ========== Media Library ==========

  async getMediaLibrary(
    scope: ScopeFilter,
    mediaType?: string,
    category?: string,
    search?: string,
  ): Promise<MediaLibraryResponseDto> {
    const { platform, organization } = await this.repository.findMediaLibrary(
      scope,
      mediaType,
      category,
      search,
    );

    return {
      platform: platform.map(m => this.toMediaResponse(m)),
      organization: organization.map(m => this.toMediaResponse(m)),
      supplier: [], // Will be implemented with supplier integration
      meta: {
        page: 1,
        limit: 50,
        total: platform.length + organization.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  // ========== Schedule Calendar ==========

  async getScheduleCalendar(
    query: ScheduleCalendarQueryDto,
    scope: ScopeFilter,
  ): Promise<ScheduleCalendarResponseDto> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const schedules = await this.repository.findSchedulesForCalendar(
      scope,
      startDate,
      endDate,
      query.channelId,
    );

    // Generate calendar events from schedules
    const events: ScheduleCalendarEventDto[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().slice(0, 10);

      for (const schedule of schedules) {
        if (schedule.daysOfWeek.includes(dayOfWeek)) {
          events.push({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            playlistId: schedule.playlistId,
            playlistName: schedule.playlist?.name || 'Unknown',
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            daysOfWeek: schedule.daysOfWeek,
            priority: schedule.priority,
            date: dateStr,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      events,
      startDate: query.startDate,
      endDate: query.endDate,
    };
  }

  // ========== Presigned Upload (Stub) ==========

  async getPresignedUploadUrl(
    dto: PresignedUploadRequestDto,
    scope: ScopeFilter,
  ): Promise<PresignedUploadResponseDto> {
    // In production, this would integrate with GCS or S3
    // For now, return a placeholder response
    const timestamp = Date.now();
    const expiresAt = new Date(timestamp + 3600000); // 1 hour from now

    return {
      uploadUrl: `https://storage.example.com/upload/${scope.serviceKey}/${timestamp}/${dto.fileName}`,
      downloadUrl: `https://storage.example.com/media/${scope.serviceKey}/${timestamp}/${dto.fileName}`,
      fields: {
        'Content-Type': dto.mimeType,
      },
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ========== AI Generation (Stub) ==========

  async generateWithAi(
    dto: AiGenerateRequestDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<AiGenerateResponseDto> {
    // In production, this would call AI service (OpenAI, Claude, etc.)
    // For now, return a placeholder response and log the request

    const generatedContent = `<div class="ai-generated ${dto.style || 'modern'}">
      <h2>${dto.prompt.slice(0, 50)}</h2>
      <p>AI-generated content placeholder</p>
    </div>`;

    // Create content block for generated content
    const block = await this.repository.createContentBlock({
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      createdByUserId: userId || null,
      name: `AI Generated: ${dto.templateType}`,
      blockType: 'html',
      content: generatedContent,
      status: 'active',
      metadata: {
        aiGenerated: true,
        prompt: dto.prompt,
        templateType: dto.templateType,
        style: dto.style,
      },
    });

    // Log the generation
    await this.repository.createAiGenerationLog({
      serviceKey: scope.serviceKey,
      organizationId: scope.organizationId || null,
      userId: userId || null,
      generationType: dto.templateType as 'banner' | 'custom',
      request: {
        prompt: dto.prompt,
        parameters: {
          style: dto.style,
          width: dto.width,
          height: dto.height,
        },
      },
      outputData: {
        contentBlockId: block.id,
        resultType: 'content_block',
      },
      modelName: 'placeholder',
      tokensUsed: 0,
      status: 'completed',
    });

    return {
      contentBlockId: block.id,
      generatedContent,
      thumbnailUrl: null,
      generationLog: {
        prompt: dto.prompt,
        model: 'placeholder',
        tokensUsed: 0,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ========== Template Preview (Stub) ==========

  async generateTemplatePreview(
    dto: TemplatePreviewDto,
    scope: ScopeFilter,
  ): Promise<TemplatePreviewResponseDto> {
    const template = await this.repository.findTemplateById(dto.templateId, scope);
    if (!template) {
      throw new Error('Template not found');
    }

    // In production, this would compile the template with variables
    // For now, return a placeholder
    const previewHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: ${template.layoutConfig.backgroundColor || '#000'}; }
    .zone { position: absolute; border: 1px dashed #fff; }
  </style>
</head>
<body style="width: ${template.layoutConfig.width}px; height: ${template.layoutConfig.height}px;">
  ${(template.zones || []).map(zone => `
    <div class="zone" style="
      left: ${zone.position.x}${zone.position.unit};
      top: ${zone.position.y}${zone.position.unit};
      width: ${zone.position.width}${zone.position.unit};
      height: ${zone.position.height}${zone.position.unit};
    ">
      ${zone.name}
    </div>
  `).join('')}
</body>
</html>`;

    return {
      previewHtml,
      previewUrl: null,
      compiledAt: new Date().toISOString(),
    };
  }

  // ========== Sprint 2-3: Response Transformers ==========

  private toTemplateResponse(template: SignageTemplate): TemplateResponseDto {
    return {
      id: template.id,
      serviceKey: template.serviceKey,
      organizationId: template.organizationId,
      name: template.name,
      description: template.description || null,
      layoutConfig: template.layoutConfig,
      category: template.category || null,
      tags: template.tags || [],
      thumbnailUrl: template.thumbnailUrl || null,
      status: template.status,
      isPublic: template.isPublic,
      isSystem: template.isSystem,
      createdByUserId: template.createdByUserId,
      createdAt: template.createdAt?.toISOString(),
      updatedAt: template.updatedAt?.toISOString(),
    };
  }

  private toTemplateDetailResponse(template: SignageTemplate): TemplateDetailResponseDto {
    return {
      ...this.toTemplateResponse(template),
      zones: (template.zones || []).map(z => this.toTemplateZoneResponse(z)),
    };
  }

  private toTemplateZoneResponse(zone: SignageTemplateZone): TemplateZoneResponseDto {
    return {
      id: zone.id,
      templateId: zone.templateId,
      name: zone.name,
      zoneKey: zone.zoneKey || null,
      zoneType: zone.zoneType,
      position: zone.position,
      zIndex: zone.zIndex,
      sortOrder: zone.sortOrder,
      style: zone.style || {},
      defaultPlaylistId: zone.defaultPlaylistId || null,
      defaultMediaId: zone.defaultMediaId || null,
      settings: zone.settings || {},
      isActive: zone.isActive,
      createdAt: zone.createdAt?.toISOString(),
      updatedAt: zone.updatedAt?.toISOString(),
    };
  }

  private toContentBlockResponse(block: SignageContentBlock): ContentBlockResponseDto {
    return {
      id: block.id,
      serviceKey: block.serviceKey,
      organizationId: block.organizationId,
      name: block.name,
      description: block.description || null,
      blockType: block.blockType,
      content: block.content || null,
      mediaId: block.mediaId || null,
      settings: block.settings || {},
      status: block.status,
      category: block.category || null,
      tags: block.tags || [],
      createdByUserId: block.createdByUserId,
      createdAt: block.createdAt?.toISOString(),
      updatedAt: block.updatedAt?.toISOString(),
    };
  }

  private toLayoutPresetResponse(preset: SignageLayoutPreset): LayoutPresetResponseDto {
    return {
      id: preset.id,
      serviceKey: preset.serviceKey || null,
      name: preset.name,
      description: preset.description || null,
      presetData: preset.presetData,
      category: preset.category || null,
      tags: preset.tags || [],
      thumbnailUrl: preset.thumbnailUrl || null,
      isSystem: preset.isSystem,
      isActive: preset.isActive,
      sortOrder: preset.sortOrder,
      createdAt: preset.createdAt?.toISOString(),
      updatedAt: preset.updatedAt?.toISOString(),
    };
  }

  // ========== Sprint 2-6: Global Content Methods ==========

  /**
   * Get global playlists (HQ, Supplier, Community)
   * Only returns playlists with scope: 'global'
   */
  async getGlobalPlaylists(
    query: GlobalContentQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<GlobalPlaylistResponseDto>> {
    const { data, total } = await this.repository.findGlobalPlaylists(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(p => this.toGlobalPlaylistResponse(p)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get global media
   */
  async getGlobalMedia(
    query: GlobalContentQueryDto,
    scope: ScopeFilter,
  ): Promise<PaginatedResponse<GlobalMediaResponseDto>> {
    const { data, total } = await this.repository.findGlobalMedia(query, scope);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map(m => this.toGlobalMediaResponse(m)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create global playlist (HQ content)
   */
  async createGlobalPlaylist(
    dto: CreateGlobalPlaylistDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<GlobalPlaylistResponseDto> {
    const playlist = await this.repository.createPlaylist({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: null, // Global content has no organization
      createdByUserId: userId || null,
      itemCount: 0,
      totalDuration: 0,
      likeCount: 0,
      downloadCount: 0,
      source: dto.source,
      scope: dto.scope,
      parentPlaylistId: null,
    });
    return this.toGlobalPlaylistResponse(playlist);
  }

  /**
   * Create global media (HQ content)
   */
  async createGlobalMedia(
    dto: CreateGlobalMediaDto,
    scope: ScopeFilter,
    userId?: string,
  ): Promise<GlobalMediaResponseDto> {
    const media = await this.repository.createMedia({
      ...dto,
      serviceKey: scope.serviceKey,
      organizationId: null, // Global content has no organization
      createdByUserId: userId || null,
      status: 'active',
      source: dto.source,
      scope: dto.scope,
      parentMediaId: null,
    });
    return this.toGlobalMediaResponse(media);
  }

  /**
   * Update global playlist
   */
  async updateGlobalPlaylist(
    id: string,
    dto: UpdateGlobalPlaylistDto,
    scope: ScopeFilter,
  ): Promise<GlobalPlaylistResponseDto | null> {
    // For global content, we don't filter by organizationId
    const globalScope: ScopeFilter = {
      serviceKey: scope.serviceKey,
      organizationId: undefined,
    };

    const playlist = await this.repository.updatePlaylist(id, dto, globalScope);
    if (!playlist) return null;
    return this.toGlobalPlaylistResponse(playlist);
  }

  /**
   * Update global media
   */
  async updateGlobalMedia(
    id: string,
    dto: UpdateGlobalMediaDto,
    scope: ScopeFilter,
  ): Promise<GlobalMediaResponseDto | null> {
    // For global content, we don't filter by organizationId
    const globalScope: ScopeFilter = {
      serviceKey: scope.serviceKey,
      organizationId: undefined,
    };

    const media = await this.repository.updateMedia(id, dto, globalScope);
    if (!media) return null;
    return this.toGlobalMediaResponse(media);
  }

  // WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clonePlaylist, cloneMedia removed
  // Content copy is now handled via asset-snapshot-copy (@o4o/asset-copy-core)

  // ========== Sprint 2-6: Response Transformers ==========

  private toGlobalPlaylistResponse(playlist: SignagePlaylist): GlobalPlaylistResponseDto {
    return {
      ...this.toPlaylistResponse(playlist),
      source: (playlist as any).source || 'store',
      scope: (playlist as any).scope || 'store',
      parentPlaylistId: (playlist as any).parentPlaylistId || null,
    };
  }

  private toGlobalMediaResponse(media: SignageMedia): GlobalMediaResponseDto {
    return {
      ...this.toMediaResponse(media),
      source: (media as any).source || 'store',
      scope: (media as any).scope || 'store',
      parentMediaId: (media as any).parentMediaId || null,
    };
  }
}
