/**
 * Signage V2 API Client
 *
 * Sprint 2-5: Admin Dashboard API client for Phase 2 Digital Signage
 * Uses new multi-tenant endpoints: /api/signage/:serviceKey/...
 */

import { authClient } from '@o4o/auth-client';

// Default service key for platform admin
const DEFAULT_SERVICE_KEY = 'neture';

// ============================================================================
// Types
// ============================================================================

// Media Types
export type SignageMediaType = 'image' | 'video' | 'html' | 'text' | 'youtube' | 'vimeo' | 'external';
export type MediaOwnerType = 'platform' | 'organization' | 'supplier' | 'user';

export interface SignageMedia {
  id: string;
  serviceKey: string;
  organizationId?: string;
  supplierId?: string;
  name: string;
  mediaType: SignageMediaType;
  mimeType?: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  ownerType: MediaOwnerType;
  tags: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

// Playlist Types
export type TransitionEffect = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom';

export interface SignagePlaylistItem {
  id: string;
  playlistId: string;
  mediaId: string;
  media?: SignageMedia;
  displayOrder: number;
  displayDuration?: number;
  transitionEffect?: TransitionEffect;
  transitionDuration?: number;
  isForced: boolean;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignagePlaylist {
  id: string;
  serviceKey: string;
  organizationId?: string;
  name: string;
  description?: string;
  defaultDuration: number;
  defaultTransition: TransitionEffect;
  totalDuration: number;
  itemCount: number;
  isActive: boolean;
  isLoop: boolean;
  items?: SignagePlaylistItem[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

// Schedule Types
export type SchedulePriority = 'low' | 'normal' | 'high' | 'urgent';
export type ScheduleRepeat = 'none' | 'daily' | 'weekly' | 'monthly';
export type DayOfWeekV2 = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface SignageSchedule {
  id: string;
  serviceKey: string;
  organizationId?: string;
  channelId?: string;
  name: string;
  description?: string;
  playlistId: string;
  playlist?: SignagePlaylist;
  priority: SchedulePriority;
  validFrom?: string;
  validUntil?: string;
  timeStart?: string;
  timeEnd?: string;
  daysOfWeek?: DayOfWeekV2[];
  repeat: ScheduleRepeat;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Template Types
export type ZoneType = 'main' | 'header' | 'footer' | 'sidebar' | 'ticker' | 'overlay' | 'custom';

export interface ZonePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'percent' | 'px';
}

export interface SignageTemplateZone {
  id: string;
  templateId: string;
  name: string;
  zoneType: ZoneType;
  position: ZonePosition;
  zIndex: number;
  defaultPlaylistId?: string;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateLayoutConfig {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  backgroundColor?: string;
  backgroundImage?: string;
}

export interface SignageTemplate {
  id: string;
  serviceKey: string;
  organizationId?: string;
  name: string;
  description?: string;
  layoutConfig: TemplateLayoutConfig;
  isSystem: boolean;
  isActive: boolean;
  zones?: SignageTemplateZone[];
  tags: string[];
  thumbnailUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Content Block Types
export type ContentBlockType = 'text' | 'image' | 'video' | 'html' | 'clock' | 'weather' | 'rss' | 'qr' | 'custom' | 'corner-display';

export interface ContentBlockSettings {
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  padding?: number;
  borderRadius?: number;
  // Corner Display settings (blockType: 'corner-display')
  cornerKey?: string;
  deviceType?: 'tablet' | 'signage' | 'kiosk';
  refreshIntervalMs?: number;
  listingsApiBaseUrl?: string;
}

export interface SignageContentBlock {
  id: string;
  serviceKey: string;
  organizationId?: string;
  name: string;
  blockType: ContentBlockType;
  content: Record<string, unknown>;
  settings: ContentBlockSettings;
  isSystem: boolean;
  isActive: boolean;
  thumbnailUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Layout Preset Types
export interface PresetZoneData {
  name: string;
  zoneType: string;
  position: ZonePosition;
  zIndex: number;
}

export interface LayoutPresetData {
  orientation: 'landscape' | 'portrait';
  aspectRatio: string;
  zones: PresetZoneData[];
}

export interface SignageLayoutPreset {
  id: string;
  serviceKey?: string;
  name: string;
  description?: string;
  presetData: LayoutPresetData;
  category?: string;
  tags: string[];
  thumbnailUrl?: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Calendar Event
export interface ScheduleCalendarEvent {
  id: string;
  scheduleId: string;
  scheduleName: string;
  playlistId: string;
  playlistName: string;
  priority: SchedulePriority;
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

// Analytics/Monitoring
export interface ChannelHeartbeat {
  channelId: string;
  lastHeartbeat: string;
  playerVersion: string;
  deviceType: string;
  platform: string;
  uptimeSec: number;
  isOnline: boolean;
}

export interface PlaybackLogSummary {
  channelId: string;
  totalPlaybacks: number;
  totalDurationSec: number;
  completionRate: number;
  errorCount: number;
  period: string;
}

// DTOs
export interface CreatePlaylistDto {
  name: string;
  description?: string;
  defaultDuration?: number;
  defaultTransition?: TransitionEffect;
  isLoop?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdatePlaylistDto {
  name?: string;
  description?: string;
  defaultDuration?: number;
  defaultTransition?: TransitionEffect;
  isLoop?: boolean;
  isActive?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AddPlaylistItemDto {
  mediaId: string;
  displayOrder?: number;
  displayDuration?: number;
  transitionEffect?: TransitionEffect;
  transitionDuration?: number;
  isForced?: boolean;
  settings?: Record<string, unknown>;
}

export interface CreateMediaDto {
  name: string;
  mediaType: SignageMediaType;
  url?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  ownerType?: MediaOwnerType;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMediaDto {
  name?: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number;
  isActive?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateScheduleDto {
  name: string;
  description?: string;
  playlistId: string;
  channelId?: string;
  priority?: SchedulePriority;
  validFrom?: string;
  validUntil?: string;
  timeStart?: string;
  timeEnd?: string;
  daysOfWeek?: DayOfWeekV2[];
  repeat?: ScheduleRepeat;
  metadata?: Record<string, unknown>;
}

export interface UpdateScheduleDto {
  name?: string;
  description?: string;
  playlistId?: string;
  channelId?: string;
  priority?: SchedulePriority;
  validFrom?: string;
  validUntil?: string;
  timeStart?: string;
  timeEnd?: string;
  daysOfWeek?: DayOfWeekV2[];
  repeat?: ScheduleRepeat;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  layoutConfig: TemplateLayoutConfig;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  layoutConfig?: TemplateLayoutConfig;
  isActive?: boolean;
  tags?: string[];
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTemplateZoneDto {
  name: string;
  zoneType: ZoneType;
  position: ZonePosition;
  zIndex?: number;
  defaultPlaylistId?: string;
  settings?: Record<string, unknown>;
}

export interface CreateContentBlockDto {
  name: string;
  blockType: ContentBlockType;
  content: Record<string, unknown>;
  settings?: ContentBlockSettings;
  metadata?: Record<string, unknown>;
}

export interface CreateLayoutPresetDto {
  name: string;
  description?: string;
  presetData: LayoutPresetData;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PresignedUploadRequest {
  fileName: string;
  contentType: string;
  folder?: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileUrl: string;
  expiresAt: string;
}

// API Response
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// API Functions
// ============================================================================

const getBaseUrl = (serviceKey: string = DEFAULT_SERVICE_KEY) =>
  `/api/signage/${serviceKey}`;

// Playlist API
export const playlistApi = {
  async list(serviceKey?: string, params?: { page?: number; limit?: number; isActive?: boolean }): Promise<ApiResponse<PaginatedResponse<SignagePlaylist>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/playlists?${query}` : `${base}/playlists`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list playlists:', error);
      return { success: false, error: 'Failed to list playlists' };
    }
  },

  async get(id: string, serviceKey?: string): Promise<ApiResponse<SignagePlaylist>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/playlists/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get playlist:', error);
      return { success: false, error: 'Failed to get playlist' };
    }
  },

  async create(dto: CreatePlaylistDto, serviceKey?: string): Promise<ApiResponse<SignagePlaylist>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/playlists`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create playlist:', error);
      return { success: false, error: 'Failed to create playlist' };
    }
  },

  async update(id: string, dto: UpdatePlaylistDto, serviceKey?: string): Promise<ApiResponse<SignagePlaylist>> {
    try {
      const response = await authClient.api.patch(`${getBaseUrl(serviceKey)}/playlists/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update playlist:', error);
      return { success: false, error: 'Failed to update playlist' };
    }
  },

  async delete(id: string, serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${getBaseUrl(serviceKey)}/playlists/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      return { success: false, error: 'Failed to delete playlist' };
    }
  },

  async getItems(playlistId: string, serviceKey?: string): Promise<ApiResponse<SignagePlaylistItem[]>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/playlists/${playlistId}/items`);
      return { success: true, data: response.data.items || response.data };
    } catch (error) {
      console.error('Failed to get playlist items:', error);
      return { success: false, error: 'Failed to get playlist items' };
    }
  },

  async addItem(playlistId: string, dto: AddPlaylistItemDto, serviceKey?: string): Promise<ApiResponse<SignagePlaylistItem>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/playlists/${playlistId}/items`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to add playlist item:', error);
      return { success: false, error: 'Failed to add item' };
    }
  },

  async updateItem(playlistId: string, itemId: string, dto: Partial<AddPlaylistItemDto>, serviceKey?: string): Promise<ApiResponse<SignagePlaylistItem>> {
    try {
      const response = await authClient.api.patch(`${getBaseUrl(serviceKey)}/playlists/${playlistId}/items/${itemId}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update playlist item:', error);
      return { success: false, error: 'Failed to update item' };
    }
  },

  async removeItem(playlistId: string, itemId: string, serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${getBaseUrl(serviceKey)}/playlists/${playlistId}/items/${itemId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove playlist item:', error);
      return { success: false, error: 'Failed to remove item' };
    }
  },

  async reorderItems(playlistId: string, itemIds: string[], serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.post(`${getBaseUrl(serviceKey)}/playlists/${playlistId}/items/reorder`, { itemIds });
      return { success: true };
    } catch (error) {
      console.error('Failed to reorder items:', error);
      return { success: false, error: 'Failed to reorder items' };
    }
  },
};

// Media API
export const signageMediaApi = {
  async list(serviceKey?: string, params?: { page?: number; limit?: number; mediaType?: SignageMediaType; ownerType?: MediaOwnerType }): Promise<ApiResponse<PaginatedResponse<SignageMedia>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.mediaType) searchParams.append('mediaType', params.mediaType);
      if (params?.ownerType) searchParams.append('ownerType', params.ownerType);
      const query = searchParams.toString();
      const url = query ? `${base}/media?${query}` : `${base}/media`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list media:', error);
      return { success: false, error: 'Failed to list media' };
    }
  },

  async get(id: string, serviceKey?: string): Promise<ApiResponse<SignageMedia>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/media/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get media:', error);
      return { success: false, error: 'Failed to get media' };
    }
  },

  async create(dto: CreateMediaDto, serviceKey?: string): Promise<ApiResponse<SignageMedia>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/media`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create media:', error);
      return { success: false, error: 'Failed to create media' };
    }
  },

  async update(id: string, dto: UpdateMediaDto, serviceKey?: string): Promise<ApiResponse<SignageMedia>> {
    try {
      const response = await authClient.api.patch(`${getBaseUrl(serviceKey)}/media/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update media:', error);
      return { success: false, error: 'Failed to update media' };
    }
  },

  async delete(id: string, serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${getBaseUrl(serviceKey)}/media/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete media:', error);
      return { success: false, error: 'Failed to delete media' };
    }
  },

  async getLibrary(serviceKey?: string): Promise<ApiResponse<{ platform: SignageMedia[]; organization: SignageMedia[]; supplier: SignageMedia[] }>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/media/library`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get media library:', error);
      return { success: false, error: 'Failed to get media library' };
    }
  },

  async getPresignedUrl(dto: PresignedUploadRequest, serviceKey?: string): Promise<ApiResponse<PresignedUploadResponse>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/upload/presigned`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      return { success: false, error: 'Failed to get upload URL' };
    }
  },
};

