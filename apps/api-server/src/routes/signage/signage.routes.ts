import { Router, Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import { SignagePlaylistController } from './controllers/playlist.controller.js';
import { SignageMediaController } from './controllers/media.controller.js';
import { SignageScheduleController } from './controllers/schedule.controller.js';
import { SignageTemplateController } from './controllers/template.controller.js';
import { SignageContentController } from './controllers/content.controller.js';
import { SignageGlobalContentController } from './controllers/global-content.controller.js';
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
  router.get('/playlists/:id', requireSignageOperatorOrStore, playlistCtrl.getPlaylist);

  // PATCH /api/signage/:serviceKey/playlists/:id - Update playlist
  router.patch('/playlists/:id', requireSignageStore, playlistCtrl.updatePlaylist);

  // DELETE /api/signage/:serviceKey/playlists/:id - Delete playlist (soft delete)
  router.delete('/playlists/:id', requireSignageStore, playlistCtrl.deletePlaylist);

  // ========== Playlist Item Routes (Store content) ==========
  // GET /api/signage/:serviceKey/playlists/:playlistId/items - List playlist items
  router.get('/playlists/:playlistId/items', requireSignageOperatorOrStore, playlistCtrl.getPlaylistItems);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items - Add item to playlist
  router.post('/playlists/:playlistId/items', requireSignageStore, playlistCtrl.addPlaylistItem);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items/bulk - Bulk add items
  router.post('/playlists/:playlistId/items/bulk', requireSignageStore, playlistCtrl.addPlaylistItemsBulk);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items/reorder - Reorder items
  router.post('/playlists/:playlistId/items/reorder', requireSignageStore, playlistCtrl.reorderPlaylistItems);

  // PATCH /api/signage/:serviceKey/playlists/:playlistId/items/:itemId - Update item
  router.patch('/playlists/:playlistId/items/:itemId', requireSignageStore, playlistCtrl.updatePlaylistItem);

  // DELETE /api/signage/:serviceKey/playlists/:playlistId/items/:itemId - Delete item
  router.delete('/playlists/:playlistId/items/:itemId', requireSignageStore, playlistCtrl.deletePlaylistItem);

  // ========== Store Media Routes (Store-owned media) ==========
  // GET /api/signage/:serviceKey/media - List media (filtered by org)
  router.get('/media', requireSignageOperatorOrStore, mediaCtrl.getMediaList);

  // POST /api/signage/:serviceKey/media - Create media (store-owned)
  router.post('/media', requireSignageStore, mediaCtrl.createMedia);

  // GET /api/signage/:serviceKey/media/:id - Get media by ID
  router.get('/media/:id', requireSignageOperatorOrStore, mediaCtrl.getMedia);

  // PATCH /api/signage/:serviceKey/media/:id - Update media
  router.patch('/media/:id', requireSignageStore, mediaCtrl.updateMedia);

  // DELETE /api/signage/:serviceKey/media/:id - Delete media (soft delete)
  router.delete('/media/:id', requireSignageStore, mediaCtrl.deleteMedia);

  // ========== Store Schedule Routes (Store-only) ==========
  // GET /api/signage/:serviceKey/schedules - List schedules
  router.get('/schedules', requireSignageStore, scheduleCtrl.getSchedules);

  // POST /api/signage/:serviceKey/schedules - Create schedule
  router.post('/schedules', requireSignageStore, scheduleCtrl.createSchedule);

  // GET /api/signage/:serviceKey/schedules/:id - Get schedule by ID
  router.get('/schedules/:id', requireSignageStore, scheduleCtrl.getSchedule);

  // PATCH /api/signage/:serviceKey/schedules/:id - Update schedule
  router.patch('/schedules/:id', requireSignageStore, scheduleCtrl.updateSchedule);

  // DELETE /api/signage/:serviceKey/schedules/:id - Delete schedule (soft delete)
  router.delete('/schedules/:id', requireSignageStore, scheduleCtrl.deleteSchedule);

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
  router.get('/templates/:id', allowSignageStoreRead, templateCtrl.getTemplate);

  // PATCH /api/signage/:serviceKey/templates/:id - Update template (Operator only)
  router.patch('/templates/:id', requireSignageOperator, templateCtrl.updateTemplate);

  // DELETE /api/signage/:serviceKey/templates/:id - Delete template (Operator only)
  router.delete('/templates/:id', requireSignageOperator, templateCtrl.deleteTemplate);

  // POST /api/signage/:serviceKey/templates/preview - Generate template preview
  router.post('/templates/preview', allowSignageStoreRead, templateCtrl.previewTemplate);

  // ========== Template Zone Routes (Operator managed) ==========
  // GET /api/signage/:serviceKey/templates/:templateId/zones - List template zones
  router.get('/templates/:templateId/zones', allowSignageStoreRead, templateCtrl.getTemplateZones);

  // POST /api/signage/:serviceKey/templates/:templateId/zones - Add zone (Operator only)
  router.post('/templates/:templateId/zones', requireSignageOperator, templateCtrl.addTemplateZone);

  // PATCH /api/signage/:serviceKey/templates/:templateId/zones/:zoneId - Update zone (Operator only)
  router.patch('/templates/:templateId/zones/:zoneId', requireSignageOperator, templateCtrl.updateTemplateZone);

  // DELETE /api/signage/:serviceKey/templates/:templateId/zones/:zoneId - Delete zone (Operator only)
  router.delete('/templates/:templateId/zones/:zoneId', requireSignageOperator, templateCtrl.deleteTemplateZone);

  // ========== Content Block Routes (Operator managed) ==========
  // GET /api/signage/:serviceKey/content-blocks - List content blocks
  router.get('/content-blocks', allowSignageStoreRead, contentCtrl.getContentBlocks);

  // POST /api/signage/:serviceKey/content-blocks - Create content block (Operator only)
  router.post('/content-blocks', requireSignageOperator, contentCtrl.createContentBlock);

  // GET /api/signage/:serviceKey/content-blocks/:id - Get content block by ID
  router.get('/content-blocks/:id', allowSignageStoreRead, contentCtrl.getContentBlock);

  // PATCH /api/signage/:serviceKey/content-blocks/:id - Update content block (Operator only)
  router.patch('/content-blocks/:id', requireSignageOperator, contentCtrl.updateContentBlock);

  // DELETE /api/signage/:serviceKey/content-blocks/:id - Delete content block (Operator only)
  router.delete('/content-blocks/:id', requireSignageOperator, contentCtrl.deleteContentBlock);

  // ========== Layout Preset Routes (Operator managed) ==========
  // GET /api/signage/:serviceKey/layout-presets - List layout presets
  router.get('/layout-presets', allowSignageStoreRead, contentCtrl.getLayoutPresets);

  // POST /api/signage/:serviceKey/layout-presets - Create layout preset (Operator only)
  router.post('/layout-presets', requireSignageOperator, contentCtrl.createLayoutPreset);

  // GET /api/signage/:serviceKey/layout-presets/:id - Get layout preset by ID
  router.get('/layout-presets/:id', allowSignageStoreRead, contentCtrl.getLayoutPreset);

  // PATCH /api/signage/:serviceKey/layout-presets/:id - Update layout preset (Operator only)
  router.patch('/layout-presets/:id', requireSignageOperator, contentCtrl.updateLayoutPreset);

  // DELETE /api/signage/:serviceKey/layout-presets/:id - Delete layout preset (Operator only)
  router.delete('/layout-presets/:id', requireSignageOperator, contentCtrl.deleteLayoutPreset);

  // ========== Media Library Routes ==========
  // GET /api/signage/:serviceKey/media/library - Get media library (platform + org + supplier)
  router.get('/media/library', allowSignageStoreRead, mediaCtrl.getMediaLibrary);

  // ========== Schedule Calendar Routes ==========
  // GET /api/signage/:serviceKey/schedules/calendar - Get schedule calendar view
  router.get('/schedules/calendar', requireSignageStore, scheduleCtrl.getScheduleCalendar);

  // ========== Upload Routes (Store can upload to their library) ==========
  // POST /api/signage/:serviceKey/upload/presigned - Get presigned upload URL
  router.post('/upload/presigned', requireSignageOperatorOrStore, scheduleCtrl.getPresignedUploadUrl);

  // ========== AI Generation Routes (Store feature) ==========
  // POST /api/signage/:serviceKey/ai/generate - Generate content with AI
  router.post('/ai/generate', requireSignageOperatorOrStore, contentCtrl.generateWithAi);

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
  router.patch('/hq/playlists/:id/status', requireSignageOperator, globalCtrl.transitionHqPlaylistStatus);

  // PATCH /api/signage/:serviceKey/hq/media/:id/status - Transition HQ media status (WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1)
  router.patch('/hq/media/:id/status', requireSignageOperator, globalCtrl.transitionHqMediaStatus);

  // PATCH /api/signage/:serviceKey/hq/playlists/:id - Update HQ playlist
  router.patch('/hq/playlists/:id', requireSignageOperator, globalCtrl.updateHqPlaylist);

  // PATCH /api/signage/:serviceKey/hq/media/:id - Update HQ media
  router.patch('/hq/media/:id', requireSignageOperator, globalCtrl.updateHqMedia);

  // DELETE /api/signage/:serviceKey/hq/playlists/:id - Hard delete HQ playlist (Operator only)
  // WO-KPA-SOCIETY-OPERATOR-SIGNAGE-CONTENT-HARD-DELETE-POLICY-V1
  router.delete('/hq/playlists/:id', requireSignageOperator, playlistCtrl.hardDeletePlaylist);

  // DELETE /api/signage/:serviceKey/hq/media/:id - Hard delete HQ media (Operator only)
  // WO-KPA-SOCIETY-OPERATOR-SIGNAGE-CONTENT-HARD-DELETE-POLICY-V1
  router.delete('/hq/media/:id', requireSignageOperator, mediaCtrl.hardDeleteMedia);

  // ========== Community Content Creation Routes (WO-O4O-SIGNAGE-COMMUNITY-AUTHORSHIP-PHASE1-V1) ==========
  // Community creates global content with source='community', scope='global'

  // POST /api/signage/:serviceKey/community/media - Create community media (scope: global)
  router.post('/community/media', requireSignageCommunity, globalCtrl.createCommunityMedia);

  // DELETE /api/signage/:serviceKey/community/media/:id - Delete own community media
  router.delete('/community/media/:id', requireSignageCommunity, globalCtrl.deleteCommunityMedia);

  // POST /api/signage/:serviceKey/community/playlists - Create community playlist (scope: global)
  router.post('/community/playlists', requireSignageCommunity, globalCtrl.createCommunityPlaylist);

  // DELETE /api/signage/:serviceKey/community/playlists/:id - Delete own community playlist
  router.delete('/community/playlists/:id', requireSignageCommunity, globalCtrl.deleteCommunityPlaylist);

  // WO-O4O-CONTENT-SNAPSHOT-UNIFICATION-V1: clone routes removed
  // Content copy is now handled via asset-snapshot-copy (assetSnapshotApi.copy)

  // ========== Category Routes (WO-O4O-SIGNAGE-CONTENT-CENTERED-REFACTOR-V1 Phase 4) ==========
  // GET /api/signage/:serviceKey/categories — list active categories (public read)
  router.get('/categories', allowSignageStoreRead, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceKey } = req.params;
      const rows = await dataSource.query(
        `SELECT id, name, "sortOrder" FROM signage_categories WHERE "serviceKey" = $1 AND "isActive" = true ORDER BY "sortOrder", name`,
        [serviceKey],
      );
      res.json({ data: rows });
    } catch (error) { next(error); }
  });

  // POST /api/signage/:serviceKey/categories — create category (operator only)
  router.post('/categories', requireSignageOperator, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceKey } = req.params;
      const { name, sortOrder = 0 } = req.body;
      if (!name?.trim()) { res.status(400).json({ error: 'name required' }); return; }
      const rows = await dataSource.query(
        `INSERT INTO signage_categories ("serviceKey", name, "sortOrder") VALUES ($1, $2, $3)
         ON CONFLICT ("serviceKey", name) DO UPDATE SET "sortOrder" = $3, "isActive" = true, "updatedAt" = NOW()
         RETURNING id, name, "sortOrder"`,
        [serviceKey, name.trim(), sortOrder],
      );
      res.status(201).json({ data: rows[0] });
    } catch (error) { next(error); }
  });

  // DELETE /api/signage/:serviceKey/categories/:id — deactivate category (operator only)
  router.delete('/categories/:id', requireSignageOperator, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceKey, id } = req.params;
      await dataSource.query(
        `UPDATE signage_categories SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1 AND "serviceKey" = $2`,
        [id, serviceKey],
      );
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  return router;
}
