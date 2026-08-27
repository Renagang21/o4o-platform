import { Router, Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignagePlaylistController } from './controllers/playlist.controller.js';
import { SignageMediaController } from './controllers/media.controller.js';
import { SignageScheduleController } from './controllers/schedule.controller.js';
import { SignageTemplateController } from './controllers/template.controller.js';
import { SignageContentController } from './controllers/content.controller.js';
import { SignageGlobalContentController } from './controllers/global-content.controller.js';
import { SignageForcedContentController } from './controllers/forced-content.controller.js';
import {
  requireSignageAdmin,
  requireSignageOperator,
  requireSignageStore,
  requireSignageOperatorOrStore,
  allowSignageStoreRead,
  requireSignageCommunity,
  validateServiceKey,
} from '../../middleware/signage-role.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateUuidParams } from '../../middleware/validate-uuid-param.middleware.js';

/**
 * Create Signage Routes
 *
 * Factory function that creates Express router with all Signage API endpoints.
 * Follows the existing route factory pattern used in other modules.
 *
 * Base path: /api/signage/:serviceKey
 *
 * Role-based Access Control (Role Reform V1):
 * - Admin routes (/admin/*): requireSignageAdmin
 * - HQ routes (/hq/*): requireSignageOperator
 * - Store routes (default): requireSignageStore or requireSignageOperatorOrStore
 * - Global read routes (/global/*): allowSignageStoreRead
 *
 * See: ROLE-STRUCTURE-V3.md for full role definitions
 */