// Schedule API
export const signageScheduleApi = {
  async list(serviceKey?: string, params?: { page?: number; limit?: number; channelId?: string; isActive?: boolean }): Promise<ApiResponse<PaginatedResponse<SignageSchedule>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.channelId) searchParams.append('channelId', params.channelId);
      if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/schedules?${query}` : `${base}/schedules`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list schedules:', error);
      return { success: false, error: 'Failed to list schedules' };
    }
  },

  async get(id: string, serviceKey?: string): Promise<ApiResponse<SignageSchedule>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/schedules/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get schedule:', error);
      return { success: false, error: 'Failed to get schedule' };
    }
  },

  async create(dto: CreateScheduleDto, serviceKey?: string): Promise<ApiResponse<SignageSchedule>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/schedules`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create schedule:', error);
      return { success: false, error: 'Failed to create schedule' };
    }
  },

  async update(id: string, dto: UpdateScheduleDto, serviceKey?: string): Promise<ApiResponse<SignageSchedule>> {
    try {
      const response = await authClient.api.patch(`${getBaseUrl(serviceKey)}/schedules/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update schedule:', error);
      return { success: false, error: 'Failed to update schedule' };
    }
  },

  async delete(id: string, serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${getBaseUrl(serviceKey)}/schedules/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      return { success: false, error: 'Failed to delete schedule' };
    }
  },

  async getCalendar(startDate: string, endDate: string, channelId?: string, serviceKey?: string): Promise<ApiResponse<ScheduleCalendarEvent[]>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams({ startDate, endDate });
      if (channelId) searchParams.append('channelId', channelId);
      const response = await authClient.api.get(`${base}/schedules/calendar?${searchParams.toString()}`);
      return { success: true, data: response.data.events || response.data };
    } catch (error) {
      console.error('Failed to get schedule calendar:', error);
      return { success: false, error: 'Failed to get calendar' };
    }
  },
};

// Template API
export const templateApi = {
  async list(serviceKey?: string, params?: { page?: number; limit?: number; isActive?: boolean }): Promise<ApiResponse<PaginatedResponse<SignageTemplate>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/templates?${query}` : `${base}/templates`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list templates:', error);
      return { success: false, error: 'Failed to list templates' };
    }
  },

  async get(id: string, serviceKey?: string): Promise<ApiResponse<SignageTemplate>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/templates/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get template:', error);
      return { success: false, error: 'Failed to get template' };
    }
  },

  async create(dto: CreateTemplateDto, serviceKey?: string): Promise<ApiResponse<SignageTemplate>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/templates`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create template:', error);
      return { success: false, error: 'Failed to create template' };
    }
  },

  async update(id: string, dto: UpdateTemplateDto, serviceKey?: string): Promise<ApiResponse<SignageTemplate>> {
    try {
      const response = await authClient.api.patch(`${getBaseUrl(serviceKey)}/templates/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update template:', error);
      return { success: false, error: 'Failed to update template' };
    }
  },

  async delete(id: string, serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${getBaseUrl(serviceKey)}/templates/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete template:', error);
      return { success: false, error: 'Failed to delete template' };
    }
  },

  async getZones(templateId: string, serviceKey?: string): Promise<ApiResponse<SignageTemplateZone[]>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/templates/${templateId}/zones`);
      return { success: true, data: response.data.zones || response.data };
    } catch (error) {
      console.error('Failed to get template zones:', error);
      return { success: false, error: 'Failed to get zones' };
    }
  },

  async addZone(templateId: string, dto: CreateTemplateZoneDto, serviceKey?: string): Promise<ApiResponse<SignageTemplateZone>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/templates/${templateId}/zones`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to add template zone:', error);
      return { success: false, error: 'Failed to add zone' };
    }
  },

  async updateZone(templateId: string, zoneId: string, dto: Partial<CreateTemplateZoneDto>, serviceKey?: string): Promise<ApiResponse<SignageTemplateZone>> {
    try {
      const response = await authClient.api.patch(`${getBaseUrl(serviceKey)}/templates/${templateId}/zones/${zoneId}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update template zone:', error);
      return { success: false, error: 'Failed to update zone' };
    }
  },

  async removeZone(templateId: string, zoneId: string, serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${getBaseUrl(serviceKey)}/templates/${templateId}/zones/${zoneId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove template zone:', error);
      return { success: false, error: 'Failed to remove zone' };
    }
  },

  async preview(dto: { templateId: string; zoneContents: Record<string, string> }, serviceKey?: string): Promise<ApiResponse<{ previewUrl: string }>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/templates/preview`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to generate template preview:', error);
      return { success: false, error: 'Failed to generate preview' };
    }
  },
};

