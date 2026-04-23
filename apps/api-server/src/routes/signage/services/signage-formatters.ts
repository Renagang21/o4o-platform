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
import type {
  PlaylistResponseDto,
  PlaylistDetailResponseDto,
  PlaylistItemResponseDto,
  MediaResponseDto,
  ScheduleResponseDto,
  TemplateResponseDto,
  TemplateDetailResponseDto,
  TemplateZoneResponseDto,
  ContentBlockResponseDto,
  LayoutPresetResponseDto,
  GlobalPlaylistResponseDto,
  GlobalMediaResponseDto,
} from '../dto/index.js';

/**
 * Signage Response Formatters
 *
 * Pure functions that transform entity objects into response DTOs.
 * Extracted from SignageService for shared use across sub-services.
 */

export function toPlaylistResponse(playlist: SignagePlaylist): PlaylistResponseDto {
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

export function toPlaylistDetailResponse(playlist: SignagePlaylist): PlaylistDetailResponseDto {
  return {
    ...toPlaylistResponse(playlist),
    items: (playlist.items || []).map(item => toPlaylistItemResponse(item)),
  };
}

export function toPlaylistItemResponse(item: SignagePlaylistItem): PlaylistItemResponseDto {
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
    media: item.media ? toMediaResponse(item.media) : undefined,
  };
}

export function toMediaResponse(media: SignageMedia): MediaResponseDto {
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
    status: media.status,
    createdAt: media.createdAt?.toISOString(),
    updatedAt: media.updatedAt?.toISOString(),
  };
}

export function toScheduleResponse(schedule: SignageSchedule): ScheduleResponseDto {
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
    playlist: schedule.playlist ? toPlaylistResponse(schedule.playlist) : undefined,
  };
}

export function toTemplateResponse(template: SignageTemplate): TemplateResponseDto {
  return {
    id: template.id,
    serviceKey: template.serviceKey,
    organizationId: template.organizationId,
    name: template.name,
    description: template.description || null,
    layoutConfig: template.layoutConfig,
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

export function toTemplateDetailResponse(template: SignageTemplate): TemplateDetailResponseDto {
  return {
    ...toTemplateResponse(template),
    zones: (template.zones || []).map(z => toTemplateZoneResponse(z)),
  };
}

export function toTemplateZoneResponse(zone: SignageTemplateZone): TemplateZoneResponseDto {
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

export function toContentBlockResponse(block: SignageContentBlock): ContentBlockResponseDto {
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
    tags: block.tags || [],
    createdByUserId: block.createdByUserId,
    createdAt: block.createdAt?.toISOString(),
    updatedAt: block.updatedAt?.toISOString(),
  };
}

export function toLayoutPresetResponse(preset: SignageLayoutPreset): LayoutPresetResponseDto {
  return {
    id: preset.id,
    serviceKey: preset.serviceKey || null,
    name: preset.name,
    description: preset.description || null,
    presetData: preset.presetData,
    tags: preset.tags || [],
    thumbnailUrl: preset.thumbnailUrl || null,
    isSystem: preset.isSystem,
    isActive: preset.isActive,
    sortOrder: preset.sortOrder,
    createdAt: preset.createdAt?.toISOString(),
    updatedAt: preset.updatedAt?.toISOString(),
  };
}

export function toGlobalPlaylistResponse(playlist: SignagePlaylist): GlobalPlaylistResponseDto {
  return {
    ...toPlaylistResponse(playlist),
    source: (playlist as any).source || 'store',
    scope: (playlist as any).scope || 'store',
    parentPlaylistId: (playlist as any).parentPlaylistId || null,
  };
}

export function toGlobalMediaResponse(media: SignageMedia): GlobalMediaResponseDto {
  return {
    ...toMediaResponse(media),
    source: (media as any).source || 'store',
    scope: (media as any).scope || 'store',
    parentMediaId: (media as any).parentMediaId || null,
  };
}
