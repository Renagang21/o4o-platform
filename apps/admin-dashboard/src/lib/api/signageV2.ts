/**
 * Signage V2 API Client
 *
 * Sprint 2-5: Admin Dashboard API client for Phase 2 Digital Signage
 * Uses new multi-tenant endpoints: /api/signage/:serviceKey/... (unifiedApi.raw, base `/api`)
 */

import { unifiedApi } from '@/api/unified-client';

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
  /** WO-SIGNAGE-DIRECT-REFERENCE-ITEM-V1: 'hq'이면 HQ 미디어 직접 참조 (복사 없음) */
  sourceType?: 'store' | 'hq' | 'platform' | 'supplier' | 'operator_ad';
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

// backend mount = `/api/signage/:serviceKey` (register-routes). `unifiedApi.raw` 의 base 가 `/api`
// 이므로 `/signage/...` 로 붙인다. (이전 `authClient.api`(base `/api/v1`) + `/api/signage` 조합은
// `/api/v1/api/signage/...` 404 — production smoke 에서 확인, WO-...-CLOSURE-V1 교정)
const getBaseUrl = (serviceKey: string = DEFAULT_SERVICE_KEY) =>
  `/signage/${serviceKey}`;

// WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
//   playlistApi · signageMediaApi · signageScheduleApi · templateApi 는 admin 소비처 0
//   (admin 의 signage 화면은 /admin/digital-signage/content = ContentHub 조회 하나뿐) 이라 제거.
//   남은 globalContentApi 는 backend `/api/signage/:serviceKey/global/*` 와 1:1.

// Global Content API (Content Hub)
// WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clone 메서드 제거 (clonePlaylist, cloneMedia 삭제)
// ❌ globalContentApi.clone* 사용 금지
export type ContentSource = 'hq' | 'community';

export const globalContentApi = {
  async listPlaylists(source: ContentSource, serviceKey?: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SignagePlaylist>>> {
    try {
      const base = getBaseUrl(serviceKey);
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      const query = searchParams.toString();
      const url = query ? `${base}/global/playlists/${source}?${query}` : `${base}/global/playlists/${source}`;
      const response = await unifiedApi.raw.get(url);
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
      const response = await unifiedApi.raw.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Failed to list ${source} media:`, error);
      return { success: false, error: `Failed to list ${source} media` };
    }
  },
};