// Content Block API
export const contentBlockApi = {
  async list(serviceKey?: string, params?: { page?: number; limit?: number; blockType?: ContentBlockType }): Promise<ApiResponse<PaginatedResponse<SignageContentBlock>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.blockType) searchParams.append('blockType', params.blockType);
      const query = searchParams.toString();
      const url = query ? `${base}/content-blocks?${query}` : `${base}/content-blocks`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list content blocks:', error);
      return { success: false, error: 'Failed to list content blocks' };
    }
  },

  async get(id: string, serviceKey?: string): Promise<ApiResponse<SignageContentBlock>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/content-blocks/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get content block:', error);
      return { success: false, error: 'Failed to get content block' };
    }
  },

  async create(dto: CreateContentBlockDto, serviceKey?: string): Promise<ApiResponse<SignageContentBlock>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/content-blocks`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create content block:', error);
      return { success: false, error: 'Failed to create content block' };
    }
  },

  async update(id: string, dto: Partial<CreateContentBlockDto>, serviceKey?: string): Promise<ApiResponse<SignageContentBlock>> {
    try {
      const response = await authClient.api.patch(`${getBaseUrl(serviceKey)}/content-blocks/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update content block:', error);
      return { success: false, error: 'Failed to update content block' };
    }
  },

  async delete(id: string, serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${getBaseUrl(serviceKey)}/content-blocks/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete content block:', error);
      return { success: false, error: 'Failed to delete content block' };
    }
  },
};

