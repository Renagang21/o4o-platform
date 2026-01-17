/**
 * Signage Types for Web Player
 *
 * Sprint 2-4: Type definitions for production player
 * Phase 2: Digital Signage Production Upgrade
 */

// ============================================================================
// Media Types
// ============================================================================

export type MediaType = 'image' | 'video' | 'html' | 'text' | 'youtube' | 'vimeo' | 'external';

export interface MediaContent {
  id: string;
  name: string;
  mediaType: MediaType;
  mimeType?: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number; // seconds
  width?: number;
  height?: number;
  fileSize?: number;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Playlist Types
// ============================================================================

export type TransitionEffect = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom';

export interface PlaylistItem {
  id: string;
  playlistId: string;
  mediaId: string;
  media: MediaContent;
  displayOrder: number;
  displayDuration?: number; // seconds, override media default
  transitionEffect?: TransitionEffect;
  transitionDuration?: number; // milliseconds
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  serviceKey: string;
  organizationId?: string;
  name: string;
  description?: string;
  defaultDuration: number;
  defaultTransition: TransitionEffect;
  isActive: boolean;
  isLoop: boolean;
  items: PlaylistItem[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Schedule Types
// ============================================================================

export type SchedulePriority = 'low' | 'normal' | 'high' | 'urgent';
export type ScheduleRepeat = 'none' | 'daily' | 'weekly' | 'monthly';
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface ScheduleRule {
  id: string;
  name: string;
  playlistId: string;
  playlist?: Playlist;
  priority: SchedulePriority;
  validFrom?: string;
  validUntil?: string;
  timeStart?: string; // HH:mm format
  timeEnd?: string; // HH:mm format
  daysOfWeek?: DayOfWeek[];
  repeat: ScheduleRepeat;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface ActiveContentResponse {
  playlist: Playlist | null;
  schedule: ScheduleRule | null;
  items: PlaylistItem[];
  nextRefreshAt?: string;
  fallbackPlaylistId?: string;
}

// ============================================================================
// Template Types
// ============================================================================

export type ZoneType = 'main' | 'header' | 'footer' | 'sidebar' | 'ticker' | 'overlay' | 'custom';

export interface TemplateZone {
  id: string;
  templateId: string;
  name: string;
  zoneType: ZoneType;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: 'percent' | 'px';
  };
  zIndex: number;
  defaultPlaylistId?: string;
  settings: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  backgroundColor?: string;
  backgroundImage?: string;
  zones: TemplateZone[];
  isActive: boolean;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Player Configuration Types
// ============================================================================

export type PlayerMode = 'zero-ui' | 'minimal' | 'preview' | 'debug';

export interface PlayerConfig {
  mode: PlayerMode;
  channelId?: string;
  channelCode?: string;
  serviceKey?: string;
  apiUrl: string;

  // Playback settings
  defaultDuration: number; // seconds
  preloadCount: number;
  transitionDuration: number; // milliseconds
  loop: boolean;
  autoplay: boolean;
  muted: boolean;

  // Offline settings
  enableOffline: boolean;
  cacheTtlMinutes: number;
  maxCacheSizeMb: number;

  // Heartbeat settings
  heartbeatIntervalMs: number;

  // Debug settings
  showDebugInfo: boolean;
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  mode: 'zero-ui',
  apiUrl: '',
  defaultDuration: 10,
  preloadCount: 2,
  transitionDuration: 300,
  loop: true,
  autoplay: true,
  muted: true,
  enableOffline: true,
  cacheTtlMinutes: 60,
  maxCacheSizeMb: 500,
  heartbeatIntervalMs: 60000,
  showDebugInfo: false,
  logLevel: 'error',
};

// ============================================================================
// Cache Types
// ============================================================================

export interface CachedContent {
  id: string;
  mediaId: string;
  url: string;
  blob?: Blob;
  cachedAt: number;
  expiresAt: number;
  size: number;
  contentType: string;
}

export interface CacheStats {
  totalSize: number;
  itemCount: number;
  hitRate: number;
  missRate: number;
  lastCleanup: number;
}

// ============================================================================
// Heartbeat & Logging Types
// ============================================================================

export interface HeartbeatPayload {
  channelId: string;
  playerId: string;
  playerVersion: string;
  deviceType: string;
  platform: string;
  uptimeSec: number;
  currentPlaylistId?: string;
  currentMediaId?: string;
  isPlaying: boolean;
  metrics: {
    memoryMb?: number;
    cpuPercent?: number;
    networkType?: string;
    batteryLevel?: number;
  };
}

export interface PlaybackLogEntry {
  channelId: string;
  playlistId: string;
  mediaId: string;
  contentId?: string;
  durationSec: number;
  completed: boolean;
  playedAt: string;
  errorMessage?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export enum PlayerErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTENT_NOT_FOUND = 'CONTENT_NOT_FOUND',
  PLAYBACK_FAILED = 'PLAYBACK_FAILED',
  CACHE_ERROR = 'CACHE_ERROR',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CHANNEL_INACTIVE = 'CHANNEL_INACTIVE',
  SCHEDULE_EMPTY = 'SCHEDULE_EMPTY',
}

export interface PlayerError {
  code: PlayerErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  timestamp: Date;
}
