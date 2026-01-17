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

  return router;
}