// Layout Preset API
export const layoutPresetApi = {
  async list(serviceKey?: string, params?: { category?: string; isSystem?: boolean }): Promise<ApiResponse<PaginatedResponse<SignageLayoutPreset>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.append('category', params.category);
      if (params?.isSystem !== undefined) searchParams.append('isSystem', params.isSystem.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/layout-presets?${query}` : `${base}/layout-presets`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to list layout presets:', error);
      return { success: false, error: 'Failed to list layout presets' };
    }
  },

  async get(id: string, serviceKey?: string): Promise<ApiResponse<SignageLayoutPreset>> {
    try {
      const response = await authClient.api.get(`${getBaseUrl(serviceKey)}/layout-presets/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to get layout preset:', error);
      return { success: false, error: 'Failed to get layout preset' };
    }
  },

  async create(dto: CreateLayoutPresetDto, serviceKey?: string): Promise<ApiResponse<SignageLayoutPreset>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/layout-presets`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to create layout preset:', error);
      return { success: false, error: 'Failed to create layout preset' };
    }
  },

  async update(id: string, dto: Partial<CreateLayoutPresetDto>, serviceKey?: string): Promise<ApiResponse<SignageLayoutPreset>> {
    try {
      const response = await authClient.api.patch(`${getBaseUrl(serviceKey)}/layout-presets/${id}`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to update layout preset:', error);
      return { success: false, error: 'Failed to update layout preset' };
    }
  },

  async delete(id: string, serviceKey?: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.delete(`${getBaseUrl(serviceKey)}/layout-presets/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete layout preset:', error);
      return { success: false, error: 'Failed to delete layout preset' };
    }
  },
};

