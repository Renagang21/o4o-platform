// ========== Legacy Entities (for backward compatibility) ==========
// Media management
export * from './MediaSource.entity.js';
export * from './MediaList.entity.js';
export * from './MediaListItem.entity.js';

// Display management
export * from './Display.entity.js';
export * from './DisplaySlot.entity.js';

// Schedule management
export * from './Schedule.entity.js';

// Action execution
export * from './ActionExecution.entity.js';

// ========== Production-Ready Entities (Phase 2) ==========
// Playlist management
export * from './SignagePlaylist.entity.js';
export * from './SignagePlaylistItem.entity.js';

// Media management
export * from './SignageMedia.entity.js';
export * from './SignageMediaTag.entity.js';

// Schedule management
export * from './SignageSchedule.entity.js';

// Template management
export * from './SignageTemplate.entity.js';
export * from './SignageTemplateZone.entity.js';
export * from './SignageLayoutPreset.entity.js';
export * from './SignageContentBlock.entity.js';

// Social & Sharing
export * from './SignagePlaylistShare.entity.js';

// AI & Analytics
export * from './SignageAiGenerationLog.entity.js';
export * from './SignageAnalytics.entity.js';

// ========== Legacy Entity Imports ==========
import { MediaSource } from './MediaSource.entity.js';
import { MediaList } from './MediaList.entity.js';
import { MediaListItem } from './MediaListItem.entity.js';
import { Display } from './Display.entity.js';
import { DisplaySlot } from './DisplaySlot.entity.js';
import { Schedule } from './Schedule.entity.js';
import { ActionExecution } from './ActionExecution.entity.js';

// ========== Production Entity Imports ==========
import { SignagePlaylist } from './SignagePlaylist.entity.js';
import { SignagePlaylistItem } from './SignagePlaylistItem.entity.js';
import { SignageMedia } from './SignageMedia.entity.js';
import { SignageMediaTag } from './SignageMediaTag.entity.js';
import { SignageSchedule } from './SignageSchedule.entity.js';
import { SignageTemplate } from './SignageTemplate.entity.js';
import { SignageTemplateZone } from './SignageTemplateZone.entity.js';
import { SignageLayoutPreset } from './SignageLayoutPreset.entity.js';
import { SignageContentBlock } from './SignageContentBlock.entity.js';
import { SignagePlaylistShare } from './SignagePlaylistShare.entity.js';
import { SignageAiGenerationLog } from './SignageAiGenerationLog.entity.js';
import { SignageAnalytics } from './SignageAnalytics.entity.js';

/**
 * Legacy entities (for backward compatibility)
 * @deprecated Use SignageCoreEntities instead
 */
export const SignageEntities = [
  MediaSource,
  MediaList,
  MediaListItem,
  Display,
  DisplaySlot,
  Schedule,
  ActionExecution,
] as const;

/**
 * Production-ready core entities (Phase 2)
 * Use this for new implementations
 */
export const SignageCoreEntities = [
  // Playlist
  SignagePlaylist,
  SignagePlaylistItem,
  // Media
  SignageMedia,
  SignageMediaTag,
  // Schedule
  SignageSchedule,
  // Template
  SignageTemplate,
  SignageTemplateZone,
  SignageLayoutPreset,
  SignageContentBlock,
  // Social
  SignagePlaylistShare,
  // AI & Analytics
  SignageAiGenerationLog,
  SignageAnalytics,
] as const;

/**
 * All entities (legacy + production)
 */
export const AllSignageEntities = [
  ...SignageEntities,
  ...SignageCoreEntities,
] as const;
