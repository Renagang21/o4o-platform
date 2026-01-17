import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SignageController } from './controllers/signage.controller.js';

/**
 * Create Signage Routes
 *
 * Factory function that creates Express router with all Signage API endpoints.
 * Follows the existing route factory pattern used in other modules.
 *
 * Base path: /api/signage/:serviceKey
 */
export function createSignageRoutes(dataSource: DataSource): Router {
  const router = Router({ mergeParams: true });
  const controller = new SignageController(dataSource);

  // ========== Playlist Routes ==========
  // GET /api/signage/:serviceKey/playlists - List playlists
  router.get('/playlists', controller.getPlaylists);

  // POST /api/signage/:serviceKey/playlists - Create playlist
  router.post('/playlists', controller.createPlaylist);

  // GET /api/signage/:serviceKey/playlists/:id - Get playlist by ID
  router.get('/playlists/:id', controller.getPlaylist);

  // PATCH /api/signage/:serviceKey/playlists/:id - Update playlist
  router.patch('/playlists/:id', controller.updatePlaylist);

  // DELETE /api/signage/:serviceKey/playlists/:id - Delete playlist (soft delete)
  router.delete('/playlists/:id', controller.deletePlaylist);

  // ========== Playlist Item Routes ==========
  // GET /api/signage/:serviceKey/playlists/:playlistId/items - List playlist items
  router.get('/playlists/:playlistId/items', controller.getPlaylistItems);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items - Add item to playlist
  router.post('/playlists/:playlistId/items', controller.addPlaylistItem);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items/bulk - Bulk add items
  router.post('/playlists/:playlistId/items/bulk', controller.addPlaylistItemsBulk);

  // POST /api/signage/:serviceKey/playlists/:playlistId/items/reorder - Reorder items
  router.post('/playlists/:playlistId/items/reorder', controller.reorderPlaylistItems);

  // PATCH /api/signage/:serviceKey/playlists/:playlistId/items/:itemId - Update item
  router.patch('/playlists/:playlistId/items/:itemId', controller.updatePlaylistItem);

  // DELETE /api/signage/:serviceKey/playlists/:playlistId/items/:itemId - Delete item
  router.delete('/playlists/:playlistId/items/:itemId', controller.deletePlaylistItem);

  // ========== Media Routes ==========
  // GET /api/signage/:serviceKey/media - List media
  router.get('/media', controller.getMediaList);

  // POST /api/signage/:serviceKey/media - Create media
  router.post('/media', controller.createMedia);

  // GET /api/signage/:serviceKey/media/:id - Get media by ID
  router.get('/media/:id', controller.getMedia);

  // PATCH /api/signage/:serviceKey/media/:id - Update media
  router.patch('/media/:id', controller.updateMedia);

  // DELETE /api/signage/:serviceKey/media/:id - Delete media (soft delete)
  router.delete('/media/:id', controller.deleteMedia);

  // ========== Schedule Routes ==========
  // GET /api/signage/:serviceKey/schedules - List schedules
  router.get('/schedules', controller.getSchedules);

  // POST /api/signage/:serviceKey/schedules - Create schedule
  router.post('/schedules', controller.createSchedule);

  // GET /api/signage/:serviceKey/schedules/:id - Get schedule by ID
  router.get('/schedules/:id', controller.getSchedule);

  // PATCH /api/signage/:serviceKey/schedules/:id - Update schedule
  router.patch('/schedules/:id', controller.updateSchedule);

  // DELETE /api/signage/:serviceKey/schedules/:id - Delete schedule (soft delete)
  router.delete('/schedules/:id', controller.deleteSchedule);

  // ========== Active Content Resolution ==========
  // GET /api/signage/:serviceKey/active-content - Resolve active content for channel
  router.get('/active-content', controller.resolveActiveContent);

  // ========== Sprint 2-3: Template Routes ==========
  // GET /api/signage/:serviceKey/templates - List templates
  router.get('/templates', controller.getTemplates);

  // POST /api/signage/:serviceKey/templates - Create template
  router.post('/templates', controller.createTemplate);

  // GET /api/signage/:serviceKey/templates/:id - Get template by ID
  router.get('/templates/:id', controller.getTemplate);

  // PATCH /api/signage/:serviceKey/templates/:id - Update template
  router.patch('/templates/:id', controller.updateTemplate);

  // DELETE /api/signage/:serviceKey/templates/:id - Delete template (soft delete)
  router.delete('/templates/:id', controller.deleteTemplate);

  // POST /api/signage/:serviceKey/templates/preview - Generate template preview
  router.post('/templates/preview', controller.previewTemplate);

  // ========== Template Zone Routes ==========
  // GET /api/signage/:serviceKey/templates/:templateId/zones - List template zones
  router.get('/templates/:templateId/zones', controller.getTemplateZones);

  // POST /api/signage/:serviceKey/templates/:templateId/zones - Add zone to template
  router.post('/templates/:templateId/zones', controller.addTemplateZone);

  // PATCH /api/signage/:serviceKey/templates/:templateId/zones/:zoneId - Update zone
  router.patch('/templates/:templateId/zones/:zoneId', controller.updateTemplateZone);

  // DELETE /api/signage/:serviceKey/templates/:templateId/zones/:zoneId - Delete zone
  router.delete('/templates/:templateId/zones/:zoneId', controller.deleteTemplateZone);

  // ========== Content Block Routes ==========
  // GET /api/signage/:serviceKey/content-blocks - List content blocks
  router.get('/content-blocks', controller.getContentBlocks);

  // POST /api/signage/:serviceKey/content-blocks - Create content block
  router.post('/content-blocks', controller.createContentBlock);

  // GET /api/signage/:serviceKey/content-blocks/:id - Get content block by ID
  router.get('/content-blocks/:id', controller.getContentBlock);

  // PATCH /api/signage/:serviceKey/content-blocks/:id - Update content block
  router.patch('/content-blocks/:id', controller.updateContentBlock);

  // DELETE /api/signage/:serviceKey/content-blocks/:id - Delete content block (soft delete)
  router.delete('/content-blocks/:id', controller.deleteContentBlock);

  // ========== Layout Preset Routes ==========
  // GET /api/signage/:serviceKey/layout-presets - List layout presets
  router.get('/layout-presets', controller.getLayoutPresets);

  // POST /api/signage/:serviceKey/layout-presets - Create layout preset
  router.post('/layout-presets', controller.createLayoutPreset);

  // GET /api/signage/:serviceKey/layout-presets/:id - Get layout preset by ID
  router.get('/layout-presets/:id', controller.getLayoutPreset);

  // PATCH /api/signage/:serviceKey/layout-presets/:id - Update layout preset
  router.patch('/layout-presets/:id', controller.updateLayoutPreset);

  // DELETE /api/signage/:serviceKey/layout-presets/:id - Delete layout preset (soft delete)
  router.delete('/layout-presets/:id', controller.deleteLayoutPreset);

  // ========== Media Library Routes ==========
  // GET /api/signage/:serviceKey/media/library - Get media library (platform + org + supplier)
  router.get('/media/library', controller.getMediaLibrary);

  // ========== Schedule Calendar Routes ==========
  // GET /api/signage/:serviceKey/schedules/calendar - Get schedule calendar view
  router.get('/schedules/calendar', controller.getScheduleCalendar);

  // ========== Upload Routes ==========
  // POST /api/signage/:serviceKey/upload/presigned - Get presigned upload URL
  router.post('/upload/presigned', controller.getPresignedUploadUrl);

  // ========== AI Generation Routes ==========
  // POST /api/signage/:serviceKey/ai/generate - Generate content with AI
  router.post('/ai/generate', controller.generateWithAi);

  // ========== Sprint 2-6: Global Content Routes ==========

  // GET /api/signage/:serviceKey/global/playlists - List global playlists (HQ, Supplier, Community)
  router.get('/global/playlists', controller.getGlobalPlaylists);

  // GET /api/signage/:serviceKey/global/playlists/:source - List playlists by source
  router.get('/global/playlists/:source', controller.getGlobalPlaylistsBySource);

  // GET /api/signage/:serviceKey/global/media - List global media
  router.get('/global/media', controller.getGlobalMedia);

  // GET /api/signage/:serviceKey/global/media/:source - List media by source
  router.get('/global/media/:source', controller.getGlobalMediaBySource);

  // ========== HQ Content Management Routes ==========

  // POST /api/signage/:serviceKey/hq/playlists - Create HQ playlist (scope: global)
  router.post('/hq/playlists', controller.createHqPlaylist);

  // POST /api/signage/:serviceKey/hq/media - Create HQ media (scope: global)
  router.post('/hq/media', controller.createHqMedia);

  // PATCH /api/signage/:serviceKey/hq/playlists/:id - Update HQ playlist
  router.patch('/hq/playlists/:id', controller.updateHqPlaylist);

  // PATCH /api/signage/:serviceKey/hq/media/:id - Update HQ media
  router.patch('/hq/media/:id', controller.updateHqMedia);

  // ========== Clone Routes ==========

  // POST /api/signage/:serviceKey/playlists/:id/clone - Clone a playlist to store
  router.post('/playlists/:id/clone', controller.clonePlaylist);

  // POST /api/signage/:serviceKey/media/:id/clone - Clone media to store
  router.post('/media/:id/clone', controller.cloneMedia);

  return router;
}