export function createSignageRoutes(dataSource: DataSource): Router {
  const router = Router({ mergeParams: true });
  const playlistCtrl = new SignagePlaylistController(dataSource);
  const mediaCtrl = new SignageMediaController(dataSource);
  const scheduleCtrl = new SignageScheduleController(dataSource);
  const templateCtrl = new SignageTemplateController(dataSource);
  const contentCtrl = new SignageContentController(dataSource);
  const globalCtrl = new SignageGlobalContentController(dataSource);
  const forcedCtrl = new SignageForcedContentController(dataSource);

  // Apply authentication and service key validation to all routes
  router.use(requireAuth);
  router.use(validateServiceKey);

  // ========== Store Playlist Routes (Store-owned content) ==========
  // These routes handle store-specific playlists
  // GET /api/signage/:serviceKey/playlists - List playlists (filtered by org)
  router.get('/playlists', requireSignageOperatorOrStore, playlistCtrl.getPlaylists);

  // POST /api/signage/:serviceKey/playlists - Create playlist (store-owned)
  router.post('/playlists', requireSignageStore, playlistCtrl.createPlaylist);

  // GET /api/signage/:serviceKey/playlists/:id - Get playlist by ID
  router.get('/playlists/:id', requireSignageOperatorOrStore, validateUuidParams('id'), playlistCtrl.getPlaylist);

  // PATCH /api/signage/:serviceKey/playlists/:id - Update playlist
  router.patch('/playlists/:id', requireSignageStore, validateUuidParams('id'), playlistCtrl.updatePlaylist);

  // DELETE /api/signage/:serviceKey/playlists/:id - Delete playlist (soft delete)
  router.delete('/playlists/:id', requireSignageStore, validateUuidParams('id'), playlistCtrl.deletePlaylist);

  // ========== Playlist Item Routes (Store + Operator) ==========
  // WO-KPA-OPERATOR-HQ-PLAYLIST-CREATE-FLOW-REFINE-V1: requireSignageStore → requireSignageOperatorOrStore
  // HQ operators need item management for global playlists (no organizationId)
  // GET /api/signage/:serviceKey/playlists/:playlistId/items - List playlist items
  router.get('/playlists/:playlistId/items', requireSignageOperatorOrStore, validateUuidParams('playlistId'), playlistCtrl.getPlaylistItems);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items - Add item to playlist
  router.post('/playlists/:playlistId/items', requireSignageOperatorOrStore, validateUuidParams('playlistId'), playlistCtrl.addPlaylistItem);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items/bulk - Bulk add items
  router.post('/playlists/:playlistId/items/bulk', requireSignageOperatorOrStore, validateUuidParams('playlistId'), playlistCtrl.addPlaylistItemsBulk);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items/reorder - Reorder items
  router.post('/playlists/:playlistId/items/reorder', requireSignageOperatorOrStore, validateUuidParams('playlistId'), playlistCtrl.reorderPlaylistItems);

  // PATCH /api/signage/:serviceKey/playlists/:playlistId/items/:itemId - Update item
  router.patch('/playlists/:playlistId/items/:itemId', requireSignageOperatorOrStore, validateUuidParams('playlistId', 'itemId'), playlistCtrl.updatePlaylistItem);

  // DELETE /api/signage/:serviceKey/playlists/:playlistId/items/:itemId - Delete item
  router.delete('/playlists/:playlistId/items/:itemId', requireSignageOperatorOrStore, validateUuidParams('playlistId', 'itemId'), playlistCtrl.deletePlaylistItem);

  // ========== Store Media Routes (Store-owned media) ==========
  // GET /api/signage/:serviceKey/media - List media (filtered by org)
  router.get('/media', requireSignageOperatorOrStore, mediaCtrl.getMediaList);

  // POST /api/signage/:serviceKey/media - Create media (store-owned)
  router.post('/media', requireSignageStore, mediaCtrl.createMedia);

  // ========== Media Library Routes ==========
  // GET /api/signage/:serviceKey/media/library - Get media library (platform + org)
  //
  // WO-O4O-SIGNAGE-MEDIA-LIBRARY-ROUTE-SHADOWING-AND-GUARD-CONTRACT-V1
  // NOTE: static path MUST stay registered before '/media/:id',
  // otherwise Express matches it as :id='library' (route shadowing).
  // Guard 는 형제 media route 와 동일한 requireSignageOperatorOrStore 다
  // (shadowing 상태의 실제 production 계약과 동일 — 권한 완화 없음).
  router.get('/media/library', requireSignageOperatorOrStore, mediaCtrl.getMediaLibrary);

  // GET /api/signage/:serviceKey/media/:id - Get media by ID
  router.get('/media/:id', requireSignageOperatorOrStore, validateUuidParams('id'), mediaCtrl.getMedia);

  // PATCH /api/signage/:serviceKey/media/:id - Update media
  router.patch('/media/:id', requireSignageStore, validateUuidParams('id'), mediaCtrl.updateMedia);

  // DELETE /api/signage/:serviceKey/media/:id - Delete media (soft delete)
  router.delete('/media/:id', requireSignageStore, validateUuidParams('id'), mediaCtrl.deleteMedia);

  // ========== Store Schedule Routes (Store-only) ==========
  // GET /api/signage/:serviceKey/schedules - List schedules
  router.get('/schedules', requireSignageStore, scheduleCtrl.getSchedules);

  // POST /api/signage/:serviceKey/schedules - Create schedule
  router.post('/schedules', requireSignageStore, scheduleCtrl.createSchedule);

  // GET /api/signage/:serviceKey/schedules/calendar - Get schedule calendar view
  // NOTE: static path MUST stay registered before '/schedules/:id',
  // otherwise Express matches it as :id='calendar' (route shadowing).
  router.get('/schedules/calendar', requireSignageStore, scheduleCtrl.getScheduleCalendar);

  // GET /api/signage/:serviceKey/schedules/:id - Get schedule by ID
  router.get('/schedules/:id', requireSignageStore, validateUuidParams('id'), scheduleCtrl.getSchedule);

  // PATCH /api/signage/:serviceKey/schedules/:id - Update schedule
  router.patch('/schedules/:id', requireSignageStore, validateUuidParams('id'), scheduleCtrl.updateSchedule);

  // DELETE /api/signage/:serviceKey/schedules/:id - Delete schedule (soft delete)
  router.delete('/schedules/:id', requireSignageStore, validateUuidParams('id'), scheduleCtrl.deleteSchedule);

  // ========== Active Content Resolution (Player - less strict) ==========
  // GET /api/signage/:serviceKey/active-content - Resolve active content for channel
  // Note: Player devices need access, so we use a looser check
  router.get('/active-content', allowSignageStoreRead, scheduleCtrl.resolveActiveContent);

  // ========== Template Routes (Operator/HQ managed) ==========
  // Templates are created by Operators, used by Stores (read-only)
  // GET /api/signage/:serviceKey/templates - List templates
  router.get('/templates', allowSignageStoreRead, templateCtrl.getTemplates);

  // POST /api/signage/:serviceKey/templates - Create template (Operator only)
  router.post('/templates', requireSignageOperator, templateCtrl.createTemplate);

  // GET /api/signage/:serviceKey/templates/:id - Get template by ID
  router.get('/templates/:id', allowSignageStoreRead, validateUuidParams('id'), templateCtrl.getTemplate);

  // PATCH /api/signage/:serviceKey/templates/:id - Update template (Operator only)
  router.patch('/templates/:id', requireSignageOperator, validateUuidParams('id'), templateCtrl.updateTemplate);

  // DELETE /api/signage/:serviceKey/templates/:id - Delete template (Operator only)
  router.delete('/templates/:id', requireSignageOperator, validateUuidParams('id'), templateCtrl.deleteTemplate);

  // POST /api/signage/:serviceKey/templates/preview - Generate template preview
  router.post('/templates/preview', allowSignageStoreRead, templateCtrl.previewTemplate);

  // ========== Template Zone Routes (Operator managed) ==========
  // GET /api/signage/:serviceKey/templates/:templateId/zones - List template zones
  router.get('/templates/:templateId/zones', allowSignageStoreRead, validateUuidParams('templateId'), templateCtrl.getTemplateZones);

  // POST /api/signage/:serviceKey/templates/:templateId/zones - Add zone (Operator only)
  router.post('/templates/:templateId/zones', requireSignageOperator, validateUuidParams('templateId'), templateCtrl.addTemplateZone);

  // PATCH /api/signage/:serviceKey/templates/:templateId/zones/:zoneId - Update zone (Operator only)
  router.patch('/templates/:templateId/zones/:zoneId', requireSignageOperator, validateUuidParams('templateId', 'zoneId'), templateCtrl.updateTemplateZone);

  // DELETE /api/signage/:serviceKey/templates/:templateId/zones/:zoneId - Delete zone (Operator only)
  router.delete('/templates/:templateId/zones/:zoneId', requireSignageOperator, validateUuidParams('templateId', 'zoneId'), templateCtrl.deleteTemplateZone);

  // ========== [RETIRED] content-blocks / layout-presets / upload / ai ==========
  // WO-O4O-SIGNAGE-LEGACY-STACK-SIMPLIFICATION-AND-TABLET-AUTHORING-CLOSURE-V1
  // live consumer 0 — admin v2 dead UI 와 라우팅되지 않은 kpa-society AI 모달이 유일한 호출자였다.
  // canonical 재생 경로(StoreTablet -> ScreenSet -> idle_media)와 무관하므로 route 등록만 제거한다.
  // 테이블 / entity / controller 메서드는 남긴다 (schema DROP 금지).

  // ========== Sprint 2-6: Global Content Routes (Read-only for Store) ==========
  // These routes allow Stores to browse HQ/Supplier/Community content

  // GET /api/signage/:serviceKey/global/playlists - List global playlists (HQ, Supplier, Community)
  router.get('/global/playlists', allowSignageStoreRead, globalCtrl.getGlobalPlaylists);

  // GET /api/signage/:serviceKey/global/playlists/:source - List playlists by source
  router.get('/global/playlists/:source', allowSignageStoreRead, globalCtrl.getGlobalPlaylistsBySource);

  // GET /api/signage/:serviceKey/global/media - List global media
  router.get('/global/media', allowSignageStoreRead, globalCtrl.getGlobalMedia);

  // GET /api/signage/:serviceKey/global/media/:source - List media by source
  router.get('/global/media/:source', allowSignageStoreRead, globalCtrl.getGlobalMediaBySource);

  // ========== HQ Content Management Routes (Operator Only) ==========
  // These routes are exclusively for HQ Operators to manage global content

  // POST /api/signage/:serviceKey/hq/playlists - Create HQ playlist (scope: global)
  router.post('/hq/playlists', requireSignageOperator, globalCtrl.createHqPlaylist);

  // POST /api/signage/:serviceKey/hq/media - Create HQ media (scope: global)
  router.post('/hq/media', requireSignageOperator, globalCtrl.createHqMedia);

  // PATCH /api/signage/:serviceKey/hq/playlists/:id/status - Transition HQ playlist status (WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1)
  router.patch('/hq/playlists/:id/status', requireSignageOperator, validateUuidParams('id'), globalCtrl.transitionHqPlaylistStatus);

  // PATCH /api/signage/:serviceKey/hq/media/:id/status - Transition HQ media status (WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1)
  router.patch('/hq/media/:id/status', requireSignageOperator, validateUuidParams('id'), globalCtrl.transitionHqMediaStatus);

  // PATCH /api/signage/:serviceKey/hq/playlists/:id - Update HQ playlist
  router.patch('/hq/playlists/:id', requireSignageOperator, validateUuidParams('id'), globalCtrl.updateHqPlaylist);

  // PATCH /api/signage/:serviceKey/hq/media/:id - Update HQ media
  router.patch('/hq/media/:id', requireSignageOperator, validateUuidParams('id'), globalCtrl.updateHqMedia);

  // DELETE /api/signage/:serviceKey/hq/playlists/:id - Hard delete HQ playlist (Operator only)
  // WO-KPA-SOCIETY-OPERATOR-SIGNAGE-CONTENT-HARD-DELETE-POLICY-V1
  router.delete('/hq/playlists/:id', requireSignageOperator, validateUuidParams('id'), playlistCtrl.hardDeletePlaylist);

  // GET /api/signage/:serviceKey/hq/media/:id/usage - Media usage lookup (Operator only)
  // WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1 (Scope 3)
  router.get('/hq/media/:id/usage', requireSignageOperator, validateUuidParams('id'), mediaCtrl.getMediaUsage);

  // DELETE /api/signage/:serviceKey/hq/media/:id - Hard delete HQ media (Operator only)
  // WO-KPA-SOCIETY-OPERATOR-SIGNAGE-CONTENT-HARD-DELETE-POLICY-V1
  // + WO-O4O-KPA-SIGNAGE-MEDIA-USAGE-GUARD-AND-SAFE-DELETE-V1 (Scope 4/5): 사용 중 409 차단
  router.delete('/hq/media/:id', requireSignageOperator, validateUuidParams('id'), mediaCtrl.hardDeleteMedia);

  // ========== Forced Content Routes (WO-KPA-SIGNAGE-FORCED-CONTENT-IMPLEMENTATION-V1) ==========
  // Operator manages forced content that is auto-injected into all store playlists at query time

  // GET /api/signage/:serviceKey/hq/forced-content - List forced content
  router.get('/hq/forced-content', requireSignageOperator, forcedCtrl.list);

  // POST /api/signage/:serviceKey/hq/forced-content - Create forced content
  router.post('/hq/forced-content', requireSignageOperator, forcedCtrl.create);

  // PATCH /api/signage/:serviceKey/hq/forced-content/:id - Update forced content
  router.patch('/hq/forced-content/:id', requireSignageOperator, validateUuidParams('id'), forcedCtrl.update);

  // DELETE /api/signage/:serviceKey/hq/forced-content/:id - Soft delete forced content
  router.delete('/hq/forced-content/:id', requireSignageOperator, validateUuidParams('id'), forcedCtrl.remove);

  // ========== Community Content Creation Routes (WO-O4O-SIGNAGE-COMMUNITY-AUTHORSHIP-PHASE1-V1) ==========
  // Community creates global content with source='community', scope='global'

  // POST /api/signage/:serviceKey/community/media - Create community media (scope: global)
  router.post('/community/media', requireSignageCommunity, globalCtrl.createCommunityMedia);

  // DELETE /api/signage/:serviceKey/community/media/:id - Delete own community media
  router.delete('/community/media/:id', requireSignageCommunity, validateUuidParams('id'), globalCtrl.deleteCommunityMedia);

  // POST /api/signage/:serviceKey/community/playlists - Create community playlist (scope: global)
  router.post('/community/playlists', requireSignageCommunity, globalCtrl.createCommunityPlaylist);

  // DELETE /api/signage/:serviceKey/community/playlists/:id - Delete own community playlist
  router.delete('/community/playlists/:id', requireSignageCommunity, validateUuidParams('id'), globalCtrl.deleteCommunityPlaylist);

  // WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clone routes removed
  // Content copy is now handled via asset-snapshot-copy (assetSnapshotApi.copy)

  // WO-O4O-SIGNAGE-CATEGORY-FIELD-REMOVAL-PHASE2-V1: /categories CRUD removed (tag-only model)

  return router;
}
