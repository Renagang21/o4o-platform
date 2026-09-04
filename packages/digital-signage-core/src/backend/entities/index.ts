// ========== Signage Core Entities ==========
// Phase-6 legacy entities (MediaSource / MediaList / MediaListItem / Display /
// DisplaySlot / Schedule / ActionExecution) 는 은퇴했다.
//   WO-O4O-SIGNAGE-PHASE6-ENTITY-AND-PHYSICAL-TABLE-DISPOSITION-V1
//   근거: TypeORM registry 미등록(`SignageCoreEntities` 만 등록) · 저장소 전체 소비처 0 ·
//         생성 migration 0 · production 물리 테이블 부재(`to_regclass` = NULL) ·
//         FK/논리참조 0. 물리 테이블이 없어 schema 변경(DROP) 은 수행하지 않았다.
// 그 결과 entity 수는 16 → 9 로 줄었고, 남은 9개가 production runtime 전부다.

// ========== Production-Ready Entities (Phase 2) ==========
// Playlist management
export * from './SignagePlaylist.entity.js';
export * from './SignagePlaylistItem.entity.js';

// Media management
export * from './SignageMedia.entity.js';
// SignageMediaTag removed (WO-KPA-SIGNAGE-DEAD-CODE-CLEANUP-V1)

// Schedule management
export * from './SignageSchedule.entity.js';

// Template management
export * from './SignageTemplate.entity.js';
export * from './SignageTemplateZone.entity.js';
export * from './SignageLayoutPreset.entity.js';
export * from './SignageContentBlock.entity.js';

// Social & Sharing — SignagePlaylistShare removed (WO-KPA-SIGNAGE-DEAD-CODE-CLEANUP-V1)

// AI & Analytics — SignageAnalytics removed (WO-KPA-SIGNAGE-DEAD-CODE-CLEANUP-V1)
export * from './SignageAiGenerationLog.entity.js';

// ========== Production Entity Imports ==========
import { SignagePlaylist } from './SignagePlaylist.entity.js';
import { SignagePlaylistItem } from './SignagePlaylistItem.entity.js';
import { SignageMedia } from './SignageMedia.entity.js';
import { SignageSchedule } from './SignageSchedule.entity.js';
import { SignageTemplate } from './SignageTemplate.entity.js';
import { SignageTemplateZone } from './SignageTemplateZone.entity.js';
import { SignageLayoutPreset } from './SignageLayoutPreset.entity.js';
import { SignageContentBlock } from './SignageContentBlock.entity.js';
import { SignageAiGenerationLog } from './SignageAiGenerationLog.entity.js';

/**
 * Production-ready core entities — signage runtime 의 전부다.
 * `SignageEntities` / `AllSignageEntities` (Phase-6 legacy 배열) 은
 * WO-O4O-SIGNAGE-PHASE6-ENTITY-AND-PHYSICAL-TABLE-DISPOSITION-V1 에서 소비처 0 으로 제거됐다.
 */
export const SignageCoreEntities = [
  // Playlist
  SignagePlaylist,
  SignagePlaylistItem,
  // Media
  SignageMedia,
  // Schedule
  SignageSchedule,
  // Template
  SignageTemplate,
  SignageTemplateZone,
  SignageLayoutPreset,
  SignageContentBlock,
  // AI
  SignageAiGenerationLog,
] as const;