// AI Generation API
export const aiGenerationApi = {
  async generate(dto: {
    prompt: string;
    templateType: 'banner' | 'card' | 'poster' | 'slide';
    style?: string;
    targetWidth?: number;
    targetHeight?: number;
    parameters?: Record<string, unknown>;
  }, serviceKey?: string): Promise<ApiResponse<{ generationId: string; status: string; result?: Record<string, unknown> }>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/ai/generate`, dto);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to generate AI content:', error);
      return { success: false, error: 'Failed to generate content' };
    }
  },
};

// Global Content API (Content Hub)
export type ContentSource = 'hq' | 'supplier' | 'community';

export const globalContentApi = {
  async listPlaylists(source: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignagePlaylist>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/global/playlists/${source}?${query}` : `${base}/global/playlists/${source}`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Failed to list ${source} playlists:`, error);
      return { success: false, error: `Failed to list ${source} playlists` };
    }
  },

  async listMedia(source: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignageMedia>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/global/media/${source}?${query}` : `${base}/global/media/${source}`;
      const response = await authClient.api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Failed to list ${source} media:`, error);
      return { success: false, error: `Failed to list ${source} media` };
    }
  },

  async clonePlaylist(id: string, serviceKey?: string): Promise<ApiResponse<SignagePlaylist>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/playlists/${id}/clone`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to clone playlist:', error);
      return { success: false, error: 'Failed to clone playlist' };
    }
  },

  async cloneMedia(id: string, serviceKey?: string): Promise<ApiResponse<SignageMedia>> {
    try {
      const response = await authClient.api.post(`${getBaseUrl(serviceKey)}/media/${id}/clone`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Failed to clone media:', error);
      return { success: false, error: 'Failed to clone media' };
    }
  },
};
