import type { DataSource } from 'typeorm';
import type {
  SignagePlaylist,
  SignagePlaylistItem,
  SignageMedia,
  SignageSchedule,
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
}
