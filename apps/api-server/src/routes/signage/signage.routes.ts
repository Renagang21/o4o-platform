import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SignageController } from './controllers/signage.controller.js';
import {
  requireSignageAdmin,
  requireSignageOperator,
  requireSignageStore,
  requireSignageOperatorOrStore,
  allowSignageStoreRead,
  requireSignageCommunity,
  validateServiceKey,
} from '../../middleware/signage-role.middleware.js';
import { ensureAuthenticated } from '../../middleware/permission.middleware.js';

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
  const controller = new SignageController(dataSource);

  // Apply authentication and service key validation to all routes
  router.use(ensureAuthenticated);
  router.use(validateServiceKey);

  // ========== Store Playlist Routes (Store-owned content) ==========
  // These routes handle store-specific playlists
  // GET /api/signage/:serviceKey/playlists - List playlists (filtered by org)
  router.get('/playlists', requireSignageOperatorOrStore, controller.getPlaylists);

  // POST /api/signage/:serviceKey/playlists - Create playlist (store-owned)
  router.post('/playlists', requireSignageStore, controller.createPlaylist);

  // GET /api/signage/:serviceKey/playlists/:id - Get playlist by ID
  router.get('/playlists/:id', requireSignageOperatorOrStore, controller.getPlaylist);

  // PATCH /api/signage/:serviceKey/playlists/:id - Update playlist
  router.patch('/playlists/:id', requireSignageStore, controller.updatePlaylist);

  // DELETE /api/signage/:serviceKey/playlists/:id - Delete playlist (soft delete)
  router.delete('/playlists/:id', requireSignageStore, controller.deletePlaylist);

  // ========== Playlist Item Routes (Store content) ==========
  // GET /api/signage/:serviceKey/playlists/:playlistId/items - List playlist items
  router.get('/playlists/:playlistId/items', requireSignageOperatorOrStore, controller.getPlaylistItems);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items - Add item to playlist
  router.post('/playlists/:playlistId/items', requireSignageStore, controller.addPlaylistItem);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items/bulk - Bulk add items
  router.post('/playlists/:playlistId/items/bulk', requireSignageStore, controller.addPlaylistItemsBulk);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items/reorder - Reorder items
  router.post('/playlists/:playlistId/items/reorder', requireSignageStore, controller.reorderPlaylistItems);

  // PATCH /api/signage/:serviceKey/playlists/:playlistId/items/:itemId - Update item
  router.patch('/playlists/:playlistId/items/:itemId', requireSignageStore, controller.updatePlaylistItem);

  // DELETE /api/signage/:serviceKey/playlists/:playlistId/items/:itemId - Delete item
  router.delete('/playlists/:playlistId/items/:itemId', requireSignageStore, controller.deletePlaylistItem);

  // ========== Store Media Routes (Store-owned media) ==========
  // GET /api/signage/:serviceKey/media - List media (filtered by org)
  router.get('/media', requireSignageOperatorOrStore, controller.getMediaList);

  // POST /api/signage/:serviceKey/media - Create media (store-owned)
  router.post('/media', requireSignageStore, controller.createMedia);

  // GET /api/signage/:serviceKey/media/:id - Get media by ID
  router.get('/media/:id', requireSignageOperatorOrStore, controller.getMedia);

  // PATCH /api/signage/:serviceKey/media/:id - Update media
  router.patch('/media/:id', requireSignageStore, controller.updateMedia);

  // DELETE /api/signage/:serviceKey/media/:id - Delete media (soft delete)
  router.delete('/media/:id', requireSignageStore, controller.deleteMedia);

  // ========== Store Schedule Routes (Store-only) ==========
  // GET /api/signage/:serviceKey/schedules - List schedules
  router.get('/schedules', requireSignageStore, controller.getSchedules);

  // POST /api/signage/:serviceKey/schedules - Create schedule
  router.post('/schedules', requireSignageStore, controller.createSchedule);

  // GET /api/signage/:serviceKey/schedules/:id - Get schedule by ID
  router.get('/schedules/:id', requireSignageStore, controller.getSchedule);

  // PATCH /api/signage/:serviceKey/schedules/:id - Update schedule
  router.patch('/schedules/:id', requireSignageStore, controller.updateSchedule);

  // DELETE /api/signage/:serviceKey/schedules/:id - Delete schedule (soft delete)
  router.delete('/schedules/:id', requireSignageStore, controller.deleteSchedule);

  // ========== Active Content Resolution (Player - less strict) ==========
  // GET /api/signage/:serviceKey/active-content - Resolve active content for channel
  // Note: Player devices need access, so we use a looser check
  router.get('/active-content', allowSignageStoreRead, controller.resolveActiveContent);

  // ========== Template Routes (Operator/HQ managed) ==========
  // Templates are created by Operators, used by Stores (read-only)
  // GET /api/signage/:serviceKey/templates - List templates
  router.get('/templates', allowSignageStoreRead, controller.getTemplates);

  // POST /api/signage/:serviceKey/templates - Create template (Operator only)
  router.post('/templates', requireSignageOperator, controller.createTemplate);

  // GET /api/signage/:serviceKey/templates/:id - Get template by ID
  router.get('/templates/:id', allowSignageStoreRead, controller.getTemplate);

  // PATCH /api/signage/:serviceKey/templates/:id - Update template (Operator only)
  router.patch('/templates/:id', requireSignageOperator, controller.updateTemplate);

  // DELETE /api/signage/:serviceKey/templates/:id - Delete template (Operator only)
  router.delete('/templates/:id', requireSignageOperator, controller.deleteTemplate);

  // POST /api/signage/:serviceKey/templates/preview - Generate template preview
  router.post('/templates/preview', allowSignageStoreRead, controller.previewTemplate);

  // ========== Template Zone Routes (Operator managed) ==========
  // GET /api/signage/:serviceKey/templates/:templateId/zones - List template zones
  router.get('/templates/:templateId/zones', allowSignageStoreRead, controller.getTemplateZones);

  // POST /api/signage/:serviceKey/templates/:templateId/zones - Add zone (Operator only)
  router.post('/templates/:templateId/zones', requireSignageOperator, controller.addTemplateZone);

  // PATCH /api/signage/:serviceKey/templates/:templateId/zones/:zoneId - Update zone (Operator only)
  router.patch('/templates/:templateId/zones/:zoneId', requireSignageOperator, controller.updateTemplateZone);

  // DELETE /api/signage/:serviceKey/templates/:templateId/zones/:zoneId - Delete zone (Operator only)
  router.delete('/templates/:templateId/zones/:zoneId', requireSignageOperator, controller.deleteTemplateZone);

  // ========== Content Block Routes (Operator managed) ==========
  // GET /api/signage/:serviceKey/content-blocks - List content blocks
  router.get('/content-blocks', allowSignageStoreRead, controller.getContentBlocks);

  // POST /api/signage/:serviceKey/content-blocks - Create content block (Operator only)
  router.post('/content-blocks', requireSignageOperator, controller.createContentBlock);

  // GET /api/signage/:serviceKey/content-blocks/:id - Get content block by ID
  router.get('/content-blocks/:id', allowSignageStoreRead, controller.getContentBlock);

  // PATCH /api/signage/:serviceKey/content-blocks/:id - Update content block (Operator only)
  router.patch('/content-blocks/:id', requireSignageOperator, controller.updateContentBlock);

  // DELETE /api/signage/:serviceKey/content-blocks/:id - Delete content block (Operator only)
  router.delete('/content-blocks/:id', requireSignageOperator, controller.deleteContentBlock);

  // ========== Layout Preset Routes (Operator managed) ==========
  // GET /api/signage/:serviceKey/layout-presets - List layout presets
  router.get('/layout-presets', allowSignageStoreRead, controller.getLayoutPresets);

  // POST /api/signage/:serviceKey/layout-presets - Create layout preset (Operator only)
  router.post('/layout-presets', requireSignageOperator, controller.createLayoutPreset);

  // GET /api/signage/:serviceKey/layout-presets/:id - Get layout preset by ID
  router.get('/layout-presets/:id', allowSignageStoreRead, controller.getLayoutPreset);

  // PATCH /api/signage/:serviceKey/layout-presets/:id - Update layout preset (Operator only)
  router.patch('/layout-presets/:id', requireSignageOperator, controller.updateLayoutPreset);

  // DELETE /api/signage/:serviceKey/layout-presets/:id - Delete layout preset (Operator only)
  router.delete('/layout-presets/:id', requireSignageOperator, controller.deleteLayoutPreset);

  // ========== Media Library Routes ==========
  // GET /api/signage/:serviceKey/media/library - Get media library (platform + org + supplier)
  router.get('/media/library', allowSignageStoreRead, controller.getMediaLibrary);

  // ========== Schedule Calendar Routes ==========
  // GET /api/signage/:serviceKey/schedules/calendar - Get schedule calendar view
  router.get('/schedules/calendar', requireSignageStore, controller.getScheduleCalendar);

  // ========== Upload Routes (Store can upload to their library) ==========
  // POST /api/signage/:serviceKey/upload/presigned - Get presigned upload URL
  router.post('/upload/presigned', requireSignageOperatorOrStore, controller.getPresignedUploadUrl);

  // ========== AI Generation Routes (Store feature) ==========
  // POST /api/signage/:serviceKey/ai/generate - Generate content with AI
  router.post('/ai/generate', requireSignageStore, controller.generateWithAi);

  // ========== Sprint 2-6: Global Content Routes (Read-only for Store) ==========
  // These routes allow Stores to browse HQ/Supplier/Community content

  // GET /api/signage/:serviceKey/global/playlists - List global playlists (HQ, Supplier, Community)
  router.get('/global/playlists', allowSignageStoreRead, controller.getGlobalPlaylists);

  // GET /api/signage/:serviceKey/global/playlists/:source - List playlists by source
  router.get('/global/playlists/:source', allowSignageStoreRead, controller.getGlobalPlaylistsBySource);

  // GET /api/signage/:serviceKey/global/media - List global media
  router.get('/global/media', allowSignageStoreRead, controller.getGlobalMedia);

  // GET /api/signage/:serviceKey/global/media/:source - List media by source
  router.get('/global/media/:source', allowSignageStoreRead, controller.getGlobalMediaBySource);

  // ========== HQ Content Management Routes (Operator Only) ==========
  // These routes are exclusively for HQ Operators to manage global content

  // POST /api/signage/:serviceKey/hq/playlists - Create HQ playlist (scope: global)
  router.post('/hq/playlists', requireSignageOperator, controller.createHqPlaylist);

  // POST /api/signage/:serviceKey/hq/media - Create HQ media (scope: global)
  router.post('/hq/media', requireSignageOperator, controller.createHqMedia);

  // PATCH /api/signage/:serviceKey/hq/playlists/:id - Update HQ playlist
  router.patch('/hq/playlists/:id', requireSignageOperator, controller.updateHqPlaylist);

  // PATCH /api/signage/:serviceKey/hq/media/:id - Update HQ media
  router.patch('/hq/media/:id', requireSignageOperator, controller.updateHqMedia);

  // DELETE /api/signage/:serviceKey/hq/playlists/:id - Delete HQ playlist (Operator only)
  router.delete('/hq/playlists/:id', requireSignageOperator, controller.deletePlaylist);

  // DELETE /api/signage/:serviceKey/hq/media/:id - Delete HQ media (Operator only)
  router.delete('/hq/media/:id', requireSignageOperator, controller.deleteMedia);

  // ========== Community Content Creation Routes (WO-O4O-SIGNAGE-COMMUNITY-AUTHORSHIP-PHASE1-V1) ==========
  // Community creates global content with source='community', scope='global'

  // POST /api/signage/:serviceKey/community/media - Create community media (scope: global)
  router.post('/community/media', requireSignageCommunity, controller.createCommunityMedia);

  // POST /api/signage/:serviceKey/community/playlists - Create community playlist (scope: global)
  router.post('/community/playlists', requireSignageCommunity, controller.createCommunityPlaylist);

  // WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clone routes removed
  // Content copy is now handled via asset-snapshot-copy (assetSnapshotApi.copy)

  return router;
}
